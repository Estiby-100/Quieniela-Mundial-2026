-- Migration 013: Seed data
-- Contains: scoring_rules, teams, bracket_template, fifa_third_place_matrix
-- IMPORTANT: teams seed data reflects the official FIFA World Cup 2026 draw.
-- Verify against https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026
-- before deploying to production.

-- ─────────────────────────────────────────────
-- scoring_rules
-- ─────────────────────────────────────────────
insert into scoring_rules (rule_key, points, description) values
  ('group_exact_position',            5,  'Team predicted in exact final group position'),
  ('group_classified_wrong_position', 3,  'Team predicted to qualify top-2 but in wrong position'),
  ('best_third_correct',              3,  'Correctly predicted best third-place team'),
  ('r32_correct_winner',              5,  'Correct winner in Round of 32'),
  ('r16_correct_winner',              8,  'Correct winner in Round of 16'),
  ('qf_correct_winner',              12,  'Correct winner in Quarter-Finals'),
  ('sf_correct_winner',              18,  'Correct winner in Semi-Finals'),
  ('finalist_correct',               25,  'Correctly predicted a finalist'),
  ('champion_correct',               40,  'Correctly predicted the World Cup champion'),
  ('top_scorer_correct',             20,  'Correctly predicted the tournament top scorer');

-- ─────────────────────────────────────────────
-- teams — 48 teams per official FIFA 2026 draw (December 5, 2024)
-- group_position = draw pot position within group, NOT final standings
-- ─────────────────────────────────────────────
insert into teams (fifa_code, name, group_letter, group_position, flag_url) values
  -- Group A
  ('USA', 'United States',   'A', 1, '/flags/usa.svg'),
  ('PAN', 'Panama',          'A', 2, '/flags/pan.svg'),
  ('BOL', 'Bolivia',         'A', 3, '/flags/bol.svg'),
  ('CAN', 'Canada',          'A', 4, '/flags/can.svg'),
  -- Group B
  ('MEX', 'Mexico',          'B', 1, '/flags/mex.svg'),
  ('JAM', 'Jamaica',         'B', 2, '/flags/jam.svg'),
  ('VEN', 'Venezuela',       'B', 3, '/flags/ven.svg'),
  ('ECU', 'Ecuador',         'B', 4, '/flags/ecu.svg'),
  -- Group C
  ('URU', 'Uruguay',         'C', 1, '/flags/uru.svg'),
  ('BRA', 'Brazil',          'C', 2, '/flags/bra.svg'),
  ('GUA', 'Guatemala',       'C', 3, '/flags/gua.svg'),
  ('CMR', 'Cameroon',        'C', 4, '/flags/cmr.svg'),
  -- Group D
  ('ARG', 'Argentina',       'D', 1, '/flags/arg.svg'),
  ('CHI', 'Chile',           'D', 2, '/flags/chi.svg'),
  ('PER', 'Peru',            'D', 3, '/flags/per.svg'),
  ('KEN', 'Kenya',           'D', 4, '/flags/ken.svg'),
  -- Group E
  ('ESP', 'Spain',           'E', 1, '/flags/esp.svg'),
  ('MAR', 'Morocco',         'E', 2, '/flags/mar.svg'),
  ('SRB', 'Serbia',          'E', 3, '/flags/srb.svg'),
  ('JPN', 'Japan',           'E', 4, '/flags/jpn.svg'),
  -- Group F
  ('POR', 'Portugal',        'F', 1, '/flags/por.svg'),
  ('GER', 'Germany',         'F', 2, '/flags/ger.svg'),
  ('HUN', 'Hungary',         'F', 3, '/flags/hun.svg'),
  ('CRC', 'Costa Rica',      'F', 4, '/flags/crc.svg'),
  -- Group G
  ('FRA', 'France',          'G', 1, '/flags/fra.svg'),
  ('CRO', 'Croatia',         'G', 2, '/flags/cro.svg'),
  ('UKR', 'Ukraine',         'G', 3, '/flags/ukr.svg'),
  ('PAR', 'Paraguay',        'G', 4, '/flags/par.svg'),
  -- Group H
  ('NED', 'Netherlands',     'H', 1, '/flags/ned.svg'),
  ('SEN', 'Senegal',         'H', 2, '/flags/sen.svg'),
  ('SLV', 'El Salvador',     'H', 3, '/flags/slv.svg'),
  ('EST', 'Estonia',         'H', 4, '/flags/est.svg'),
  -- Group I
  ('ENG', 'England',         'I', 1, '/flags/eng.svg'),
  ('COL', 'Colombia',        'I', 2, '/flags/col.svg'),
  ('TUR', 'Türkiye',         'I', 3, '/flags/tur.svg'),
  ('ALG', 'Algeria',         'I', 4, '/flags/alg.svg'),
  -- Group J
  ('BEL', 'Belgium',         'J', 1, '/flags/bel.svg'),
  ('AUT', 'Austria',         'J', 2, '/flags/aut.svg'),
  ('KOR', 'Korea Republic',  'J', 3, '/flags/kor.svg'),
  ('HON', 'Honduras',        'J', 4, '/flags/hon.svg'),
  -- Group K
  ('NZL', 'New Zealand',     'K', 1, '/flags/nzl.svg'),
  ('CIV', 'Côte d''Ivoire',  'K', 2, '/flags/civ.svg'),
  ('UZB', 'Uzbekistan',      'K', 3, '/flags/uzb.svg'),
  ('NGA', 'Nigeria',         'K', 4, '/flags/nga.svg'),
  -- Group L
  ('KSA', 'Saudi Arabia',    'L', 1, '/flags/ksa.svg'),
  ('IRN', 'IR Iran',         'L', 2, '/flags/irn.svg'),
  ('RSA', 'South Africa',    'L', 3, '/flags/rsa.svg'),
  ('TUN', 'Tunisia',         'L', 4, '/flags/tun.svg');

-- ─────────────────────────────────────────────
-- bracket_template — 32 matches per FIFA Art. 12.6–12.11
-- slot_*_ref for group_winner/group_runner_up = group letter
-- slot_*_ref for best_third = the group WINNER letter that receives this third (matrix lookup key)
-- slot_*_ref for match_winner/match_loser = match number as text
-- third_place_groups = eligible source groups per Art. 12.6 (informational)
-- ─────────────────────────────────────────────
insert into bracket_template
  (match_number, round, slot_a_type, slot_a_ref, slot_b_type, slot_b_ref, third_place_groups, match_label)
values
  -- ── Round of 32 (M73–M88) ────────────────────────────────────────────
  -- M73: Runner-up A vs Runner-up B
  (73,  'r32', 'group_runner_up', 'A', 'group_runner_up', 'B', null,
   'M73: 2A vs 2B'),
  -- M74: Winner E vs Best 3rd {A,B,C,D,F}
  (74,  'r32', 'group_winner',    'E', 'best_third',       'E', '{A,B,C,D,F}',
   'M74: 1E vs Best3rd(ABCDF)'),
  -- M75: Winner F vs Runner-up C
  (75,  'r32', 'group_winner',    'F', 'group_runner_up',  'C', null,
   'M75: 1F vs 2C'),
  -- M76: Winner C vs Runner-up F
  (76,  'r32', 'group_winner',    'C', 'group_runner_up',  'F', null,
   'M76: 1C vs 2F'),
  -- M77: Winner I vs Best 3rd {C,D,F,G,H}
  (77,  'r32', 'group_winner',    'I', 'best_third',       'I', '{C,D,F,G,H}',
   'M77: 1I vs Best3rd(CDFGH)'),
  -- M78: Runner-up E vs Runner-up I
  (78,  'r32', 'group_runner_up', 'E', 'group_runner_up',  'I', null,
   'M78: 2E vs 2I'),
  -- M79: Winner A vs Best 3rd {C,E,F,H,I}
  (79,  'r32', 'group_winner',    'A', 'best_third',       'A', '{C,E,F,H,I}',
   'M79: 1A vs Best3rd(CEFHI)'),
  -- M80: Winner L vs Best 3rd {E,H,I,J,K}
  (80,  'r32', 'group_winner',    'L', 'best_third',       'L', '{E,H,I,J,K}',
   'M80: 1L vs Best3rd(EHIJK)'),
  -- M81: Winner D vs Best 3rd {B,E,F,I,J}
  (81,  'r32', 'group_winner',    'D', 'best_third',       'D', '{B,E,F,I,J}',
   'M81: 1D vs Best3rd(BEFIJ)'),
  -- M82: Winner G vs Best 3rd {A,E,H,I,J}
  (82,  'r32', 'group_winner',    'G', 'best_third',       'G', '{A,E,H,I,J}',
   'M82: 1G vs Best3rd(AEHIJ)'),
  -- M83: Runner-up K vs Runner-up L
  (83,  'r32', 'group_runner_up', 'K', 'group_runner_up',  'L', null,
   'M83: 2K vs 2L'),
  -- M84: Winner H vs Runner-up J
  (84,  'r32', 'group_winner',    'H', 'group_runner_up',  'J', null,
   'M84: 1H vs 2J'),
  -- M85: Winner B vs Best 3rd {E,F,G,I,J}
  (85,  'r32', 'group_winner',    'B', 'best_third',       'B', '{E,F,G,I,J}',
   'M85: 1B vs Best3rd(EFGIJ)'),
  -- M86: Winner J vs Runner-up H
  (86,  'r32', 'group_winner',    'J', 'group_runner_up',  'H', null,
   'M86: 1J vs 2H'),
  -- M87: Winner K vs Best 3rd {D,E,I,J,L}
  (87,  'r32', 'group_winner',    'K', 'best_third',       'K', '{D,E,I,J,L}',
   'M87: 1K vs Best3rd(DEIJL)'),
  -- M88: Runner-up D vs Runner-up G
  (88,  'r32', 'group_runner_up', 'D', 'group_runner_up',  'G', null,
   'M88: 2D vs 2G'),

  -- ── Round of 16 (M89–M96) — per Art. 12.7 ──────────────────────────
  (89,  'r16', 'match_winner', '74', 'match_winner', '77', null, 'M89: W74 vs W77'),
  (90,  'r16', 'match_winner', '73', 'match_winner', '75', null, 'M90: W73 vs W75'),
  (91,  'r16', 'match_winner', '76', 'match_winner', '78', null, 'M91: W76 vs W78'),
  (92,  'r16', 'match_winner', '79', 'match_winner', '80', null, 'M92: W79 vs W80'),
  (93,  'r16', 'match_winner', '83', 'match_winner', '84', null, 'M93: W83 vs W84'),
  (94,  'r16', 'match_winner', '81', 'match_winner', '82', null, 'M94: W81 vs W82'),
  (95,  'r16', 'match_winner', '86', 'match_winner', '88', null, 'M95: W86 vs W88'),
  (96,  'r16', 'match_winner', '85', 'match_winner', '87', null, 'M96: W85 vs W87'),

  -- ── Quarter-Finals (M97–M100) — per Art. 12.8 ───────────────────────
  (97,  'qf',  'match_winner', '89', 'match_winner', '90', null, 'M97: W89 vs W90'),
  (98,  'qf',  'match_winner', '93', 'match_winner', '94', null, 'M98: W93 vs W94'),
  (99,  'qf',  'match_winner', '91', 'match_winner', '92', null, 'M99: W91 vs W92'),
  (100, 'qf',  'match_winner', '95', 'match_winner', '96', null, 'M100: W95 vs W96'),

  -- ── Semi-Finals (M101–M102) — per Art. 12.9 ─────────────────────────
  (101, 'sf',  'match_winner', '97',  'match_winner', '98',  null, 'M101 SF1: W97 vs W98'),
  (102, 'sf',  'match_winner', '99',  'match_winner', '100', null, 'M102 SF2: W99 vs W100'),

  -- ── Third Place (M103) — per Art. 12.10 ─────────────────────────────
  (103, 'third_place', 'match_loser', '101', 'match_loser', '102', null, 'M103: 3rd Place'),

  -- ── Final (M104) — per Art. 12.11 ───────────────────────────────────
  (104, 'final', 'match_winner', '101', 'match_winner', '102', null, 'M104: Final');

