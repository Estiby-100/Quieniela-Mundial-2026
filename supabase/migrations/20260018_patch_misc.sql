-- Patch 018: Miscellaneous fixes for H2, H5, S1

-- ─────────────────────────────────────────────────────────────────────────────
-- H2 FIX: Add third_place_correct scoring rule.
-- Default is 0 points — admin can update to any non-negative value.
-- Having the rule in scoring_rules makes the "no points for 3rd place match"
-- explicit and configurable rather than a silent code omission.
-- ─────────────────────────────────────────────────────────────────────────────
insert into scoring_rules (rule_key, points, description)
values ('third_place_correct', 0, 'Correct winner prediction for 3rd place match (set to 0 to disable)')
on conflict (rule_key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- H5 FIX: Add index to support get_leaderboard CTE that groups by recalculation_id
-- and orders by max(recorded_at). Without this, the CTE does a full table scan.
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_ranking_history_recalc_recorded
  on ranking_history (recalculation_id, recorded_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- S1 FIX: Revoke EXECUTE on internal SECURITY DEFINER functions from public.
-- These functions are called only from within other SECURITY DEFINER functions
-- or triggers (which run as the function owner = postgres, bypassing this revoke).
-- Authenticated users must not be able to call these directly.
-- ─────────────────────────────────────────────────────────────────────────────

-- log_audit_event: Any user could inject false audit entries without this revoke.
revoke execute on function log_audit_event(text, text, text, jsonb, jsonb) from public;

-- cascade_invalidate_best_thirds: Any user knowing another user's UUID + team_id
-- could delete another user's best-third selection without this revoke.
revoke execute on function cascade_invalidate_best_thirds(uuid, smallint) from public;

-- current_phase: Minor — read-only helper, but no reason for clients to call it directly.
revoke execute on function current_phase() from public;

-- capture_all_snapshots: Has internal admin check now (C2 fix), but defense-in-depth.
revoke execute on function capture_all_snapshots(snapshot_type[]) from public;

-- recalculate_standings: Has internal admin check now (C4 fix), but defense-in-depth.
-- Note: authenticated admins need to call this. Grant back explicitly to authenticated.
revoke execute on function recalculate_standings(text, uuid) from public;
grant  execute on function recalculate_standings(text, uuid) to authenticated;

-- capture_all_snapshots: Same — admins need direct access for manual captures.
grant  execute on function capture_all_snapshots(snapshot_type[]) to authenticated;
