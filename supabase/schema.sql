create extension if not exists pgcrypto;

create table if not exists public.friend_invitations (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_email text not null,
  to_user_id uuid references auth.users(id) on delete cascade,
  invited_name text,
  inviter_name text not null,
  inviter_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.friend_invitations
  add column if not exists invited_name text;

create unique index if not exists friend_invitations_unique_idx
  on public.friend_invitations (from_user_id, to_email) where status = 'pending';

create index if not exists friend_invitations_to_email_idx
  on public.friend_invitations (to_email, status);

create index if not exists friend_invitations_from_user_idx
  on public.friend_invitations (from_user_id, created_at desc);

create index if not exists friend_invitations_to_user_idx
  on public.friend_invitations (to_user_id, created_at desc);

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  other_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists friends_user_other_user_idx
  on public.friends (user_id, other_user_id);

create index if not exists friends_user_created_idx
  on public.friends (user_id, created_at desc);

create index if not exists friends_other_user_idx
  on public.friends (other_user_id);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references public.friends(id) on delete cascade,
  other_user_id uuid references auth.users(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  description text not null,
  type text not null check (type in ('owed_to_me', 'owed_by_me')),
  status text not null default 'pending' check (status in ('pending', 'payment_requested', 'paid')),
  created_at timestamptz not null default timezone('utc', now()),
  paid_at timestamptz,
  payment_request_rejected_at timestamptz,
  payment_request_rejected_by uuid references auth.users(id) on delete set null,
  payment_request_rejection_count integer not null default 0 check (payment_request_rejection_count >= 0)
);

alter table public.debts
  add column if not exists paid_at timestamptz;

alter table public.debts
  add column if not exists payment_request_rejected_at timestamptz;

alter table public.debts
  add column if not exists payment_request_rejected_by uuid references auth.users(id) on delete set null;

alter table public.debts
  add column if not exists payment_request_rejection_count integer not null default 0;

update public.debts
set payment_request_rejection_count = 0
where payment_request_rejection_count is null;

alter table public.debts
  drop constraint if exists debts_payment_request_rejection_count_check;

alter table public.debts
  add constraint debts_payment_request_rejection_count_check
  check (payment_request_rejection_count >= 0);

alter table public.debts
  drop constraint if exists debts_status_check;

alter table public.debts
  add constraint debts_status_check
  check (status in ('pending', 'payment_requested', 'paid'));

create index if not exists debts_user_created_idx
  on public.debts (user_id, created_at desc);

create index if not exists debts_friend_idx
  on public.debts (friend_id);

create index if not exists debts_other_user_idx
  on public.debts (other_user_id, created_at desc);

alter table public.friends enable row level security;
alter table public.friend_invitations enable row level security;
alter table public.debts enable row level security;

-- Function to get user_id by email
create or replace function public.get_user_id_by_email(email_input text)
returns uuid as $$
  select id from auth.users where email = email_input limit 1;
$$ language sql security definer;

-- Function to accept invitation and create bilateral friendship
create or replace function public.accept_friend_invitation(invitation_id uuid)
returns table (friend_id uuid, friend_name text) as $$
declare
  v_invitation record;
  v_friend1_id uuid;
  v_friend2_id uuid;
  v_current_user_id uuid;
  v_current_user_name text;
  v_current_user_email text;
  v_current_user_avatar text;
  v_inviter_avatar text;
begin
  -- Get current user
  v_current_user_id := auth.uid();
  
  if v_current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Get invitation details
  select * into v_invitation from public.friend_invitations where id = invitation_id;
  
  if v_invitation is null then
    raise exception 'Invitation not found';
  end if;

  -- Get inviter avatar for receiver-side friend record
  select (u.raw_user_meta_data->>'avatar_url')::text
  into v_inviter_avatar
  from auth.users u
  where u.id = v_invitation.from_user_id;

  -- Get current user profile to fill inviter-side friend record
  select
    coalesce((u.raw_user_meta_data->>'full_name')::text, split_part(u.email, '@', 1)),
    coalesce(u.email, ''),
    (u.raw_user_meta_data->>'avatar_url')::text
  into v_current_user_name, v_current_user_email, v_current_user_avatar
  from auth.users u
  where u.id = v_current_user_id;

  -- Create first friend record (current user -> inviter)
  insert into public.friends (user_id, other_user_id, name, email, avatar)
  values (
    v_current_user_id,
    v_invitation.from_user_id,
    v_invitation.inviter_name,
    v_invitation.inviter_email,
    v_inviter_avatar
  ) returning friends.id into v_friend1_id;

  -- Create second friend record (inviter -> current user)
  insert into public.friends (user_id, other_user_id, name, email, avatar)
  values (
    v_invitation.from_user_id,
    v_current_user_id,
    coalesce(v_invitation.invited_name, v_current_user_name, 'Amigo'),
    v_current_user_email,
    v_current_user_avatar
  ) returning friends.id into v_friend2_id;

  -- Update invitation status
  update public.friend_invitations
  set status = 'accepted'
  where id = invitation_id;

  return query select v_friend1_id, v_invitation.inviter_name;
end;
$$ language plpgsql security definer;

-- Debtor can only request payment confirmation. Creditor confirms final payment.
create or replace function public.request_debt_payment(debt_id_input uuid)
returns void as $$
declare
  v_debt public.debts%rowtype;
  v_current_user_id uuid;
  v_is_debtor boolean;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  select *
  into v_debt
  from public.debts
  where id = debt_id_input
  for update;

  if v_debt is null then
    raise exception 'Debt not found';
  end if;

  v_is_debtor :=
    (v_debt.type = 'owed_to_me' and v_debt.other_user_id = v_current_user_id)
    or
    (v_debt.type = 'owed_by_me' and v_debt.user_id = v_current_user_id);

  if not v_is_debtor then
    raise exception 'Only the debtor can request payment confirmation';
  end if;

  if v_debt.status <> 'pending' then
    raise exception 'This debt is not in a valid state for confirmation request';
  end if;

  update public.debts
  set status = 'payment_requested',
      paid_at = null,
      payment_request_rejected_at = null,
      payment_request_rejected_by = null
  where id = v_debt.id;
end;
$$ language plpgsql security definer;

create or replace function public.confirm_debt_payment(debt_id_input uuid)
returns void as $$
declare
  v_debt public.debts%rowtype;
  v_current_user_id uuid;
  v_is_creditor boolean;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  select *
  into v_debt
  from public.debts
  where id = debt_id_input
  for update;

  if v_debt is null then
    raise exception 'Debt not found';
  end if;

  v_is_creditor :=
    (v_debt.type = 'owed_to_me' and v_debt.user_id = v_current_user_id)
    or
    (v_debt.type = 'owed_by_me' and v_debt.other_user_id = v_current_user_id);

  if not v_is_creditor then
    raise exception 'Only the creditor can confirm the debt payment';
  end if;

  if v_debt.status = 'paid' then
    raise exception 'Debt is already marked as paid';
  end if;

  if v_debt.status not in ('pending', 'payment_requested') then
    raise exception 'This debt is not in a valid state for payment confirmation';
  end if;

  update public.debts
  set status = 'paid',
      paid_at = timezone('utc', now()),
      payment_request_rejected_at = null,
      payment_request_rejected_by = null
  where id = v_debt.id;
end;
$$ language plpgsql security definer;

create or replace function public.reject_debt_payment_request(debt_id_input uuid)
returns void as $$
declare
  v_debt public.debts%rowtype;
  v_current_user_id uuid;
  v_is_creditor boolean;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  select *
  into v_debt
  from public.debts
  where id = debt_id_input
  for update;

  if v_debt is null then
    raise exception 'Debt not found';
  end if;

  v_is_creditor :=
    (v_debt.type = 'owed_to_me' and v_debt.user_id = v_current_user_id)
    or
    (v_debt.type = 'owed_by_me' and v_debt.other_user_id = v_current_user_id);

  if not v_is_creditor then
    raise exception 'Only the creditor can reject the debt payment request';
  end if;

  if v_debt.status <> 'payment_requested' then
    raise exception 'This debt has no payment request to reject';
  end if;

  update public.debts
  set status = 'pending',
      paid_at = null,
      payment_request_rejected_at = timezone('utc', now()),
      payment_request_rejected_by = v_current_user_id,
      payment_request_rejection_count = coalesce(payment_request_rejection_count, 0) + 1
  where id = v_debt.id;
end;
$$ language plpgsql security definer;

revoke all on function public.request_debt_payment(uuid) from public;
grant execute on function public.request_debt_payment(uuid) to authenticated;

revoke all on function public.confirm_debt_payment(uuid) from public;
grant execute on function public.confirm_debt_payment(uuid) to authenticated;

revoke all on function public.reject_debt_payment_request(uuid) from public;
grant execute on function public.reject_debt_payment_request(uuid) to authenticated;

-- Friend Invitations Policies
drop policy if exists "invitations_select_own" on public.friend_invitations;
create policy "invitations_select_own"
  on public.friend_invitations
  for select
  using (
    auth.uid() = from_user_id 
    or auth.email() = to_email
    or auth.uid() = to_user_id
  );

drop policy if exists "invitations_insert_own" on public.friend_invitations;
create policy "invitations_insert_own"
  on public.friend_invitations
  for insert
  with check (auth.uid() = from_user_id);

drop policy if exists "invitations_update_own" on public.friend_invitations;
create policy "invitations_update_own"
  on public.friend_invitations
  for update
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

-- Friends Policies
drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own"
  on public.friends
  for select
  using (auth.uid() = user_id or auth.uid() = other_user_id);

drop policy if exists "friends_insert_own" on public.friends;
create policy "friends_insert_own"
  on public.friends
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "friends_update_own" on public.friends;
create policy "friends_update_own"
  on public.friends
  for update
  using (auth.uid() = user_id or auth.uid() = other_user_id)
  with check (auth.uid() = user_id or auth.uid() = other_user_id);

drop policy if exists "friends_delete_own" on public.friends;
create policy "friends_delete_own"
  on public.friends
  for delete
  using (auth.uid() = user_id or auth.uid() = other_user_id);

drop policy if exists "debts_select_own" on public.debts;
create policy "debts_select_own"
  on public.debts
  for select
  using (auth.uid() = user_id or auth.uid() = other_user_id);

drop policy if exists "debts_insert_own" on public.debts;
create policy "debts_insert_own"
  on public.debts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "debts_update_own" on public.debts;
drop policy if exists "debts_request_payment" on public.debts;
drop policy if exists "debts_confirm_payment" on public.debts;
-- No direct update policy for debts on purpose.
-- Status transitions must go through security definer RPC functions.

drop policy if exists "debts_delete_own" on public.debts;
create policy "debts_delete_own"
  on public.debts
  for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );