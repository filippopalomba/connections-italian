-- =============================================================
-- Connessioni Italiane — Supabase schema
--
-- HOW TO USE
-- 1. Create a free project at https://supabase.com
-- 2. Open Dashboard → SQL Editor → New query
-- 3. Paste this entire file and click "Run"
-- 4. Go to Authentication → Providers → Email → DISABLE "Confirm email"
--    (we use synthetic emails for username-only signup, so there's
--    nothing to confirm)
-- 5. Copy your Project URL and anon key into js/config.js
-- =============================================================

-- 1. PROFILES — public username for each auth user
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null check (char_length(username) between 3 and 24),
  created_at timestamptz default now() not null
);

-- 2. PROGRESS — per-user, per-puzzle game state (replaces localStorage when logged in)
create table if not exists public.progress (
  user_id uuid references auth.users on delete cascade,
  puzzle_date text not null,
  solved_levels jsonb default '[]'::jsonb not null,
  mistakes int default 0 not null,
  done boolean default false not null,
  result text,
  remaining jsonb,
  updated_at timestamptz default now() not null,
  primary key (user_id, puzzle_date)
);

-- 3. RATINGS — per-user, per-puzzle (1-5 stars)
create table if not exists public.ratings (
  user_id uuid references auth.users on delete cascade,
  puzzle_date text not null,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz default now() not null,
  primary key (user_id, puzzle_date)
);

-- 4. ACHIEVEMENTS — per-user unlocked badges
create table if not exists public.achievements (
  user_id uuid references auth.users on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz default now() not null,
  primary key (user_id, achievement_id)
);

-- Trigger: create profile row automatically on signup, using the username
-- stored in raw_user_meta_data (we pass it from the JS client on signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      'utente_' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- Row-Level Security
-- =============================================================
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.ratings enable row level security;
alter table public.achievements enable row level security;

-- PROFILES: anyone can read (so usernames can be shown), only owner can update
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- PROGRESS: private to owner
drop policy if exists "progress_read_own" on public.progress;
create policy "progress_read_own" on public.progress for select using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress for insert with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress for update using (auth.uid() = user_id);

-- RATINGS: anyone can read aggregates, only owner can write
drop policy if exists "ratings_read" on public.ratings;
create policy "ratings_read" on public.ratings for select using (true);

drop policy if exists "ratings_insert_own" on public.ratings;
create policy "ratings_insert_own" on public.ratings for insert with check (auth.uid() = user_id);

drop policy if exists "ratings_update_own" on public.ratings;
create policy "ratings_update_own" on public.ratings for update using (auth.uid() = user_id);

-- ACHIEVEMENTS: private to owner (could be made public later for leaderboards)
drop policy if exists "achievements_read_own" on public.achievements;
create policy "achievements_read_own" on public.achievements for select using (auth.uid() = user_id);

drop policy if exists "achievements_insert_own" on public.achievements;
create policy "achievements_insert_own" on public.achievements for insert with check (auth.uid() = user_id);
