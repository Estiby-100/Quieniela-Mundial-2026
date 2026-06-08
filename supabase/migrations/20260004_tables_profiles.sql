-- Migration 004: Profiles and auth integration

create table profiles (
  id         uuid         primary key references auth.users on delete cascade,
  email      text         not null,
  full_name  varchar(100) not null,
  is_admin   boolean      not null default false,
  created_at timestamptz  not null default now(),

  constraint profiles_email_unique unique (email)
);

comment on table  profiles is 'Public user profile, one row per auth.users entry.';
comment on column profiles.is_admin is 'Grants admin privileges. Set manually in DB — not writable from client via RLS.';

-- Now that profiles exists, add the FK on app_config
alter table app_config
  add constraint app_config_updated_by_fk
  foreign key (updated_by) references profiles (id) on delete set null;

-- standings stub created here so the profiles trigger can INSERT into it
create table standings (
  user_id                uuid      primary key references profiles on delete cascade,
  points_groups          smallint  not null default 0,
  points_thirds          smallint  not null default 0,
  points_bracket         smallint  not null default 0,
  points_scorer          smallint  not null default 0,
  total_points           smallint  generated always as
                           (points_groups + points_thirds + points_bracket + points_scorer) stored,
  last_recalculated_at   timestamptz,

  constraint standings_points_groups_check   check (points_groups  >= 0),
  constraint standings_points_thirds_check   check (points_thirds  >= 0),
  constraint standings_points_bracket_check  check (points_bracket >= 0),
  constraint standings_points_scorer_check   check (points_scorer  >= 0)
);

comment on table  standings is 'Current point totals per user. Written only by recalculate_standings() SECURITY DEFINER function.';
comment on column standings.total_points is 'Computed column — always equals sum of the four point categories.';

-- ─────────────────────────────────────────────
-- Trigger: auto-create profile + standings on new auth user
-- ─────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );

  insert into standings (user_id) values (new.id);

  return new;
end;
$$;

create trigger trg_on_new_user
  after insert on auth.users
  for each row execute function handle_new_user();
