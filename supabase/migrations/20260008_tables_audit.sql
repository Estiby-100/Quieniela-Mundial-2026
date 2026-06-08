-- Migration 008: Ranking history, snapshots, and audit log

-- ─────────────────────────────────────────────
-- ranking_history
-- ─────────────────────────────────────────────
create table ranking_history (
  id                bigint      primary key generated always as identity,
  recalculation_id  uuid        not null,
  user_id           uuid        not null references profiles on delete cascade,
  position          smallint    not null,
  total_points      smallint    not null,
  points_groups     smallint    not null,
  points_thirds     smallint    not null,
  points_bracket    smallint    not null,
  points_scorer     smallint    not null,
  recorded_at       timestamptz not null default now(),

  constraint ranking_history_position_check     check (position > 0),
  constraint ranking_history_total_points_check check (total_points >= 0)
);

comment on table  ranking_history is
  'Immutable snapshot of all positions after each recalculation. recalculation_id groups one full pass.';
comment on column ranking_history.recalculation_id is
  'UUID shared by all rows from the same recalculate_standings() call. Enables delta comparison between passes.';

-- ─────────────────────────────────────────────
-- prediction_snapshots
-- ─────────────────────────────────────────────
create table prediction_snapshots (
  id                          bigint        primary key generated always as identity,
  user_id                     uuid          not null references profiles on delete cascade,
  snapshot_type               snapshot_type not null,
  payload                     jsonb         not null,
  captured_at                 timestamptz   not null default now(),
  triggered_by                uuid          not null references profiles,
  tournament_phase_at_capture tournament_phase not null
);

comment on table  prediction_snapshots is
  'Immutable legal record of each user''s predictions at the moment of close. Written only by capture_all_snapshots().';
comment on column prediction_snapshots.payload is
  'Full jsonb snapshot. For bracket_resolved type, includes the complete derived bracket state visible to the user.';

-- ─────────────────────────────────────────────
-- audit_log
-- ─────────────────────────────────────────────
create table audit_log (
  id          bigint      primary key generated always as identity,
  actor_id    uuid        references auth.users on delete set null,
  action      varchar(50) not null,
  table_name  varchar(60) not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,
  created_at  timestamptz not null default now()
);

comment on table audit_log is
  'Immutable append-only change log. Written only by log_audit_event() SECURITY DEFINER. No client writes permitted.';
