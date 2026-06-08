-- Migration 010: PostgreSQL functions
-- All security-sensitive functions use SECURITY DEFINER + explicit search_path.

-- ─────────────────────────────────────────────
-- Helper: check if current user is admin
-- Called inline from RLS policies to avoid recursion.
-- ─────────────────────────────────────────────
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- ─────────────────────────────────────────────
-- Helper: validate tournament phase transitions
-- ─────────────────────────────────────────────
create or replace function validate_phase_transition(
  current_phase tournament_phase,
  new_phase     tournament_phase
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select (current_phase, new_phase) in (
    ('setup',              'predictions_open'),
    ('predictions_open',   'predictions_closed'),
    ('predictions_closed', 'group_stage'),
    ('group_stage',        'round_of_32'),
    ('round_of_32',        'round_of_16'),
    ('round_of_16',        'quarter_finals'),
    ('quarter_finals',     'semi_finals'),
    ('semi_finals',        'final'),
    ('final',              'completed')
  );
$$;

-- ─────────────────────────────────────────────
-- Helper: current tournament phase (avoids repeated subqueries)
-- ─────────────────────────────────────────────
create or replace function current_phase()
returns tournament_phase
language sql
security definer
stable
set search_path = public
as $$
  select tournament_phase from app_config where id = 1;
$$;

-- ─────────────────────────────────────────────
-- Audit logging — only callable from triggers and SECURITY DEFINER functions
-- ─────────────────────────────────────────────
create or replace function log_audit_event(
  p_action     text,
  p_table_name text,
  p_record_id  text,
  p_old_data   jsonb default null,
  p_new_data   jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data
  );
end;
$$;

-- ─────────────────────────────────────────────
-- Cascade invalidation when group position_3 changes
-- ─────────────────────────────────────────────
create or replace function cascade_invalidate_best_thirds(
  p_user_id    uuid,
  p_old_team_id smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from best_third_predictions
  where user_id = p_user_id
    and team_id = p_old_team_id;

  if found then
    perform log_audit_event(
      'CASCADE_REMOVE_BEST_THIRD',
      'best_third_predictions',
      p_user_id::text,
      jsonb_build_object('user_id', p_user_id, 'team_id', p_old_team_id),
      null
    );
  end if;
end;
$$;

-- ─────────────────────────────────────────────
-- resolve_user_bracket
-- ─────────────────────────────────────────────
create or replace function resolve_user_bracket(p_user_id uuid)
returns table (
  match_number   smallint,
  slot_a_team_id smallint,
  slot_b_team_id smallint
)
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_groups_key  text := '';
  v_matrix_row  fifa_third_place_matrix%rowtype;
  v_tmpl        bracket_template%rowtype;
  v_slot_a      smallint;
  v_slot_b      smallint;
  v_resolved    jsonb := '{}';
begin
  select string_agg(t.group_letter, '' order by t.group_letter)
  into   v_groups_key
  from   best_third_predictions btp
  join   teams t on t.id = btp.team_id
  where  btp.user_id = p_user_id;

  if length(coalesce(v_groups_key,'')) <> 8 then
    select string_agg(t.group_letter, '' order by t.group_letter)
    into   v_groups_key
    from   official_best_thirds obt
    join   teams t on t.id = obt.team_id;
  end if;

  if length(coalesce(v_groups_key,'')) = 8 then
    select * into v_matrix_row
    from   fifa_third_place_matrix
    where  groups_key = v_groups_key;
  end if;

  for v_tmpl in
    select * from bracket_template order by match_number
  loop
    v_slot_a := resolve_bracket_slot(
      v_tmpl.slot_a_type, v_tmpl.slot_a_ref,
      p_user_id, v_matrix_row, v_resolved
    );
    v_slot_b := resolve_bracket_slot(
      v_tmpl.slot_b_type, v_tmpl.slot_b_ref,
      p_user_id, v_matrix_row, v_resolved
    );

    match_number   := v_tmpl.match_number;
    slot_a_team_id := v_slot_a;
    slot_b_team_id := v_slot_b;
    return next;

    declare
      v_winner smallint;
    begin
      select bp.winner_id into v_winner
      from   bracket_predictions bp
      where  bp.user_id = p_user_id
        and  bp.match_number = v_tmpl.match_number;

      if v_winner is null then
        select obr.winner_id into v_winner
        from   official_bracket_results obr
        where  obr.match_number = v_tmpl.match_number;
      end if;

      if v_winner is not null then
        v_resolved := v_resolved || jsonb_build_object(v_tmpl.match_number::text, v_winner);
      end if;
    end;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────
-- Slot resolver helper
-- ─────────────────────────────────────────────
create or replace function resolve_bracket_slot(
  p_slot_type    slot_type,
  p_slot_ref     text,
  p_user_id      uuid,
  p_matrix_row   fifa_third_place_matrix,
  p_resolved_map jsonb
)
returns smallint
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_group      char(1);
  v_team_id    smallint;
  v_third_grp  char(1);
begin
  case p_slot_type

    when 'group_winner' then
      v_group := p_slot_ref::char(1);
      select position_1 into v_team_id
      from   group_predictions
      where  user_id = p_user_id and group_letter = v_group;
      if v_team_id is null then
        select position_1 into v_team_id
        from   official_group_results where group_letter = v_group;
      end if;

    when 'group_runner_up' then
      v_group := p_slot_ref::char(1);
      select position_2 into v_team_id
      from   group_predictions
      where  user_id = p_user_id and group_letter = v_group;
      if v_team_id is null then
        select position_2 into v_team_id
        from   official_group_results where group_letter = v_group;
      end if;

    when 'best_third' then
      v_group := p_slot_ref::char(1);
      v_third_grp := case v_group
        when 'A' then p_matrix_row.winner_a_faces
        when 'B' then p_matrix_row.winner_b_faces
        when 'D' then p_matrix_row.winner_d_faces
        when 'E' then p_matrix_row.winner_e_faces
        when 'G' then p_matrix_row.winner_g_faces
        when 'I' then p_matrix_row.winner_i_faces
        when 'K' then p_matrix_row.winner_k_faces
        when 'L' then p_matrix_row.winner_l_faces
        else null
      end;
      if v_third_grp is not null then
        select position_3 into v_team_id
        from   group_predictions
        where  user_id = p_user_id and group_letter = v_third_grp;
        if v_team_id is null then
          select position_3 into v_team_id
          from   official_group_results where group_letter = v_third_grp;
        end if;
      end if;

    when 'match_winner' then
      v_team_id := (p_resolved_map ->> p_slot_ref)::smallint;

    when 'match_loser' then
      v_team_id := null;

  end case;

  return v_team_id;
end;
$$;

-- ─────────────────────────────────────────────
-- recalculate_standings
-- ─────────────────────────────────────────────
create or replace function recalculate_standings(
  p_scope            text default 'full',
  p_recalculation_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points_groups    smallint;
  v_points_thirds    smallint;
  v_points_bracket   smallint;
  v_points_scorer    smallint;
  v_uid              uuid;

  r_group_exact      smallint;
  r_group_wrong_pos  smallint;
  r_third_correct    smallint;
  r_r32              smallint;
  r_r16              smallint;
  r_qf               smallint;
  r_sf               smallint;
  r_finalist         smallint;
  r_champion         smallint;
  r_scorer           smallint;
begin
  select points into r_group_exact     from scoring_rules where rule_key = 'group_exact_position';
  select points into r_group_wrong_pos from scoring_rules where rule_key = 'group_classified_wrong_position';
  select points into r_third_correct   from scoring_rules where rule_key = 'best_third_correct';
  select points into r_r32             from scoring_rules where rule_key = 'r32_correct_winner';
  select points into r_r16             from scoring_rules where rule_key = 'r16_correct_winner';
  select points into r_qf              from scoring_rules where rule_key = 'qf_correct_winner';
  select points into r_sf              from scoring_rules where rule_key = 'sf_correct_winner';
  select points into r_finalist        from scoring_rules where rule_key = 'finalist_correct';
  select points into r_champion        from scoring_rules where rule_key = 'champion_correct';
  select points into r_scorer          from scoring_rules where rule_key = 'top_scorer_correct';

  perform id from standings for update;

  for v_uid in select user_id from standings loop

    if p_scope in ('full', 'groups') then
      select coalesce(sum(
        case
          when (gp.position_1 = ogr.position_1) then r_group_exact
          when (gp.position_2 = ogr.position_2) then r_group_exact
          when (gp.position_3 = ogr.position_3) then r_group_exact
          when (gp.position_4 = ogr.position_4) then r_group_exact
          when (gp.position_1 in (ogr.position_1, ogr.position_2)
                and ogr.position_1 <> gp.position_1) then r_group_wrong_pos
          when (gp.position_2 in (ogr.position_1, ogr.position_2)
                and ogr.position_2 <> gp.position_2) then r_group_wrong_pos
          else 0
        end
      ), 0)
      into v_points_groups
      from group_predictions gp
      join official_group_results ogr using (group_letter)
      where gp.user_id = v_uid;
    end if;

    if p_scope in ('full', 'thirds') then
      select coalesce(
        count(*) filter (
          where btp.team_id in (select team_id from official_best_thirds)
        ) * r_third_correct,
        0
      )
      into v_points_thirds
      from best_third_predictions btp
      where btp.user_id = v_uid;
    end if;

    if p_scope in ('full', 'bracket') then
      select coalesce(sum(
        case bt.round
          when 'r32'         then case when bp.winner_id = obr.winner_id then r_r32       else 0 end
          when 'r16'         then case when bp.winner_id = obr.winner_id then r_r16       else 0 end
          when 'qf'          then case when bp.winner_id = obr.winner_id then r_qf        else 0 end
          when 'sf'          then case when bp.winner_id = obr.winner_id then r_sf        else 0 end
          when 'final'       then
            case
              when bp.winner_id = obr.winner_id then r_champion
              when bp.winner_id in (
                select obr2.winner_id
                from   official_bracket_results obr2
                join   bracket_template bt2 on bt2.match_number = obr2.match_number
                where  bt2.round = 'sf'
              ) then r_finalist
              else 0
            end
          else 0
        end
      ), 0)
      into v_points_bracket
      from bracket_predictions bp
      join bracket_template bt           on bt.match_number  = bp.match_number
      join official_bracket_results obr  on obr.match_number = bp.match_number
      where bp.user_id = v_uid;
    end if;

    if p_scope in ('full', 'scorer') then
      select coalesce(
        case when sp.player_normalized = ots.player_normalized
              and sp.team_id           = ots.team_id
          then r_scorer
          else 0
        end,
        0
      )
      into v_points_scorer
      from       scorer_predictions sp
      cross join official_top_scorer ots
      where sp.user_id = v_uid;

      v_points_scorer := coalesce(v_points_scorer, 0);
    end if;

    update standings set
      points_groups  = case when p_scope in ('full','groups')  then coalesce(v_points_groups,  points_groups)  else points_groups  end,
      points_thirds  = case when p_scope in ('full','thirds')  then coalesce(v_points_thirds,  points_thirds)  else points_thirds  end,
      points_bracket = case when p_scope in ('full','bracket') then coalesce(v_points_bracket, points_bracket) else points_bracket end,
      points_scorer  = case when p_scope in ('full','scorer')  then coalesce(v_points_scorer,  points_scorer)  else points_scorer  end,
      last_recalculated_at = now()
    where user_id = v_uid;

    v_points_groups  := null;
    v_points_thirds  := null;
    v_points_bracket := null;
    v_points_scorer  := null;
  end loop;

  insert into ranking_history (
    recalculation_id, user_id, position,
    total_points, points_groups, points_thirds, points_bracket, points_scorer
  )
  select
    p_recalculation_id,
    s.user_id,
    rank() over (order by s.total_points desc)::smallint,
    s.total_points,
    s.points_groups,
    s.points_thirds,
    s.points_bracket,
    s.points_scorer
  from standings s;

  perform log_audit_event(
    'RECALCULATE_STANDINGS',
    'standings',
    p_recalculation_id::text,
    jsonb_build_object('scope', p_scope),
    null
  );

  return p_recalculation_id;
end;
$$;

-- ─────────────────────────────────────────────
-- capture_all_snapshots
-- ─────────────────────────────────────────────
create or replace function capture_all_snapshots(
  p_triggered_by uuid,
  p_snapshot_types snapshot_type[] default array['groups','best_thirds','bracket_resolved','scorer','full']::snapshot_type[]
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid;
  v_phase        tournament_phase;
  v_count        int := 0;
  v_payload      jsonb;
  v_full_payload jsonb;
  v_bracket_row  record;
  v_bracket_json jsonb;
  v_resolved     record;
begin
  if not (select is_admin from profiles where id = p_triggered_by) then
    raise exception 'capture_all_snapshots: caller is not an admin';
  end if;

  select tournament_phase into v_phase from app_config where id = 1;

  for v_uid in select user_id from standings loop

    v_full_payload := '{}';

    if 'groups' = any(p_snapshot_types) then
      select jsonb_object_agg(
        group_letter,
        jsonb_build_object(
          'position_1', position_1,
          'position_2', position_2,
          'position_3', position_3,
          'position_4', position_4
        )
      )
      into v_payload
      from group_predictions
      where user_id = v_uid;

      v_payload := coalesce(v_payload, '{}');

      insert into prediction_snapshots
        (user_id, snapshot_type, payload, triggered_by, tournament_phase_at_capture)
      values
        (v_uid, 'groups', jsonb_build_object('captured_phase', v_phase, 'groups', v_payload),
         p_triggered_by, v_phase);
      v_count := v_count + 1;
      v_full_payload := v_full_payload || jsonb_build_object('groups', v_payload);
    end if;

    if 'best_thirds' = any(p_snapshot_types) then
      select jsonb_agg(team_id order by team_id)
      into v_payload
      from best_third_predictions
      where user_id = v_uid;

      v_payload := coalesce(v_payload, '[]');

      insert into prediction_snapshots
        (user_id, snapshot_type, payload, triggered_by, tournament_phase_at_capture)
      values
        (v_uid, 'best_thirds', jsonb_build_object('captured_phase', v_phase, 'best_thirds', v_payload),
         p_triggered_by, v_phase);
      v_count := v_count + 1;
      v_full_payload := v_full_payload || jsonb_build_object('best_thirds', v_payload);
    end if;

    if 'bracket_resolved' = any(p_snapshot_types) then
      v_bracket_json := '{}';

      for v_resolved in
        select * from resolve_user_bracket(v_uid)
      loop
        v_bracket_json := v_bracket_json || jsonb_build_object(
          v_resolved.match_number::text,
          jsonb_build_object(
            'slot_a', v_resolved.slot_a_team_id,
            'slot_b', v_resolved.slot_b_team_id
          )
        );
      end loop;

      for v_bracket_row in
        select bp.match_number, bp.winner_id
        from   bracket_predictions bp
        where  bp.user_id = v_uid
      loop
        v_bracket_json := jsonb_set(
          v_bracket_json,
          array[v_bracket_row.match_number::text, 'predicted_winner'],
          to_jsonb(v_bracket_row.winner_id)
        );
      end loop;

      insert into prediction_snapshots
        (user_id, snapshot_type, payload, triggered_by, tournament_phase_at_capture)
      values
        (v_uid, 'bracket_resolved',
         jsonb_build_object('captured_phase', v_phase, 'matches', v_bracket_json),
         p_triggered_by, v_phase);
      v_count := v_count + 1;
      v_full_payload := v_full_payload || jsonb_build_object('bracket_resolved', v_bracket_json);
    end if;

    if 'scorer' = any(p_snapshot_types) then
      select jsonb_build_object('player_name', player_name, 'team_id', team_id)
      into v_payload
      from scorer_predictions
      where user_id = v_uid;

      v_payload := coalesce(v_payload, 'null');

      insert into prediction_snapshots
        (user_id, snapshot_type, payload, triggered_by, tournament_phase_at_capture)
      values
        (v_uid, 'scorer', jsonb_build_object('captured_phase', v_phase, 'scorer', v_payload),
         p_triggered_by, v_phase);
      v_count := v_count + 1;
      v_full_payload := v_full_payload || jsonb_build_object('scorer', v_payload);
    end if;

    if 'full' = any(p_snapshot_types) then
      insert into prediction_snapshots
        (user_id, snapshot_type, payload, triggered_by, tournament_phase_at_capture)
      values
        (v_uid, 'full',
         jsonb_build_object('captured_phase', v_phase) || v_full_payload,
         p_triggered_by, v_phase);
      v_count := v_count + 1;
    end if;

  end loop;

  perform log_audit_event(
    'SNAPSHOT_CAPTURED',
    'prediction_snapshots',
    p_triggered_by::text,
    jsonb_build_object('phase', v_phase, 'types', p_snapshot_types, 'rows_created', v_count),
    null
  );

  return v_count;
end;
$$;

-- ─────────────────────────────────────────────
-- get_leaderboard
-- Returns current ranking with rank_position and delta vs previous recalculation.
-- ─────────────────────────────────────────────
create or replace function get_leaderboard()
returns table (
  rank_position  bigint,
  user_id        uuid,
  full_name      varchar,
  total_points   smallint,
  points_groups  smallint,
  points_thirds  smallint,
  points_bracket smallint,
  points_scorer  smallint,
  position_delta int
)
language sql
security invoker
stable
set search_path = public
as $$
  with ranked as (
    select
      rank() over (order by s.total_points desc) as rank_position,
      s.user_id,
      p.full_name,
      s.total_points,
      s.points_groups,
      s.points_thirds,
      s.points_bracket,
      s.points_scorer
    from standings s
    join profiles p on p.id = s.user_id
  ),
  prev_recalc as (
    select recalculation_id
    from   ranking_history
    group  by recalculation_id
    order  by max(recorded_at) desc
    offset 1
    limit  1
  ),
  prev_positions as (
    select rh.user_id, rh.position as prev_position
    from   ranking_history rh
    join   prev_recalc pr on pr.recalculation_id = rh.recalculation_id
  )
  select
    r.rank_position,
    r.user_id,
    r.full_name,
    r.total_points,
    r.points_groups,
    r.points_thirds,
    r.points_bracket,
    r.points_scorer,
    (pp.prev_position - r.rank_position)::int as position_delta
  from ranked r
  left join prev_positions pp on pp.user_id = r.user_id
  order by r.rank_position, r.full_name;
$$;