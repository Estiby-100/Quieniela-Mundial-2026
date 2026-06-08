-- Allow any authenticated user to read all profiles.
-- Required for ranking and leaderboard pages that display other users' names.
-- The previous policy only allowed reading one's own row; adding this lets the
-- ranking query return full_name for every participant.
drop policy if exists "profiles: own row read" on profiles;

create policy "profiles: authenticated read all"
  on profiles for select
  to authenticated
  using (true);
