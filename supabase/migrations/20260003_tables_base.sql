-- Migration 003: Base tables (no foreign key dependencies)

-- ─────────────────────────────────────────────
-- teams
-- ─────────────────────────────────────────────
create table teams (
  id            smallint      primary key generated always as identity,
  fifa_code     char(3)       not null,
  name          varchar(60)   not null,
  group_letter  char(1)       not null,
  group_position smallint     not null,
  flag_url      text,

  constraint teams_fifa_code_unique        unique (fifa_code),
  constraint teams_group_slot_unique       unique (group_letter, group_position),
  constraint teams_group_letter_check      check  (group_letter between 'A' and 'L'),
  constraint teams_group_position_check    check  (group_position between 1 and 4)
);

comment on table  teams is 'Master table of 48 FIFA World Cup 2026 teams. Seed data only — never modified by users.';
comment on column teams.group_position is 'Draw position within group (1-4). Not the final standings position.';

-- ─────────────────────────────────────────────
-- app_config  (singleton, id = 1 always)
-- ─────────────────────────────────────────────
create table app_config (
  id                             smallint         primary key default 1,
  tournament_phase               tournament_phase not null default 'setup',
  pool_name                      varchar(100)     not null default 'Quiniela Mundial 2026',
  max_participants               smallint         not null default 50,
  public_predictions_after_close boolean          not null default false,
  updated_at                     timestamptz      not null default now(),
  updated_by                     uuid,            -- FK added after profiles table exists

  constraint app_config_singleton check (id = 1),
  constraint app_config_max_participants_check check (max_participants > 0)
);

comment on table  app_config is 'Singleton configuration row. Only id=1 ever exists.';
comment on column app_config.public_predictions_after_close is
  'When true, all participants can see each other''s predictions once tournament_phase is no longer predictions_open.';

-- Insert the one and only config row
insert into app_config (id) values (1);

-- ─────────────────────────────────────────────
-- scoring_rules
-- ─────────────────────────────────────────────
create table scoring_rules (
  rule_key    varchar(50)  primary key,
  points      smallint     not null,
  description varchar(200) not null,

  constraint scoring_rules_points_check check (points >= 0)
);

comment on table scoring_rules is 'Configurable scoring table. Admin can adjust values before tournament starts.';
