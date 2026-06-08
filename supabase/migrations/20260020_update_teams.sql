-- Migration 020: Update teams to official FIFA World Cup 2026 draw
-- Replaces previous placeholder draw with the confirmed group assignments.
-- Cascades to all prediction and result tables that reference team IDs.

-- Truncate in dependency order (predictions → results → teams)
truncate table
  scorer_predictions,
  bracket_predictions,
  best_third_predictions,
  group_predictions,
  official_top_scorer,
  official_bracket_results,
  official_best_thirds,
  official_group_results,
  prediction_snapshots,
  ranking_history,
  audit_log
restart identity cascade;

-- Reset team IDs so they start from 1 again
truncate table teams restart identity cascade;

-- Re-insert 48 teams per official FIFA 2026 draw
-- group_position = seeding/pot position within group (1 = host/top seed)
insert into teams (fifa_code, name, group_letter, group_position) values
  -- Grupo A
  ('MEX', 'México',                     'A', 1),
  ('RSA', 'Sudáfrica',                  'A', 2),
  ('KOR', 'Corea del Sur',              'A', 3),
  ('CZE', 'República Checa',            'A', 4),
  -- Grupo B
  ('CAN', 'Canadá',                     'B', 1),
  ('BIH', 'Bosnia y Herzegovina',       'B', 2),
  ('QAT', 'Catar',                      'B', 3),
  ('SUI', 'Suiza',                      'B', 4),
  -- Grupo C
  ('BRA', 'Brasil',                     'C', 1),
  ('MAR', 'Marruecos',                  'C', 2),
  ('HAI', 'Haití',                      'C', 3),
  ('SCO', 'Escocia',                    'C', 4),
  -- Grupo D
  ('USA', 'Estados Unidos',             'D', 1),
  ('PAR', 'Paraguay',                   'D', 2),
  ('AUS', 'Australia',                  'D', 3),
  ('TUR', 'Turquía',                    'D', 4),
  -- Grupo E
  ('GER', 'Alemania',                   'E', 1),
  ('CUW', 'Curazao',                    'E', 2),
  ('CIV', 'Costa de Marfil',            'E', 3),
  ('ECU', 'Ecuador',                    'E', 4),
  -- Grupo F
  ('NED', 'Países Bajos',               'F', 1),
  ('JPN', 'Japón',                      'F', 2),
  ('SWE', 'Suecia',                     'F', 3),
  ('TUN', 'Túnez',                      'F', 4),
  -- Grupo G
  ('BEL', 'Bélgica',                    'G', 1),
  ('EGY', 'Egipto',                     'G', 2),
  ('IRN', 'Irán',                       'G', 3),
  ('NZL', 'Nueva Zelanda',              'G', 4),
  -- Grupo H
  ('ESP', 'España',                     'H', 1),
  ('CPV', 'Cabo Verde',                 'H', 2),
  ('KSA', 'Arabia Saudita',             'H', 3),
  ('URU', 'Uruguay',                    'H', 4),
  -- Grupo I
  ('FRA', 'Francia',                    'I', 1),
  ('SEN', 'Senegal',                    'I', 2),
  ('IRQ', 'Irak',                       'I', 3),
  ('NOR', 'Noruega',                    'I', 4),
  -- Grupo J
  ('ARG', 'Argentina',                  'J', 1),
  ('ALG', 'Argelia',                    'J', 2),
  ('AUT', 'Austria',                    'J', 3),
  ('JOR', 'Jordania',                   'J', 4),
  -- Grupo K
  ('POR', 'Portugal',                   'K', 1),
  ('COD', 'Rep. Dem. del Congo',        'K', 2),
  ('UZB', 'Uzbekistán',                 'K', 3),
  ('COL', 'Colombia',                   'K', 4),
  -- Grupo L
  ('ENG', 'Inglaterra',                 'L', 1),
  ('CRO', 'Croacia',                    'L', 2),
  ('GHA', 'Ghana',                      'L', 3),
  ('PAN', 'Panamá',                     'L', 4);

-- Reset standings to 0 for all users (predictions were cleared above)
update standings set
  points_groups  = 0,
  points_thirds  = 0,
  points_bracket = 0,
  points_scorer  = 0
where true;
