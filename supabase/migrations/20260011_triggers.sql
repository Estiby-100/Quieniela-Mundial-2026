-- Migration 011: Triggers
-- Note: handle_new_user trigger is in 004 (needs to be co-located with function).

-- ─────────────────────────────────────────────
-- T: Deny any UPDATE or DELETE on immutable tables
-- ─────────────────────────────────────────────
create or replace function trg_deny_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Table "%" is immutable — UPDATE and DELETE are not permitted.', TG_TABLE_NAME;
end;
$$;

create trigger trg_deny_mutation_ranking_history
  before update or delete on ranking_history
  for each row execute function trg_deny_mutation();

create trigger trg_deny_mutation_prediction_snapshots
  before update or delete on prediction_snapshots
  for each row execute function trg_deny_mutation();

create trigger trg_deny_mutation_audit_log
  before update or delete on audit_log
  for each row execute function trg_deny_mutation();

-- ─────────────────────────────────────────────
-- T: Enforce valid tournament_phase transitions
-- ─────────────────────────────────────────────
create or replace function trg_fn_phase_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tournament_phase = old.tournament_phase then
    return new; -- no change, always allowed
  end if;

  if not validate_phase_transition(old.tournament_phase, new.tournament_phase) then
    raise exception
      'Invalid phase transition: % → %. Phases must advance in order.',
      old.tournament_phase, new.tournament_phase;
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger trg_phase_transition
  before update of tournament_phase on app_config
  for each row execute function trg_fn_phase_transition();

-- ─────────────────────────────────────────────
-- T: Audit sensitive table changes
-- ─────────────────────────────────────────────
create or replace function trg_fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id text;
  v_old_data  jsonb;
  v_new_data  jsonb;
begin
  -- Generic PK extraction — works for single-column PKs
  case TG_TABLE_NAME
    when 'app_config'              then v_record_id := coalesce(new.id, old.id)::text;
    when 'official_group_results'  then v_record_id := coalesce(new.group_letter, old.group_letter);
    when 'official_best_thirds'    then v_record_id := coalesce(new.team_id, old.team_id)::text;
    when 'official_bracket_results' then v_record_id := coalesce(new.match_number, old.match_number)::text;
    when 'official_top_scorer'     then v_record_id := coalesce(new.id, old.id)::text;
    when 'profiles'                then v_record_id := coalesce(new.id, old.id)::text;
    else v_record_id := 'unknown';
  end case;

  if TG_OP = 'DELETE' then
    v_old_data := to_jsonb(old);
    v_new_data := null;
  elsif TG_OP = 'INSERT' then
    v_old_data := null;
    v_new_data := to_jsonb(new);
  else
    v_old_data := to_jsonb(old);
    v_new_data := to_jsonb(new);
  end if;

  perform log_audit_event(TG_OP, TG_TABLE_NAME, v_record_id, v_old_data, v_new_data);

  return coalesce(new, old);
end;
$$;

create trigger trg_audit_app_config
  after insert or update or delete on app_config
  for each row execute function trg_fn_audit_log();

create trigger trg_audit_official_group_results
  after insert or update or delete on official_group_results
  for each row execute function trg_fn_audit_log();

create trigger trg_audit_official_best_thirds
  after insert or update or delete on official_best_thirds
  for each row execute function trg_fn_audit_log();

create trigger trg_audit_official_bracket_results
  after insert or update or delete on official_bracket_results
  for each row execute function trg_fn_audit_log();

create trigger trg_audit_official_top_scorer
  after insert or update or delete on official_top_scorer
  for each row execute function trg_fn_audit_log();

create trigger trg_audit_profiles
  after update on profiles
  for each row execute function trg_fn_audit_log();

-- ─────────────────────────────────────────────
-- T: group_predictions — validate before insert/update
-- ─────────────────────────────────────────────
create or replace function trg_fn_validate_group_predictions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phase tournament_phase;
  v_count int;
begin
  select tournament_phase into v_phase from app_config where id = 1;

  if v_phase <> 'predictions_open' then
    raise exception 'Group predictions are locked. Current phase: %', v_phase;
  end if;

  -- Verify all 4 teams belong to the predicted group
  select count(*) into v_count
  from (values (new.position_1), (new.position_2), (new.position_3), (new.position_4)) as t(team_id)
  join teams on teams.id = t.team_id
  where teams.group_letter = new.group_letter;

  if v_count <> 4 then
    raise exception 'All 4 teams must belong to group %. Found % valid teams.', new.group_letter, v_count;
  end if;

  -- Cascade: if position_3 changed, remove that team from best_third_predictions
  if TG_OP = 'UPDATE' and old.position_3 <> new.position_3 then
    perform cascade_invalidate_best_thirds(new.user_id, old.position_3);
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_validate_group_predictions
  before insert or update on group_predictions
  for each row execute function trg_fn_validate_group_predictions();

-- ─────────────────────────────────────────────
-- T: best_third_predictions — validate before insert/update
-- ─────────────────────────────────────────────
create or replace function trg_fn_validate_best_third_predictions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phase   tournament_phase;
  v_count   int;
  v_is_p3   boolean;
begin
  select tournament_phase into v_phase from app_config where id = 1;

  if v_phase <> 'predictions_open' then
    raise exception 'Best third predictions are locked. Current phase: %', v_phase;
  end if;

  -- Team must appear in this user's group_predictions at position_3
  select exists(
    select 1 from group_predictions
    where user_id = new.user_id and position_3 = new.team_id
  ) into v_is_p3;

  if not v_is_p3 then
    raise exception 'Team % is not predicted as 3rd place in any group by this user.', new.team_id;
  end if;

  -- Max 8 selections per user (on INSERT only)
  if TG_OP = 'INSERT' then
    select count(*) into v_count
    from best_third_predictions
    where user_id = new.user_id;

    if v_count >= 8 then
      raise exception 'A user may select at most 8 best third-place teams. Already at %.', v_count;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_validate_best_third_predictions
  before insert or update on best_third_predictions
  for each row execute function trg_fn_validate_best_third_predictions();

-- ─────────────────────────────────────────────
-- T: bracket_predictions — lock after predictions_closed
-- ─────────────────────────────────────────────
create or replace function trg_fn_validate_bracket_predictions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phase tournament_phase;
begin
  select tournament_phase into v_phase from app_config where id = 1;

  if v_phase not in ('predictions_open', 'predictions_closed') then
    raise exception 'Bracket predictions are locked. Current phase: %', v_phase;
  end if;

  -- Note: bracket_predictions can be entered/updated during predictions_open.
  -- Once predictions_closed they become fully immutable.
  if v_phase = 'predictions_closed' then
    raise exception 'Predictions have been closed. No further changes allowed.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_validate_bracket_predictions
  before insert or update on bracket_predictions
  for each row execute function trg_fn_validate_bracket_predictions();

-- ─────────────────────────────────────────────
-- T: scorer_predictions — lock after predictions_open
-- ─────────────────────────────────────────────
create or replace function trg_fn_validate_scorer_predictions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phase tournament_phase;
begin
  select tournament_phase into v_phase from app_config where id = 1;

  if v_phase <> 'predictions_open' then
    raise exception 'Scorer predictions are locked. Current phase: %', v_phase;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_validate_scorer_predictions
  before insert or update on scorer_predictions
  for each row execute function trg_fn_validate_scorer_predictions();

-- ─────────────────────────────────────────────
-- T: official_best_thirds — max 8 rows, must be from position_3
-- ─────────────────────────────────────────────
create or replace function trg_fn_validate_official_best_thirds()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count    int;
  v_is_valid boolean;
begin
  -- Count check
  if TG_OP = 'INSERT' then
    select count(*) into v_count from official_best_thirds;
    if v_count >= 8 then
      raise exception 'official_best_thirds: cannot add more than 8 teams.';
    end if;
  end if;

  -- Must be position_3 in official group results
  select exists(
    select 1 from official_group_results where position_3 = new.team_id
  ) into v_is_valid;

  if not v_is_valid then
    raise exception 'Team % is not recorded as 3rd place in any group.', new.team_id;
  end if;

  return new;
end;
$$;

create trigger trg_validate_official_best_thirds
  before insert on official_best_thirds
  for each row execute function trg_fn_validate_official_best_thirds();

-- ─────────────────────────────────────────────
-- T: official_group_results — teams must belong to correct group
-- ─────────────────────────────────────────────
create or replace function trg_fn_validate_official_group_results()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from (values (new.position_1), (new.position_2), (new.position_3), (new.position_4)) as t(team_id)
  join teams on teams.id = t.team_id
  where teams.group_letter = new.group_letter;

  if v_count <> 4 then
    raise exception 'Official result: all 4 teams must belong to group %. Found % valid.', new.group_letter, v_count;
  end if;

  return new;
end;
$$;

create trigger trg_validate_official_group_results
  before insert or update on official_group_results
  for each row execute function trg_fn_validate_official_group_results();

-- ─────────────────────────────────────────────
-- T: official_results admin-only guard
-- ─────────────────────────────────────────────
create or replace function trg_fn_admin_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only administrators can modify %.', TG_TABLE_NAME;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_admin_only_official_group_results
  before insert or update or delete on official_group_results
  for each row execute function trg_fn_admin_only();

create trigger trg_admin_only_official_best_thirds
  before insert or update or delete on official_best_thirds
  for each row execute function trg_fn_admin_only();

create trigger trg_admin_only_official_bracket_results
  before insert or update or delete on official_bracket_results
  for each row execute function trg_fn_admin_only();

create trigger trg_admin_only_official_top_scorer
  before insert or update or delete on official_top_scorer
  for each row execute function trg_fn_admin_only();
