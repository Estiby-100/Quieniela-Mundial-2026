-- Patch 016: Function fixes for C1, C2, C4, H2
-- C1: Group scoring CASE only awarded one position per group — fixed to additive per-position
-- C2: capture_all_snapshots accepted p_triggered_by param — now uses auth.uid() internally
-- C4: recalculate_standings had no authorization check — now requires admin
-- H2: resolve_bracket_slot always returned null for match_loser — fixed with full match state tracking

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop old capture_all_snapshots (signature change: removes p_triggered_by param)
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists capture_all_snapshots(uuid, snapshot_type[]);

-- ─────────────────────────────────────────────────────────────────────────────
-- resolve_bracket_slot (H2 FIX)
-- Changed: p_resolved_map values now jsonb objects {w, a, b} instead of bare integers.
-- match_winner reads the 'w' key; match_loser derives the non-winner participant.
-- ─────────────────────────────────────────────────────────────────────────────
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
  v_match_obj  jsonb;
  v_winner     smallint;
  v_slot_a     smallint;
  v_slot_b     smallint;
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
      -- Resolved map stores {w: winner_id, a: slot_a_id, b: slot_b_id}
      v_match_obj := p_resolved_map -> p_slot_ref;
      if v_match_obj is not null then
        v_team_id := (v_match_obj ->> 'w')::smallint;
      end if;

    when 'match_loser' then
      -- Derive loser: whichever slot participant is NOT the winner
      v_match_obj := p_resolved_map -> p_slot_ref;
      if v_match_obj is not null then
        v_winner := (v_match_obj ->> 'w')::smallint;
        v_slot_a := (v_match_obj ->> 'a')::smallint;
        v_slot_b := (v_match_obj ->> 'b')::smallint;
        if v_winner is not null and v_slot_a is not null and v_slot_b is not null then
          v_team_id := case when v_winner = v_slot_a then v_slot_b else v_slot_a end;
        end if;
      end if;

  end case;

  return v_team_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- resolve_user_bracket (H2 FIX)
-- Changed: v_resolved now stores {w, a, b} per match to enable match_loser lookups.
-- ─────────────────────────────────────────────────────────────────────────────
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
  -- Each entry: match_number::text → {w: winner_id, a: slot_a_id, b: slot_b_id}
  v_resolved    jsonb := '{}';
  v_winner      smallint;
begin
  -- Build groups_key from user's best_third_predictions
  select string_agg(t.group_letter, '' order by t.group_letter)
  into   v_groups_key
  from   best_third_predictions btp
  join   teams t on t.id = btp.team_id
  where  btp.user_id = p_user_id;

  -- Fall back to official if user hasn't chosen 8 thirds
  if length(coalesce(v_groups_key,'')) <> 8 then
    select string_agg(t.group_letter, '' order by t.group_letter)
    into   v_groups_key
    from   official_best_thirds obt
    join   teams t on t.id = obt.team_id;
  end if;

  -- Lookup matrix row
  if length(coalesce(v_groups_key,'')) = 8 then
    select * into v_matrix_row
    from   fifa_third_place_matrix
    where  groups_key = v_groups_key;
  end if;

  -- Iterate bracket_template in match order
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

    -- Determine winner for downstream match resolution
    select bp.winner_id into v_winner
    from   bracket_predictions bp
    where  bp.user_id = p_user_id
      and  bp.match_number = v_tmpl.match_number;

    if v_winner is null then
      select obr.winner_id into v_winner
      from   official_bracket_results obr
      where  obr.match_number = v_tmpl.match_number;
    end if;

    -- Store full match state {w, a, b} so match_loser can be derived later
    if v_winner is not null then
      v_resolved := v_resolved || jsonb_build_object(
        v_tmpl.match_number::text,
        jsonb_build_object('w', v_winner, 'a', v_slot_a, 'b', v_slot_b)
      );
    end if;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- recalculate_standings (C1 FIX + C4 FIX)
-- C1: Each group position evaluated independently with additive CASE expressions.
-- C4: Authorization check added — only admins can call this function.
-- H2: Added 'third_place' round scoring via 'third_place_correct' rule.
-- ─────────────────────────────────────────────────────────────────────────────
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
  v_uid              uuid;
  v_points_groups    smallint;
  v_points_thirds    smallint;
  v_points_bracket   smallint;
  v_points_scorer    smallint;

  r_group_exact      smallint;
  r_group_wrong_pos  smallint;
  r_third_correct    smallint;
  r_r32              smallint;
  r_r16              smallint;
  r_qf               smallint;
  r_sf               smallint;
  r_finalist         smallint;
  r_champion         smallint;
  r_third_place      smallint;
  r_scorer           smallint;
begin
  -- C4: Authorization check
  if not is_admin() then
    raise exception 'recalculate_standings: only administrators can trigger recalculations';
  end if;

  -- Load all scoring rules in one query
  select
    max(case when rule_key = 'group_exact_position'            then points end),
    max(case when rule_key = 'group_classified_wrong_position' then points end),
    max(case when rule_key = 'best_third_correct'              then points end),
    max(case when rule_key = 'r32_correct_winner'              then points end),
    max(case when rule_key = 'r16_correct_winner'              then points end),
    max(case when rule_key = 'qf_correct_winner'               then points end),
    max(case when rule_key = 'sf_correct_winner'               then points end),
    max(case when rule_key = 'finalist_correct'                then points end),
    max(case when rule_key = 'champion_correct'                then points end),
    max(case when rule_key = 'third_place_correct'             then points end),
    max(case when rule_key = 'top_scorer_correct'              then points end)
  into
    r_group_exact, r_group_wrong_pos, r_third_correct,
    r_r32, r_r16, r_qf, r_sf, r_finalist, r_champion, r_third_place, r_scorer
  from scoring_rules;

  -- Ensure rules loaded (defensive)
  r_group_exact     := coalesce(r_group_exact, 0);
  r_group_wrong_pos := coalesce(r_group_wrong_pos, 0);
  r_third_correct   := coalesce(r_third_correct, 0);
  r_r32             := coalesce(r_r32, 0);
  r_r16             := coalesce(r_r16, 0);
  r_qf              := coalesce(r_qf, 0);
  r_sf              := coalesce(r_sf, 0);
  r_finalist        := coalesce(r_finalist, 0);
  r_champion        := coalesce(r_champion, 0);
  r_third_place     := coalesce(r_third_place, 0);
  r_scorer          := coalesce(r_scorer, 0);

  -- Lock all standings rows to prevent concurrent recalculations
  perform user_id from standings for update;

  -- Recalculate per user
  for v_uid in select user_id from standings loop

    -- ── Groups (C1 FIX: additive per-position evaluation) ─────────────────
    if p_scope in ('full', 'groups') then
      select coalesce(sum(
        -- Position 1: exact +5, or team qualified 2nd (wrong pos) +3
        (case when gp.position_1 = ogr.position_1 then r_group_exact
              when gp.position_1 = ogr.position_2 then r_group_wrong_pos
              else 0 end) +
        -- Position 2: exact +5, or team qualified 1st (wrong pos) +3
        (case when gp.position_2 = ogr.position_2 then r_group_exact
              when gp.position_2 = ogr.position_1 then r_group_wrong_pos
              else 0 end) +
        -- Position 3: exact +5 only (these teams are eliminated, no qualified bonus)
        (case when gp.position_3 = ogr.position_3 then r_group_exact else 0 end) +
        -- Position 4: exact +5 only
        (case when gp.position_4 = ogr.position_4 then r_group_exact else 0 end)
      ), 0)
      into v_points_groups
      from group_predictions gp
      join official_group_results ogr using (group_letter)
      where gp.user_id = v_uid;
    end if;

    -- ── Best thirds ────────────────────────────────────────────────────────
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

    -- ── Bracket (H2: third_place round now scored) ─────────────────────────
    if p_scope in ('full', 'bracket') then
      with sf_winners as (
        select obr2.winner_id
        from   official_bracket_results obr2
        join   bracket_template bt2 on bt2.match_number = obr2.match_number
        where  bt2.round = 'sf'
      )
      select coalesce(sum(
        case bt.round
          when 'r32'         then case when bp.winner_id = obr.winner_id then r_r32         else 0 end
          when 'r16'         then case when bp.winner_id = obr.winner_id then r_r16         else 0 end
          when 'qf'          then case when bp.winner_id = obr.winner_id then r_qf          else 0 end
          when 'sf'          then case when bp.winner_id = obr.winner_id then r_sf          else 0 end
          when 'third_place' then case when bp.winner_id = obr.winner_id then r_third_place else 0 end
          when 'final'       then
            case
              when bp.winner_id = obr.winner_id            then r_champion
              when bp.winner_id in (select winner_id from sf_winners) then r_finalist
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

    -- ── Scorer ─────────────────────────────────────────────────────────────
    if p_scope in ('full', 'scorer') then
      select coalesce(
        case when sp.player_normalized = ots.player_normalized
              and sp.team_id           = ots.team_id
          then r_scorer else 0 end,
        0
      )
      into v_points_scorer
      from       scorer_predictions sp
      cross join official_top_scorer ots
      where sp.user_id = v_uid;

      v_points_scorer := coalesce(v_points_scorer, 0);
    end if;

    -- Update standings
    update standings set
      points_groups  = case when p_scope in ('full','groups')  then coalesce(v_points_groups,  points_groups)  else points_groups  end,
      points_thirds  = case when p_scope in ('full','thirds')  then coalesce(v_points_thirds,  points_thirds)  else points_thirds  end,
      points_bracket = case when p_scope in ('full','bracket') then coalesce(v_points_bracket, points_bracket) else points_bracket end,
      points_scorer  = case when p_scope in ('full','scorer')  then coalesce(v_points_scorer,  points_scorer)  else points_scorer  end,
      last_recalculated_at = now()
    where user_id = v_uid;

    -- Reset for next iteration
    v_points_groups  := null;
    v_points_thirds  := null;
    v_points_bracket := null;
    v_points_scorer  := null;
  end loop;

  -- Snapshot positions
  insert into ranking_history (
    recalculation_id, user_id, position,
    total_points, points_groups, points_thirds, points_bracket, points_scorer
  )
  select
    p_recalculation_id,
    s.user_id,
    rank() over (order by s.total_points desc)::smallint,
    s.total_points, s.points_groups, s.points_thirds, s.points_bracket, s.points_scorer
  from standings s;

  perform log_audit_event(
    'RECALCULATE_STANDINGS', 'standings',
    p_recalculation_id::text,
    jsonb_build_object('scope', p_scope), null
  );

  return p_recalculation_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- capture_all_snapshots (C2 FIX)
-- Removed p_triggered_by parameter. Caller identity taken from auth.uid().
-- Added explicit check that auth.uid() matches an admin profile.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function capture_all_snapshots(
  p_snapshot_types snapshot_type[] default array['groups','best_thirds','bracket_resolved','scorer','full']::snapshot_type[]
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller       uuid;
  v_uid          uuid;
  v_phase        tournament_phase;
  v_count        int := 0;
  v_payload      jsonb;
  v_full_payload jsonb;
  v_bracket_row  record;
  v_bracket_json jsonb;
  v_resolved     record;
begin
  -- C2 FIX: derive caller identity from session, never from parameters
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'capture_all_snapshots: must be called from an authenticated session';
  end if;
  if not (select is_admin from profiles where id = v_caller) then
    raise exception 'capture_all_snapshots: caller % is not an administrator', v_caller;
  end if;

  select tournament_phase into v_phase from app_config where id = 1;

  for v_uid in select user_id from standings loop

    v_full_payload := '{}';

    -- groups snapshot
    if 'groups' = any(p_snapshot_types) then
      select jsonb_object_agg(
        group_letter,
        jsonb_build_object('position_1', position_1, 'position_2', position_2,
                           'position_3', position_3, 'position_4', position_4)
      )
      into v_payload
      from group_predictions
      where user_id = v_uid;

      v_payload := coalesce(v_payload, '{}');

      insert into prediction_snapshots
        (user_id, snapshot_type, payload, triggered_by, tournament_phase_at_capture)
      values
        (v_uid, 'groups',
         jsonb_build_object('captured_phase', v_phase, 'groups', v_payload),
         v_caller, v_phase);
      v_count := v_count + 1;
      v_full_payload := v_full_payload || jsonb_build_object('groups', v_payload);
    end if;

    -- best_thirds snapshot
    if 'best_thirds' = any(p_snapshot_types) then
      select jsonb_agg(team_id order by team_id)
      into v_payload
      from best_third_predictions
      where user_id = v_uid;

      v_payload := coalesce(v_payload, '[]');

      insert into prediction_snapshots
        (user_id, snapshot_type, payload, triggered_by, tournament_phase_at_capture)
      values
        (v_uid, 'best_thirds',
         jsonb_build_object('captured_phase', v_phase, 'best_thirds', v_payload),
         v_caller, v_phase);
      v_count := v_count + 1;
      v_full_payload := v_full_payload || jsonb_build_object('best_thirds', v_payload);
    end if;

    -- bracket_resolved snapshot (H2 FIX: match_loser now resolves correctly)
    if 'bracket_resolved' = any(p_snapshot_types) then
      v_bracket_json := '{}';

      for v_resolved in
        select * from resolve_user_bracket(v_uid)
      loop
        v_bracket_json := v_bracket_json || jsonb_build_object(
          v_resolved.match_number::text,
          jsonb_build_object('slot_a', v_resolved.slot_a_team_id, 'slot_b', v_resolved.slot_b_team_id)
        );
      end loop;

      -- Overlay predicted winners
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
         v_caller, v_phase);
      v_count := v_count + 1;
      v_full_payload := v_full_payload || jsonb_build_object('bracket_resolved', v_bracket_json);
    end if;

    -- scorer snapshot
    if 'scorer' = any(p_snapshot_types) then
      select jsonb_build_object('player_name', player_name, 'team_id', team_id)
      into v_payload
      from scorer_predictions
      where user_id = v_uid;

      v_payload := coalesce(v_payload, 'null'::jsonb);

      insert into prediction_snapshots
        (user_id, snapshot_type, payload, triggered_by, tournament_phase_at_capture)
      values
        (v_uid, 'scorer',
         jsonb_build_object('captured_phase', v_phase, 'scorer', v_payload),
         v_caller, v_phase);
      v_count := v_count + 1;
      v_full_payload := v_full_payload || jsonb_build_object('scorer', v_payload);
    end if;

    -- full composite snapshot
    if 'full' = any(p_snapshot_types) then
      insert into prediction_snapshots
        (user_id, snapshot_type, payload, triggered_by, tournament_phase_at_capture)
      values
        (v_uid, 'full',
         jsonb_build_object('captured_phase', v_phase) || v_full_payload,
         v_caller, v_phase);
      v_count := v_count + 1;
    end if;

  end loop;

  perform log_audit_event(
    'SNAPSHOT_CAPTURED', 'prediction_snapshots', v_caller::text,
    jsonb_build_object('phase', v_phase, 'types', p_snapshot_types, 'rows_created', v_count),
    null
  );

  return v_count;
end;
$$;
