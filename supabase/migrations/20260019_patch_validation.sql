-- Patch 019: Validation (versión simplificada para instalación limpia)

do $$
declare
  v_errors text[] := '{}';
  v_count  int;
begin

  -- Tablas core
  select count(*) into v_count from information_schema.tables
  where table_schema = 'public'
    and table_name in (
      'teams','bracket_template','fifa_third_place_matrix','scoring_rules',
      'app_config','profiles','group_predictions','best_third_predictions',
      'bracket_predictions','scorer_predictions','official_group_results',
      'official_best_thirds','official_bracket_results','official_top_scorer',
      'standings','ranking_history','prediction_snapshots','audit_log'
    );
  if v_count <> 18 then
    v_errors := v_errors || format('Tablas: esperadas 18, encontradas %s', v_count);
  else
    raise notice 'PASS: 18 tablas presentes';
  end if;

  -- Equipos
  select count(*) into v_count from teams;
  if v_count <> 48 then
    v_errors := v_errors || format('teams: esperados 48, encontrados %s', v_count);
  else
    raise notice 'PASS: 48 equipos en teams';
  end if;

  -- Bracket template
  select count(*) into v_count from bracket_template;
  if v_count <> 32 then
    v_errors := v_errors || format('bracket_template: esperados 32, encontrados %s', v_count);
  else
    raise notice 'PASS: 32 partidos en bracket_template';
  end if;

  -- FIFA matrix
  select count(*) into v_count from fifa_third_place_matrix;
  if v_count <> 495 then
    v_errors := v_errors || format('fifa_third_place_matrix: esperadas 495, encontradas %s', v_count);
  else
    raise notice 'PASS: 495 filas en fifa_third_place_matrix';
  end if;

  -- Scoring rules
  select count(*) into v_count from scoring_rules;
  if v_count < 10 then
    v_errors := v_errors || format('scoring_rules: esperadas >= 10, encontradas %s', v_count);
  else
    raise notice 'PASS: % reglas de puntuación presentes', v_count;
  end if;

  -- Fase inicial
  select count(*) into v_count from app_config where tournament_phase = 'setup';
  if v_count <> 1 then
    v_errors := v_errors || 'app_config: fase inicial no es setup';
  else
    raise notice 'PASS: fase inicial = setup';
  end if;

  -- Funciones principales
  select count(*) into v_count
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'is_admin','recalculate_standings','capture_all_snapshots',
      'resolve_user_bracket','get_leaderboard','log_audit_event',
      'validate_phase_transition','current_phase'
    );
  if v_count < 8 then
    v_errors := v_errors || format('Funciones: esperadas >= 8, encontradas %s', v_count);
  else
    raise notice 'PASS: % funciones principales presentes', v_count;
  end if;

  -- RLS habilitado
  select count(*) into v_count
  from pg_tables
  where schemaname = 'public' and rowsecurity = false;
  if v_count > 0 then
    v_errors := v_errors || format('%s tablas sin RLS habilitado', v_count);
  else
    raise notice 'PASS: RLS habilitado en todas las tablas';
  end if;

  -- validate_phase_transition
  if not validate_phase_transition('setup'::tournament_phase, 'predictions_open'::tournament_phase) then
    v_errors := v_errors || 'validate_phase_transition: setup→predictions_open debería ser válido';
  else
    raise notice 'PASS: validate_phase_transition funciona correctamente';
  end if;

  -- Reporte final
  if array_length(v_errors, 1) is null then
    raise notice '══════════════════════════════════════════════';
    raise notice '✓ All validation checks passed.';
    raise notice '══════════════════════════════════════════════';
  else
    raise notice 'FALLOS DE VALIDACIÓN: %', array_length(v_errors, 1);
    for v_count in 1..array_length(v_errors, 1) loop
      raise notice '  [FAIL %] %', v_count, v_errors[v_count];
    end loop;
    raise exception 'Validación falló con % error(s).', array_length(v_errors, 1);
  end if;

end $$;