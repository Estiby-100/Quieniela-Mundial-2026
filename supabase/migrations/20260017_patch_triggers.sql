-- Patch 017: Trigger fixes for C3, H1, H3, H4

-- ─────────────────────────────────────────────────────────────────────────────
-- C3 FIX: Block DELETE on prediction tables after predictions_open phase ends
-- A single function handles all four prediction tables.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function trg_fn_lock_predictions_delete()
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
    raise exception
      'Cannot delete from % after predictions are closed. Current phase: %.',
      TG_TABLE_NAME, v_phase;
  end if;
  return old;
end;
$$;

create trigger trg_lock_delete_group_predictions
  before delete on group_predictions
  for each row execute function trg_fn_lock_predictions_delete();

create trigger trg_lock_delete_best_third_predictions
  before delete on best_third_predictions
  for each row execute function trg_fn_lock_predictions_delete();

create trigger trg_lock_delete_bracket_predictions
  before delete on bracket_predictions
  for each row execute function trg_fn_lock_predictions_delete();

create trigger trg_lock_delete_scorer_predictions
  before delete on scorer_predictions
  for each row execute function trg_fn_lock_predictions_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- H3 FIX: TOCTOU race condition in best_third count check
-- Uses a transaction-level advisory lock per user to serialize concurrent inserts.
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- H3 FIX: Advisory lock serializes concurrent inserts for the same user.
  -- Prevents TOCTOU race where two sessions both read count=7 and both insert.
  perform pg_advisory_xact_lock(hashtext('btp_' || new.user_id::text));

  if TG_OP = 'INSERT' then
    select count(*) into v_count
    from best_third_predictions
    where user_id = new.user_id;

    if v_count >= 8 then
      raise exception
        'A user may select at most 8 best third-place teams. User % already has %.',
        new.user_id, v_count;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- H4 FIX: Remove dead code from bracket prediction trigger.
-- The first check already makes the second unreachable. Simplified to one check.
-- ─────────────────────────────────────────────────────────────────────────────
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

  if v_phase <> 'predictions_open' then
    raise exception 'Bracket predictions are locked. Current phase: %', v_phase;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- H1 FIX: Auto-capture snapshots when phase transitions to predictions_closed.
-- Replaces the trg_fn_phase_transition function to add snapshot auto-trigger.
-- Snapshots are captured atomically within the same transaction as the phase change.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function trg_fn_phase_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tournament_phase = old.tournament_phase then
    return new;
  end if;

  if not validate_phase_transition(old.tournament_phase, new.tournament_phase) then
    raise exception
      'Invalid phase transition: % → %. Phases must advance in order.',
      old.tournament_phase, new.tournament_phase;
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();

  -- H1 FIX: Auto-capture snapshots when predictions close.
  -- Runs in the same transaction — if snapshot capture fails, phase change rolls back.
  if new.tournament_phase = 'predictions_closed' then
    perform capture_all_snapshots(
      array['groups','best_thirds','bracket_resolved','scorer','full']::snapshot_type[]
    );
  end if;

  return new;
end;
$$;
