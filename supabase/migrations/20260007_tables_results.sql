-- Migration 007: Official results tables (admin-only writes)

-- ─────────────────────────────────────────────
-- official_group_results
-- ─────────────────────────────────────────────
create table official_group_results (
  group_letter char(1)     primary key,
  position_1   smallint    not null references teams,
  position_2   smallint    not null references teams,
  position_3   smallint    not null references teams,
  position_4   smallint    not null references teams,
  recorded_at  timestamptz not null default now(),
  recorded_by  uuid        not null references profiles,

  constraint official_group_results_group_letter_check check (group_letter between 'A' and 'L'),
  constraint official_group_results_no_duplicates check (
    position_1 <> position_2 and
    position_1 <> position_3 and
    position_1 <> position_4 and
    position_2 <> position_3 and
    position_2 <> position_4 and
    position_3 <> position_4
  )
);

comment on table official_group_results is
  'Admin-recorded final standings for all 12 groups. One row per group. Teams-belong-to-group enforced by trigger.';

-- ─────────────────────────────────────────────
-- official_best_thirds
-- ─────────────────────────────────────────────
create table official_best_thirds (
  team_id     smallint    primary key references teams,
  recorded_at timestamptz not null default now(),
  recorded_by uuid        not null references profiles
);

comment on table official_best_thirds is
  'The 8 best third-place teams that advance to R32. Exactly 8 rows enforced by trigger. Team must be in position_3 of official_group_results.';

-- ─────────────────────────────────────────────
-- official_bracket_results
-- ─────────────────────────────────────────────
create table official_bracket_results (
  match_number smallint    primary key references bracket_template,
  winner_id    smallint    not null references teams,
  recorded_at  timestamptz not null default now(),
  recorded_by  uuid        not null references profiles
);

comment on table official_bracket_results is 'Admin-recorded winner for each of the 32 knockout matches.';

-- ─────────────────────────────────────────────
-- official_top_scorer  (singleton, id = 1)
-- ─────────────────────────────────────────────
create table official_top_scorer (
  id                smallint     primary key default 1,
  player_name       varchar(100) not null,
  player_normalized text         generated always as (
                      lower(regexp_replace(unaccent(trim(player_name)), '\s+', ' ', 'g'))
                    ) stored,
  team_id           smallint     not null references teams,
  recorded_at       timestamptz  not null default now(),
  recorded_by       uuid         not null references profiles,

  constraint official_top_scorer_singleton check (id = 1)
);

comment on table  official_top_scorer is 'Singleton row for the official tournament top scorer.';
comment on column official_top_scorer.player_normalized is
  'Normalized for comparison against scorer_predictions.player_normalized.';
