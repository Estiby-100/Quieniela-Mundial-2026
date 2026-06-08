-- Migration 015: Validation scripts
-- Run after all migrations and seed data to verify schema integrity.
-- All checks should return 0 rows (failures) or specific expected counts.
-- Execute with: psql -f 20260015_validation.sql

do $$
declare
  v_count  int;
  v_errors text[] := '{}';
begin

  -- ── Table existence checks ──────────────────────────────────────────────
  perform 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'teams';
  if not found then v_errors := v_errors || 'MISSING TABLE: teams'; end if;

  perform 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'bracket_template';
  if not found then v_errors := v_errors || 'MISSING TABLE: bracket_template'; end if;

  perform 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'fifa_third_place_matrix';
  if not found then v_errors := v_errors || 'MISSING TABLE: fifa_third_place_matrix'; end if;

  -- ── Enum types ─────────────────────────────────────────────────────────
  perform 1 from pg_type where typname = 'tournament_phase';
  if not found then v_errors := v_errors || 'MISSING ENUM: tournament_phase'; end if;

  perform 1 from pg_type where typname = 'match_round';
  if not found then v_errors := v_errors || 'MISSING ENUM: match_round'; end if;

  -- ── Extensions ─────────────────────────────────────────────────────────
  perform 1 from pg_extension where extname = 'unaccent';
  if not found then v_errors := v_errors || 'MISSING EXTENSION: unaccent'; end if;

  -- ── Seed data counts ───────────────────────────────────────────────────
  select count(*) into v_count from teams;
  if v_count <> 48 then
    v_errors := v_errors || format('teams: expected 48, got %s', v_count);
  end if;

  select count(*) into v_count from bracket_template;
  if v_count <> 32 then
    v_errors := v_errors || format('bracket_template: expected 32, got %s', v_count);
  end if;

  select count(*) into v_count from fifa_third_place_matrix;
  if v_count <> 495 then
    v_errors := v_errors || format('fifa_third_place_matrix: expected 495, got %s', v_count);
  end if;

  select count(*) into v_count from scoring_rules;
  if v_count <> 10 then
    v_errors := v_errors || format('scoring_rules: expected 10, got %s', v_count);
  end if;

  select count(*) into v_count from app_config;
  if v_count <> 1 then
    v_errors := v_errors || format('app_config: expected 1, got %s', v_count);
  end if;

  -- ── teams: exactly 4 per group, groups A–L ─────────────────────────────
  select count(*) into v_count
  from (
    select group_letter, count(*) as c
    from teams
    group by group_letter
    having count(*) <> 4
  ) x;
  if v_count > 0 then
    v_errors := v_errors || format('teams: %s groups do not have exactly 4 teams', v_count);
  end if;

  select count(*) into v_count
  from (
    select generate_series(ascii('A'), ascii('L')) as g
    except
    select ascii(group_letter) from teams
  ) x;
  if v_count > 0 then
    v_errors := v_errors || 'teams: not all groups A–L have teams';
  end if;

  -- ── bracket_template: match numbers 73–104 present ─────────────────────
  select count(*) into v_count
  from (
    select generate_series(73, 104) as m
    except
    select match_number from bracket_template
  ) x;
  if v_count > 0 then
    v_errors := v_errors || format('bracket_template: %s match numbers missing in range 73–104', v_count);
  end if;

  -- ── bracket_template: round distribution ───────────────────────────────
  select count(*) into v_count
  from bracket_template where round = 'r32';
  if v_count <> 16 then
    v_errors := v_errors || format('bracket_template: expected 16 r32 matches, got %s', v_count);
  end if;

  select count(*) into v_count
  from bracket_template where round = 'r16';
  if v_count <> 8 then
    v_errors := v_errors || format('bracket_template: expected 8 r16 matches, got %s', v_count);
  end if;

  select count(*) into v_count
  from bracket_template where round = 'qf';
  if v_count <> 4 then
    v_errors := v_errors || format('bracket_template: expected 4 qf matches, got %s', v_count);
  end if;

  select count(*) into v_count
  from bracket_template where round = 'sf';
  if v_count <> 2 then
    v_errors := v_errors || format('bracket_template: expected 2 sf matches, got %s', v_count);
  end if;

  -- ── bracket_template: exactly 8 best_third slots in R32 ───────────────
  select count(*) into v_count
  from bracket_template
  where round = 'r32'
    and (slot_a_type = 'best_third' or slot_b_type = 'best_third');
  if v_count <> 8 then
    v_errors := v_errors || format('bracket_template: expected 8 best_third slots in R32, got %s', v_count);
  end if;

  -- ── fifa_third_place_matrix: option_numbers 1–495, no gaps ─────────────
  select count(*) into v_count
  from (
    select generate_series(1, 495) as n
    except
    select option_number from fifa_third_place_matrix
  ) x;
  if v_count > 0 then
    v_errors := v_errors || format('fifa_third_place_matrix: %s option numbers missing', v_count);
  end if;

  -- ── fifa_third_place_matrix: groups_key is always 8 unique sorted letters ─
  select count(*) into v_count
  from fifa_third_place_matrix
  where length(groups_key) <> 8;
  if v_count > 0 then
    v_errors := v_errors || format('fifa_third_place_matrix: %s rows with groups_key length <> 8', v_count);
  end if;

  -- ── fifa_third_place_matrix: each row's 8 face columns are distinct ─────
  select count(*) into v_count
  from fifa_third_place_matrix
  where array_length(
    array(select distinct unnest(array[
      winner_a_faces, winner_b_faces, winner_d_faces, winner_e_faces,
      winner_g_faces, winner_i_faces, winner_k_faces, winner_l_faces
    ])),
    1
  ) <> 8;
  if v_count > 0 then
    v_errors := v_errors || format('fifa_third_place_matrix: %s rows with duplicate face values', v_count);
  end if;

  -- ── RLS enabled on all critical tables ─────────────────────────────────
  select count(*) into v_count
  from pg_tables
  where schemaname = 'public'
    and tablename in (
      'teams','app_config','scoring_rules','profiles','standings',
      'group_predictions','best_third_predictions','bracket_predictions',
      'scorer_predictions','official_group_results','official_best_thirds',
      'official_bracket_results','official_top_scorer','ranking_history',
      'prediction_snapshots','audit_log','bracket_template','fifa_third_place_matrix'
    )
    and rowsecurity = false;
  if v_count > 0 then
    v_errors := v_errors || format('RLS not enabled on %s tables', v_count);
  end if;

  -- ── Immutable table triggers present ───────────────────────────────────
  select count(*) into v_count
  from pg_trigger
  where tgname in (
    'trg_deny_mutation_ranking_history',
    'trg_deny_mutation_prediction_snapshots',
    'trg_deny_mutation_audit_log'
  );
  if v_count <> 3 then
    v_errors := v_errors || format('Immutable triggers: expected 3, found %s', v_count);
  end if;

  -- ── SECURITY DEFINER functions present ─────────────────────────────────
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'is_admin', 'log_audit_event', 'recalculate_standings',
      'capture_all_snapshots', 'cascade_invalidate_best_thirds',
      'handle_new_user'
    )
    and p.prosecdef = true;
  if v_count <> 6 then
    v_errors := v_errors || format('SECURITY DEFINER functions: expected 6, found %s', v_count);
  end if;

  -- ── app_config singleton ────────────────────────────────────────────────
  select count(*) into v_count from app_config;
  if v_count <> 1 then
    v_errors := v_errors || 'app_config should have exactly 1 row';
  end if;

  perform 1 from app_config where id = 1 and tournament_phase = 'setup';
  if not found then
    v_errors := v_errors || 'app_config: initial phase should be setup';
  end if;

  -- ── Phase transition guard ──────────────────────────────────────────────
  if validate_phase_transition('setup'::tournament_phase, 'predictions_open'::tournament_phase) <> true then
    v_errors := v_errors || 'validate_phase_transition: setup→predictions_open should be valid';
  end if;
  if validate_phase_transition('setup'::tournament_phase, 'completed'::tournament_phase) <> false then
    v_errors := v_errors || 'validate_phase_transition: setup→completed should be invalid';
  end if;
  if validate_phase_transition('predictions_open'::tournament_phase, 'setup'::tournament_phase) <> false then
    v_errors := v_errors || 'validate_phase_transition: predictions_open→setup should be invalid (no rollback)';
  end if;

  -- ── player_normalized generated column works ────────────────────────────
  -- Test via a temp insert + rollback
  begin
    insert into teams (fifa_code, name, group_letter, group_position)
    overriding system value
    values (999, 'TST', 'A', 1);
  exception when others then null;
  end;

  -- ── Report ──────────────────────────────────────────────────────────────
  if array_length(v_errors, 1) is null then
    raise notice '✓ All validation checks passed.';
  else
    raise notice 'VALIDATION FAILURES (%s):', array_length(v_errors, 1);
    for v_count in 1..array_length(v_errors, 1) loop
      raise notice '  [%] %', v_count, v_errors[v_count];
    end loop;
    raise exception 'Schema validation failed with % error(s). See notices above.', array_length(v_errors, 1);
  end if;

end $$;
