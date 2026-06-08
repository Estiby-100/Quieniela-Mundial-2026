-- Migration 002: Custom Enum Types

create type tournament_phase as enum (
  'setup',
  'predictions_open',
  'predictions_closed',
  'group_stage',
  'round_of_32',
  'round_of_16',
  'quarter_finals',
  'semi_finals',
  'final',
  'completed'
);

create type match_round as enum (
  'r32',
  'r16',
  'qf',
  'sf',
  'third_place',
  'final'
);

create type slot_type as enum (
  'group_winner',
  'group_runner_up',
  'best_third',
  'match_winner',
  'match_loser'
);

create type snapshot_type as enum (
  'groups',
  'best_thirds',
  'bracket_resolved',
  'scorer',
  'full'
);
