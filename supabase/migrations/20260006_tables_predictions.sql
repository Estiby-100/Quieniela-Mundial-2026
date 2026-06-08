-- Migration 006: User prediction tables

-- ─────────────────────────────────────────────
-- group_predictions
-- ─────────────────────────────────────────────
create table group_predictions (
  id           bigint   primary key generated always as identity,
  user_id      uuid     not null references profiles    on delete cascade,
  group_letter char(1)  not null,
  position_1   smallint not null references teams,
  position_2   smallint not null references teams,
  position_3   smallint not null references teams,
  position_4   smallint not null references teams,
  updated_at   timestamptz not null default now(),

  constraint group_predictions_user_group_unique unique (user_id, group_letter),
  constraint group_predictions_group_letter_check check (group_letter between 'A' and 'L'),
  -- All four positions must be distinct teams
  constraint group_predictions_no_duplicates check (
    position_1 <> position_2 and
    position_1 <> position_3 and
    position_1 <> position_4 and
    position_2 <> position_3 and
    position_2 <> position_4 and
    position_3 <> position_4
  )
  -- Note: teams-belong-to-group constraint enforced by trigger (requires join to teams table)
);

comment on table group_predictions is
  'User''s predicted final standings for all 12 groups. One row per (user, group). Locked when phase leaves predictions_open.';

-- ─────────────────────────────────────────────
-- best_third_predictions
-- ─────────────────────────────────────────────
create table best_third_predictions (
  id         bigint      primary key generated always as identity,
  user_id    uuid        not null references profiles on delete cascade,
  team_id    smallint    not null references teams,
  updated_at timestamptz not null default now(),

  constraint best_third_predictions_user_team_unique unique (user_id, team_id)
);

comment on table best_third_predictions is
  'User''s selection of the 8 best third-place teams. Exactly 8 per user enforced by trigger. Team must appear in user''s group_predictions at position_3.';

-- ─────────────────────────────────────────────
-- bracket_predictions
-- ─────────────────────────────────────────────
create table bracket_predictions (
  id           bigint      primary key generated always as identity,
  user_id      uuid        not null references profiles         on delete cascade,
  match_number smallint    not null references bracket_template,
  winner_id    smallint    not null references teams,
  updated_at   timestamptz not null default now(),

  constraint bracket_predictions_user_match_unique unique (user_id, match_number)
);

comment on table bracket_predictions is
  'User''s predicted winners for all 32 knockout matches. Locked when phase reaches predictions_closed.';

-- ─────────────────────────────────────────────
-- scorer_predictions
-- ─────────────────────────────────────────────
create table scorer_predictions (
  user_id           uuid         primary key references profiles on delete cascade,
  player_name       varchar(100) not null,
  player_normalized text,
  team_id           smallint     not null references teams,
  updated_at        timestamptz  not null default now()
);

comment on table  scorer_predictions is 'User''s predicted top scorer. One entry per user. Locked when phase leaves predictions_open.';
comment on column scorer_predictions.player_normalized is
  'Lowercase + unaccented + trimmed name. Used for comparison with official_top_scorer.player_normalized.';