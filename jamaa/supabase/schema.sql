-- JAMAA (جَمعة) starter schema
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.games (
  id text primary key, name text not null, description text not null default '',
  icon text not null default '✦', art text not null default 'g-social',
  audience text[] not null default array['youth','girls','family']::text[],
  active boolean not null default true, instructions text not null default '',
  players text not null default '2–10 لاعبين', duration text not null default '10–20 دقيقة',
  min_players integer not null default 2, max_players integer not null default 10,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  gathering_type text not null default 'youth' check (gathering_type in ('youth','girls','family')),
  status text not null default 'voting' check (status in ('voting','finished')),
  created_by text not null default '', host_player_id text, winning_game_id text,
  created_at timestamptz not null default now()
);
create table if not exists public.room_players (
  player_id text primary key, room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null, joined_at timestamptz not null default now()
);
create table if not exists public.votes (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id text not null, game_id text not null, created_at timestamptz not null default now(),
  primary key (room_id, player_id)
);
create index if not exists rooms_code_idx on public.rooms(code);
create index if not exists room_players_room_idx on public.room_players(room_id, joined_at);
create index if not exists votes_room_idx on public.votes(room_id);

grant usage on schema public to anon, authenticated;
grant select on public.site_settings,public.games,public.rooms,public.room_players,public.votes to anon,authenticated;
grant select on public.admin_users to authenticated;
grant insert on public.rooms,public.room_players,public.votes to anon,authenticated;
grant update on public.rooms,public.votes to anon,authenticated;
grant delete on public.votes to anon,authenticated;
grant insert,update,delete on public.site_settings,public.games to authenticated;

alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.games enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.votes enable row level security;

drop policy if exists "admins read own grant" on public.admin_users;
create policy "admins read own grant" on public.admin_users for select to authenticated using (user_id=auth.uid());

drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings" on public.site_settings for select to anon,authenticated using (true);
drop policy if exists "admins insert site settings" on public.site_settings;
create policy "admins insert site settings" on public.site_settings for insert to authenticated with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "admins update site settings" on public.site_settings;
create policy "admins update site settings" on public.site_settings for update to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));

drop policy if exists "public read active games and admins read all" on public.games;
create policy "public read active games and admins read all" on public.games for select to anon,authenticated using (active=true or exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "admins insert games" on public.games;
create policy "admins insert games" on public.games for insert to authenticated with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "admins update games" on public.games;
create policy "admins update games" on public.games for update to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "admins delete games" on public.games;
create policy "admins delete games" on public.games for delete to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));

drop policy if exists "players read rooms" on public.rooms;
create policy "players read rooms" on public.rooms for select to anon,authenticated using (true);
drop policy if exists "players create rooms" on public.rooms;
create policy "players create rooms" on public.rooms for insert to anon,authenticated with check (true);
drop policy if exists "players update rooms" on public.rooms;
create policy "players update rooms" on public.rooms for update to anon,authenticated using (true) with check (true);
drop policy if exists "players read room members" on public.room_players;
create policy "players read room members" on public.room_players for select to anon,authenticated using (true);
drop policy if exists "players join rooms" on public.room_players;
create policy "players join rooms" on public.room_players for insert to anon,authenticated with check (true);
drop policy if exists "players read votes" on public.votes;
create policy "players read votes" on public.votes for select to anon,authenticated using (true);
drop policy if exists "players cast votes" on public.votes;
create policy "players cast votes" on public.votes for insert to anon,authenticated with check (true);
drop policy if exists "players change votes" on public.votes;
create policy "players change votes" on public.votes for update to anon,authenticated using (true) with check (true);
drop policy if exists "players reset votes" on public.votes;
create policy "players reset votes" on public.votes for delete to anon,authenticated using (true);

insert into storage.buckets (id,name,public)
values ('site-assets','site-assets',true)
on conflict(id) do update set public=true;
drop policy if exists "public read JAMAA site assets" on storage.objects;
create policy "public read JAMAA site assets" on storage.objects for select to anon,authenticated using (bucket_id='site-assets');
drop policy if exists "admins upload JAMAA site assets" on storage.objects;
create policy "admins upload JAMAA site assets" on storage.objects for insert to authenticated with check (bucket_id='site-assets' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "admins update JAMAA site assets" on storage.objects;
create policy "admins update JAMAA site assets" on storage.objects for update to authenticated using (bucket_id='site-assets' and exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (bucket_id='site-assets' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "admins delete JAMAA site assets" on storage.objects;
create policy "admins delete JAMAA site assets" on storage.objects for delete to authenticated using (bucket_id='site-assets' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));

do $$ begin alter publication supabase_realtime add table public.rooms; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.room_players; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.votes; exception when duplicate_object then null; end $$;

-- The production project also inserts eight initial games and the homepage row.
-- Keep those seed values synchronized with the deployed site when bootstrapping a new project.
