-- Migration 009: Indexes

-- group_predictions
create index idx_group_predictions_user_id        on group_predictions (user_id);
create index idx_group_predictions_position_3     on group_predictions (position_3);

-- best_third_predictions
create index idx_best_third_user_id               on best_third_predictions (user_id);

-- bracket_predictions
create index idx_bracket_predictions_user_id      on bracket_predictions (user_id);
create index idx_bracket_predictions_match_number on bracket_predictions (match_number);

-- standings
create index idx_standings_total_points_desc      on standings (total_points desc);

-- ranking_history
create index idx_ranking_history_recalc_position  on ranking_history (recalculation_id, position);
create index idx_ranking_history_user_recorded    on ranking_history (user_id, recorded_at desc);
create index idx_ranking_history_recalc_id        on ranking_history (recalculation_id);

-- prediction_snapshots
create index idx_snapshots_user_type              on prediction_snapshots (user_id, snapshot_type);
create index idx_snapshots_captured_at            on prediction_snapshots (captured_at desc);

-- audit_log
create index idx_audit_table_record               on audit_log (table_name, record_id);
create index idx_audit_actor_created              on audit_log (actor_id, created_at desc);
create index idx_audit_created_at                 on audit_log (created_at desc);

-- official results — ordered for deterministic recalculation queries
create index idx_official_bracket_results_match   on official_bracket_results (match_number);
