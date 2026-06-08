-- Migration 012: Row Level Security policies

-- ─────────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────────
alter table teams                    enable row level security;
alter table app_config               enable row level security;
alter table scoring_rules            enable row level security;
alter table profiles                 enable row level security;
alter table standings                enable row level security;
alter table group_predictions        enable row level security;
alter table best_third_predictions   enable row level security;
alter table bracket_predictions      enable row level security;
alter table scorer_predictions       enable row level security;
alter table official_group_results   enable row level security;
alter table official_best_thirds     enable row level security;
alter table official_bracket_results enable row level security;
alter table official_top_scorer      enable row level security;
alter table ranking_history          enable row level security;
alter table prediction_snapshots     enable row level security;
alter table audit_log                enable row level security;
alter table bracket_template         enable row level security;
alter table fifa_third_place_matrix  enable row level security;

-- ─────────────────────────────────────────────
-- teams  — read-only for all authenticated users
-- ─────────────────────────────────────────────
create policy "teams: authenticated read"
  on teams for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- bracket_template  — read-only for all authenticated users
-- ─────────────────────────────────────────────
create policy "bracket_template: authenticated read"
  on bracket_template for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- fifa_third_place_matrix  — read-only for all authenticated users
-- ─────────────────────────────────────────────
create policy "fifa_matrix: authenticated read"
  on fifa_third_place_matrix for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- scoring_rules  — read for all; write for admins
-- ─────────────────────────────────────────────
create policy "scoring_rules: authenticated read"
  on scoring_rules for select
  to authenticated
  using (true);

create policy "scoring_rules: admin write"
  on scoring_rules for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ─────────────────────────────────────────────
-- app_config  — read for all; write for admins
-- ─────────────────────────────────────────────
create policy "app_config: authenticated read"
  on app_config for select
  to authenticated
  using (true);

create policy "app_config: admin update"
  on app_config for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ─────────────────────────────────────────────
-- profiles  — own row + admins see all; limited self-update
-- ─────────────────────────────────────────────
create policy "profiles: own row read"
  on profiles for select
  to authenticated
  using (id = auth.uid() or is_admin());

create policy "profiles: self update full_name"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  -- is_admin cannot be changed by client — enforced by column-level: only full_name
  with check (id = auth.uid() and is_admin = (select is_admin from profiles where id = auth.uid()));

-- ─────────────────────────────────────────────
-- standings  — read for all; no client writes
-- ─────────────────────────────────────────────
create policy "standings: authenticated read"
  on standings for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- group_predictions
-- ─────────────────────────────────────────────
create policy "group_predictions: read own or admin or public after close"
  on group_predictions for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or (
      (select public_predictions_after_close from app_config where id = 1)
      and (select tournament_phase from app_config where id = 1) <> 'predictions_open'
    )
  );

create policy "group_predictions: write own while open"
  on group_predictions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "group_predictions: update own while open"
  on group_predictions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "group_predictions: delete own while open"
  on group_predictions for delete
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- best_third_predictions
-- ─────────────────────────────────────────────
create policy "best_third_predictions: read own or admin or public after close"
  on best_third_predictions for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or (
      (select public_predictions_after_close from app_config where id = 1)
      and (select tournament_phase from app_config where id = 1) <> 'predictions_open'
    )
  );

create policy "best_third_predictions: write own while open"
  on best_third_predictions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "best_third_predictions: update own while open"
  on best_third_predictions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "best_third_predictions: delete own while open"
  on best_third_predictions for delete
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- bracket_predictions
-- ─────────────────────────────────────────────
create policy "bracket_predictions: read own or admin or public after close"
  on bracket_predictions for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or (
      (select public_predictions_after_close from app_config where id = 1)
      and (select tournament_phase from app_config where id = 1) <> 'predictions_open'
    )
  );

create policy "bracket_predictions: write own while open"
  on bracket_predictions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "bracket_predictions: update own while open"
  on bracket_predictions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "bracket_predictions: delete own while open"
  on bracket_predictions for delete
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- scorer_predictions
-- ─────────────────────────────────────────────
create policy "scorer_predictions: read own or admin or public after close"
  on scorer_predictions for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or (
      (select public_predictions_after_close from app_config where id = 1)
      and (select tournament_phase from app_config where id = 1) <> 'predictions_open'
    )
  );

create policy "scorer_predictions: write own while open"
  on scorer_predictions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "scorer_predictions: update own while open"
  on scorer_predictions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "scorer_predictions: delete own while open"
  on scorer_predictions for delete
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- official results — read for all; write via trigger admin check
-- ─────────────────────────────────────────────
create policy "official_group_results: authenticated read"
  on official_group_results for select
  to authenticated
  using (true);

create policy "official_group_results: admin write"
  on official_group_results for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "official_best_thirds: authenticated read"
  on official_best_thirds for select
  to authenticated
  using (true);

create policy "official_best_thirds: admin write"
  on official_best_thirds for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "official_bracket_results: authenticated read"
  on official_bracket_results for select
  to authenticated
  using (true);

create policy "official_bracket_results: admin write"
  on official_bracket_results for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "official_top_scorer: authenticated read"
  on official_top_scorer for select
  to authenticated
  using (true);

create policy "official_top_scorer: admin write"
  on official_top_scorer for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ─────────────────────────────────────────────
-- ranking_history  — read for all authenticated
-- ─────────────────────────────────────────────
create policy "ranking_history: authenticated read"
  on ranking_history for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- prediction_snapshots  — own + admins
-- ─────────────────────────────────────────────
create policy "prediction_snapshots: own or admin read"
  on prediction_snapshots for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

-- ─────────────────────────────────────────────
-- audit_log  — admins only
-- ─────────────────────────────────────────────
create policy "audit_log: admin read"
  on audit_log for select
  to authenticated
  using (is_admin());
