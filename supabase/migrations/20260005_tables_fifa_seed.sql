-- Migration 005: FIFA structural tables (bracket_template + fifa_third_place_matrix)
-- These are pure seed/reference tables — never modified by application logic.

-- ─────────────────────────────────────────────
-- bracket_template
-- Encodes all 32 knockout matches per FIFA Art. 12.6–12.11.
-- slot_*_ref meanings by slot_*_type:
--   group_winner / group_runner_up  → single char, e.g. 'A'
--   best_third                      → not used (third_place_groups array is the reference)
--   match_winner / match_loser      → match number as text, e.g. '101'
-- ─────────────────────────────────────────────
create table bracket_template (
  match_number         smallint    primary key,
  round                match_round not null,
  slot_a_type          slot_type   not null,
  slot_a_ref           varchar(10) not null,
  slot_b_type          slot_type   not null,
  slot_b_ref           varchar(10) not null,
  third_place_groups   char[]      ,            -- null unless slot is best_third
  match_label          varchar(40) not null,

  constraint bracket_template_match_number_range check (match_number between 73 and 104)
);

comment on table  bracket_template is
  'Official FIFA bracket structure per Art. 12.6–12.11. 32 seed rows, never updated after load.';
comment on column bracket_template.third_place_groups is
  'Eligible source groups for the best-third slot in this match (Annex C). NULL for non-third-place slots.';

-- ─────────────────────────────────────────────
-- fifa_third_place_matrix
-- 495 rows from Annex C. groups_key = 8 qualifying group letters sorted A→L.
-- Column winner_X_faces = which group's 3rd-place team faces group-X winner.
-- ─────────────────────────────────────────────
create table fifa_third_place_matrix (
  option_number  smallint primary key,
  groups_key     char(8)  not null,

  -- Which 3rd-place group's representative faces each of the 8 group winners
  winner_a_faces char(1)  not null,
  winner_b_faces char(1)  not null,
  winner_d_faces char(1)  not null,
  winner_e_faces char(1)  not null,
  winner_g_faces char(1)  not null,
  winner_i_faces char(1)  not null,
  winner_k_faces char(1)  not null,
  winner_l_faces char(1)  not null,

  constraint fifa_matrix_groups_key_unique unique (groups_key),
  constraint fifa_matrix_option_range      check  (option_number between 1 and 495),
  constraint fifa_matrix_key_length        check  (length(groups_key) = 8)
);

comment on table  fifa_third_place_matrix is
  'All 495 C(12,8) combinations from Annex C. Lookup key is groups_key — 8 letters of qualifying groups sorted A→L.';
comment on column fifa_third_place_matrix.groups_key is
  'Alphabetically sorted concatenation of the 8 group letters whose 3rd-place teams qualify. Used as O(1) lookup key.';
