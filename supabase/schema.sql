create extension if not exists pgcrypto;

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists friends_user_email_idx
  on public.friends (user_id, lower(email));

create index if not exists friends_user_created_idx
  on public.friends (user_id, created_at desc);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references public.friends(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  description text not null,
  type text not null check (type in ('owed_to_me', 'owed_by_me')),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists debts_user_created_idx
  on public.debts (user_id, created_at desc);

create index if not exists debts_friend_idx
  on public.debts (friend_id);

alter table public.friends enable row level security;
alter table public.debts enable row level security;

drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own"
  on public.friends
  for select
  using (auth.uid() = user_id);

drop policy if exists "friends_insert_own" on public.friends;
create policy "friends_insert_own"
  on public.friends
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "friends_update_own" on public.friends;
create policy "friends_update_own"
  on public.friends
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "friends_delete_own" on public.friends;
create policy "friends_delete_own"
  on public.friends
  for delete
  using (auth.uid() = user_id);

drop policy if exists "debts_select_own" on public.debts;
create policy "debts_select_own"
  on public.debts
  for select
  using (auth.uid() = user_id);

drop policy if exists "debts_insert_own" on public.debts;
create policy "debts_insert_own"
  on public.debts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "debts_update_own" on public.debts;
create policy "debts_update_own"
  on public.debts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "debts_delete_own" on public.debts;
create policy "debts_delete_own"
  on public.debts
  for delete
  using (auth.uid() = user_id);