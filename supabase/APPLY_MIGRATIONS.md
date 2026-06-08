# Applying Migrations to a New Supabase Project

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- A new Supabase project created at https://supabase.com/dashboard
- Project reference ID (e.g. `abcdefghijklmno`)
- Project DB password

---

## Option A — Supabase CLI (recommended for production)

```bash
# 1. Link to your remote project
supabase link --project-ref <your-project-ref>

# 2. Apply all migrations in order
supabase db push

# 3. Verify
supabase db diff   # should show no changes if all applied
```

---

## Option B — Direct psql (if you need manual control)

```bash
# Get your DB connection string from Supabase dashboard
# Settings → Database → Connection string → URI

DB_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"

# Apply in strict order
psql "$DB_URL" -f supabase/migrations/20260001_extensions.sql
psql "$DB_URL" -f supabase/migrations/20260002_enums.sql
psql "$DB_URL" -f supabase/migrations/20260003_tables_base.sql
psql "$DB_URL" -f supabase/migrations/20260004_tables_profiles.sql
psql "$DB_URL" -f supabase/migrations/20260005_tables_fifa_seed.sql
psql "$DB_URL" -f supabase/migrations/20260006_tables_predictions.sql
psql "$DB_URL" -f supabase/migrations/20260007_tables_results.sql
psql "$DB_URL" -f supabase/migrations/20260008_tables_audit.sql
psql "$DB_URL" -f supabase/migrations/20260009_indexes.sql
psql "$DB_URL" -f supabase/migrations/20260010_functions.sql
psql "$DB_URL" -f supabase/migrations/20260011_triggers.sql
psql "$DB_URL" -f supabase/migrations/20260012_rls.sql
psql "$DB_URL" -f supabase/migrations/20260013_seed_data.sql
psql "$DB_URL" -f supabase/migrations/20260014_seed_fifa_matrix.sql
psql "$DB_URL" -f supabase/migrations/20260015_validation.sql
```

---

## Option C — Supabase SQL Editor (for quick testing)

Paste each file's contents into the SQL Editor in order.
The editor runs each statement — errors will stop execution.

---

## Post-Apply Checklist

- [ ] Validation script (`20260015`) reports 0 failures
- [ ] `select count(*) from teams` returns 48
- [ ] `select count(*) from bracket_template` returns 32
- [ ] `select count(*) from fifa_third_place_matrix` returns 495
- [ ] `select count(*) from scoring_rules` returns 10
- [ ] `select tournament_phase from app_config` returns `setup`
- [ ] Set your first admin user: `update profiles set is_admin = true where email = 'your@email.com';`
- [ ] Verify teams data against official FIFA draw (group_position values are draw pot positions, not final standings)

---

## Setting Up Authentication in Supabase Dashboard

1. Authentication → Providers → Enable Email
2. Authentication → Email Templates → customize as needed
3. Authentication → URL Configuration:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/auth/callback`
