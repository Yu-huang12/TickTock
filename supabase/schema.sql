-- Tick Tock Challenge — online multiplayer schema
-- Run this whole file once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Also enable anonymous sign-ins: Dashboard → Authentication → Providers → Anonymous → Enable.

-- ──────────────────────────────────────────────────────────────────────────
-- Tables
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.rooms (
  code           text primary key,
  host_id        uuid not null,
  status         text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  current_round  int  not null default 0,
  total_rounds   int  not null default 3,
  current_target numeric(3, 1),
  target_seq     int  not null default 0,
  drinking       boolean not null default false,
  created_at     timestamptz not null default now()
);

-- If you created the rooms table before the drinking-game feature, add the column:
--   alter table public.rooms add column if not exists drinking boolean not null default false;


create table if not exists public.round_results (
  id         uuid primary key default gen_random_uuid(),
  room_code  text not null references public.rooms(code) on delete cascade,
  round      int  not null,
  player_id  uuid not null,
  name       text not null default 'Player',
  color_idx  int  not null default 0,
  elapsed    numeric(6, 3) not null,
  diff       numeric(6, 3) not null,
  tier       text not null,
  points     int  not null,
  created_at timestamptz not null default now(),
  unique (room_code, round, player_id)
);

-- ──────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────────────────

alter table public.rooms         enable row level security;
alter table public.round_results enable row level security;

-- rooms: anyone signed in (incl. anonymous) can read; only the host can write its own room.
drop policy if exists "rooms_select"        on public.rooms;
drop policy if exists "rooms_insert_host"   on public.rooms;
drop policy if exists "rooms_update_host"   on public.rooms;
drop policy if exists "rooms_delete_host"   on public.rooms;

create policy "rooms_select"      on public.rooms for select to authenticated using (true);
create policy "rooms_insert_host" on public.rooms for insert to authenticated with check (host_id = auth.uid());
create policy "rooms_update_host" on public.rooms for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "rooms_delete_host" on public.rooms for delete to authenticated using (host_id = auth.uid());

-- round_results: anyone signed in can read; a player may only insert their own rows;
-- the room host may clear results (used for rematches).
drop policy if exists "results_select"       on public.round_results;
drop policy if exists "results_insert_self"  on public.round_results;
drop policy if exists "results_delete_host"  on public.round_results;

create policy "results_select"      on public.round_results for select to authenticated using (true);
create policy "results_insert_self" on public.round_results for insert to authenticated with check (player_id = auth.uid());
create policy "results_delete_host" on public.round_results for delete to authenticated using (
  exists (select 1 from public.rooms r where r.code = round_results.room_code and r.host_id = auth.uid())
);

-- ──────────────────────────────────────────────────────────────────────────
-- Realtime (idempotent — safe to re-run)
-- ──────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'round_results'
  ) then
    alter publication supabase_realtime add table public.round_results;
  end if;
end $$;
