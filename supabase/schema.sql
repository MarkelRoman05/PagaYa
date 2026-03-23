create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.friend_invitations (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_username text,
  to_email text not null,
  to_user_id uuid references auth.users(id) on delete cascade,
  invited_name text,
  inviter_name text not null,
  inviter_username text,
  inviter_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.friend_invitations
  add column if not exists invited_name text;

alter table public.friend_invitations
  add column if not exists to_username text;

alter table public.friend_invitations
  add column if not exists inviter_username text;

create unique index if not exists friend_invitations_unique_idx
  on public.friend_invitations (from_user_id, to_email) where status = 'pending';

create index if not exists friend_invitations_to_email_idx
  on public.friend_invitations (to_email, status);

create index if not exists friend_invitations_to_username_idx
  on public.friend_invitations (to_username, status);

create unique index if not exists friend_invitations_unique_user_idx
  on public.friend_invitations (from_user_id, to_user_id)
  where status = 'pending' and to_user_id is not null;

create index if not exists friend_invitations_from_user_idx
  on public.friend_invitations (from_user_id, created_at desc);

create index if not exists friend_invitations_to_user_idx
  on public.friend_invitations (to_user_id, created_at desc);

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  other_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  username text,
  email text not null,
  avatar text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.friends
  add column if not exists username text;

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

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username citext unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_profiles_username_format_check
    check (username is null or username::text ~ '^[a-z0-9_]{3,24}$')
);

create index if not exists user_profiles_username_idx
  on public.user_profiles (username);

drop function if exists public.sync_user_profile_from_auth_users() cascade;

create function public.sync_user_profile_from_auth_users()
returns trigger as $$
declare
  v_username text;
begin
  v_username := lower(nullif(trim((new.raw_user_meta_data->>'username')::text), ''));

  -- Never block auth signup because of malformed metadata.
  if v_username is not null and v_username !~ '^[a-z0-9_]{3,24}$' then
    v_username := null;
  end if;

  begin
    insert into public.user_profiles (user_id, username, updated_at)
    values (new.id, v_username::citext, timezone('utc', now()))
    on conflict (user_id)
    do update
      set username = excluded.username,
          updated_at = timezone('utc', now());
  exception
    when unique_violation then
      -- If username is already taken in a race/conflict, keep user account creation alive.
      insert into public.user_profiles (user_id, username, updated_at)
      values (new.id, null, timezone('utc', now()))
      on conflict (user_id)
      do update
        set updated_at = timezone('utc', now());
    when others then
      -- Any profile sync issue should not abort auth.users insert.
      insert into public.user_profiles (user_id, username, updated_at)
      values (new.id, null, timezone('utc', now()))
      on conflict (user_id)
      do update
        set updated_at = timezone('utc', now());
  end;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_upsert_profile on auth.users;
create trigger on_auth_user_upsert_profile
after insert or update of raw_user_meta_data on auth.users
for each row
execute function public.sync_user_profile_from_auth_users();

insert into public.user_profiles (user_id, username)
select
  u.id,
  lower(nullif(trim((u.raw_user_meta_data->>'username')::text), ''))::citext
from auth.users u
where (u.raw_user_meta_data->>'username') is not null
on conflict (user_id)
do update
  set username = excluded.username,
      updated_at = timezone('utc', now());

create or replace function public.is_username_available(username_input text)
returns boolean as $$
declare
  v_username text;
begin
  v_username := lower(nullif(trim(username_input), ''));

  if v_username is null then
    return false;
  end if;

  if v_username !~ '^[a-z0-9_]{3,24}$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.user_profiles up
    where up.username = v_username::citext
  );
end;
$$ language plpgsql security definer;

drop function if exists public.get_user_by_username(text);

create or replace function public.get_user_by_username(username_input text)
returns table (
  user_id uuid,
  username text,
  email text,
  avatar_url text
) as $$
  select
    u.id,
    up.username::text,
    u.email,
    (u.raw_user_meta_data->>'avatar_url')::text as avatar_url
  from public.user_profiles up
  join auth.users u on u.id = up.user_id
  where up.username = lower(trim(username_input))::citext
  limit 1;
$$ language sql security definer;

create or replace function public.update_my_username(username_input text)
returns void as $$
declare
  v_user_id uuid;
  v_username text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  v_username := lower(nullif(trim(username_input), ''));

  if v_username is null or v_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'El nombre de usuario no cumple el formato permitido.';
  end if;

  if exists (
    select 1
    from public.user_profiles up
    where up.username = v_username::citext
      and up.user_id <> v_user_id
  ) then
    raise exception 'Este nombre de usuario ya está en uso.';
  end if;

  update auth.users u
  set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', v_username)
  where u.id = v_user_id;

  insert into public.user_profiles (user_id, username, updated_at)
  values (v_user_id, v_username::citext, timezone('utc', now()))
  on conflict (user_id)
  do update
    set username = excluded.username,
        updated_at = timezone('utc', now());
end;
$$ language plpgsql security definer;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

revoke all on function public.get_user_by_username(text) from public;
grant execute on function public.get_user_by_username(text) to authenticated;

revoke all on function public.update_my_username(text) from public;
grant execute on function public.update_my_username(text) to authenticated;

alter table public.friends enable row level security;
alter table public.friend_invitations enable row level security;
alter table public.debts enable row level security;
alter table public.user_profiles enable row level security;

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
  v_current_user_username text;
  v_current_user_email text;
  v_current_user_avatar text;
  v_inviter_username text;
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
    lower(nullif(trim((u.raw_user_meta_data->>'username')::text), '')),
    coalesce((u.raw_user_meta_data->>'full_name')::text, split_part(u.email, '@', 1)),
    coalesce(u.email, ''),
    (u.raw_user_meta_data->>'avatar_url')::text
  into v_current_user_username, v_current_user_name, v_current_user_email, v_current_user_avatar
  from auth.users u
  where u.id = v_current_user_id;

  select lower(nullif(trim((u.raw_user_meta_data->>'username')::text), ''))
  into v_inviter_username
  from auth.users u
  where u.id = v_invitation.from_user_id;

  -- Create first friend record (current user -> inviter)
  insert into public.friends (user_id, other_user_id, name, username, email, avatar)
  values (
    v_current_user_id,
    v_invitation.from_user_id,
    v_invitation.inviter_name,
    coalesce(v_invitation.inviter_username, v_inviter_username),
    v_invitation.inviter_email,
    v_inviter_avatar
  ) returning friends.id into v_friend1_id;

  -- Create second friend record (inviter -> current user)
  insert into public.friends (user_id, other_user_id, name, username, email, avatar)
  values (
    v_invitation.from_user_id,
    v_current_user_id,
    coalesce(v_invitation.invited_name, v_current_user_name, 'Amigo'),
    v_current_user_username,
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

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'invitation_received',
    'invitation_accepted',
    'invitation_rejected',
    'debt_created',
    'debt_payment_requested',
    'debt_paid',
    'debt_payment_rejected'
  )),
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id, is_read, created_at desc);

create or replace function public.create_user_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_metadata jsonb default '{}'::jsonb
)
returns void as $$
declare
  v_preferences jsonb;
  v_web_enabled boolean;
  v_app_enabled boolean;
  v_global_web_enabled boolean;
  v_global_app_enabled boolean;
begin
  if target_user_id is null then
    return;
  end if;

  select
    notification_preferences,
    notifications_enabled_web,
    notifications_enabled_app
  into
    v_preferences,
    v_global_web_enabled,
    v_global_app_enabled
  from public.user_settings
  where user_id = target_user_id;

  if v_global_web_enabled is false and v_global_app_enabled is false then
    return;
  end if;

  if v_preferences is not null then
    v_web_enabled := coalesce((v_preferences -> notification_type ->> 'web')::boolean, true);
    v_app_enabled := coalesce((v_preferences -> notification_type ->> 'app')::boolean, true);

    if not v_web_enabled and not v_app_enabled then
      return;
    end if;
  end if;

  insert into public.user_notifications (
    user_id,
    type,
    title,
    message,
    metadata
  )
  values (
    target_user_id,
    notification_type,
    notification_title,
    notification_message,
    coalesce(notification_metadata, '{}'::jsonb)
  );
end;
$$ language plpgsql security definer;

create or replace function public.notify_on_friend_invitation_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' and new.to_user_id is not null then
      perform public.create_user_notification(
        new.to_user_id,
        'invitation_received',
        'Nueva invitación de amistad',
        coalesce(new.inviter_name, 'Un usuario') || ' te ha enviado una invitación.',
        jsonb_build_object(
          'invitation_id', new.id,
          'from_user_id', new.from_user_id,
          'to_user_id', new.to_user_id
        )
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'accepted' then
      perform public.create_user_notification(
        new.from_user_id,
        'invitation_accepted',
        'Invitación aceptada',
        coalesce(new.invited_name, 'Tu contacto') || ' ha aceptado tu invitación.',
        jsonb_build_object(
          'invitation_id', new.id,
          'from_user_id', new.from_user_id,
          'to_user_id', new.to_user_id
        )
      );
    elsif new.status = 'rejected' then
      perform public.create_user_notification(
        new.from_user_id,
        'invitation_rejected',
        'Invitación rechazada',
        coalesce(new.invited_name, 'Tu contacto') || ' ha rechazado tu invitación.',
        jsonb_build_object(
          'invitation_id', new.id,
          'from_user_id', new.from_user_id,
          'to_user_id', new.to_user_id
        )
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.notify_on_debt_change()
returns trigger as $$
declare
  v_creditor_id uuid;
  v_debtor_id uuid;
  v_creator_name text;
  v_amount_label text;
begin
  v_creditor_id := case when new.type = 'owed_to_me' then new.user_id else new.other_user_id end;
  v_debtor_id := case when new.type = 'owed_to_me' then new.other_user_id else new.user_id end;

  if tg_op = 'INSERT' then
    if new.other_user_id is not null then
      select
        coalesce(
          nullif(trim((u.raw_user_meta_data->>'username')::text), ''),
          nullif(trim((u.raw_user_meta_data->>'full_name')::text), ''),
          split_part(u.email, '@', 1),
          'Un usuario'
        )
      into v_creator_name
      from auth.users u
      where u.id = new.user_id;

      v_amount_label := replace(to_char(new.amount, 'FM999999990.00'), '.', ',');

      perform public.create_user_notification(
        new.other_user_id,
        'debt_created',
        'Nueva deuda asignada',
        coalesce(v_creator_name, 'Un usuario')
          || ' ha registrado una deuda para ti de '
          || v_amount_label
          || '€ por "'
          || new.description
          || '".',
        jsonb_build_object(
          'debt_id', new.id,
          'creator_user_id', new.user_id,
          'creator_name', v_creator_name,
          'other_user_id', new.other_user_id,
          'amount', new.amount,
          'description', new.description,
          'type', new.type
        )
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status and new.status = 'payment_requested' then
      perform public.create_user_notification(
        v_creditor_id,
        'debt_payment_requested',
        'Solicitud de confirmación de pago',
        'Tienes una deuda pendiente de confirmar: ' || new.description,
        jsonb_build_object(
          'debt_id', new.id,
          'status', new.status,
          'type', new.type
        )
      );
    elsif old.status is distinct from new.status and new.status = 'paid' then
      perform public.create_user_notification(
        v_debtor_id,
        'debt_paid',
        'Pago confirmado',
        'Se ha confirmado el pago de la deuda: ' || new.description,
        jsonb_build_object(
          'debt_id', new.id,
          'status', new.status,
          'type', new.type
        )
      );
    elsif old.status is distinct from new.status
      and old.status = 'payment_requested'
      and new.status = 'pending'
      and new.payment_request_rejection_count > coalesce(old.payment_request_rejection_count, 0) then
      perform public.create_user_notification(
        v_debtor_id,
        'debt_payment_rejected',
        'Solicitud de pago rechazada',
        'Tu solicitud de confirmar la deuda fue rechazada: ' || new.description,
        jsonb_build_object(
          'debt_id', new.id,
          'status', new.status,
          'type', new.type
        )
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_friend_invitation_notify on public.friend_invitations;
create trigger on_friend_invitation_notify
after insert or update on public.friend_invitations
for each row
execute function public.notify_on_friend_invitation_change();

drop trigger if exists on_debt_notify on public.debts;
create trigger on_debt_notify
after insert or update on public.debts
for each row
execute function public.notify_on_debt_change();

revoke all on function public.create_user_notification(uuid, text, text, text, jsonb) from public;

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

-- User settings (theme preferences and other per-user config)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  notifications_enabled_web boolean not null default true,
  notifications_enabled_app boolean not null default true,
  notification_preferences jsonb not null default '{
    "invitation_received": {"web": true, "app": true},
    "invitation_accepted": {"web": true, "app": true},
    "invitation_rejected": {"web": true, "app": true},
    "debt_created": {"web": true, "app": true},
    "debt_payment_requested": {"web": true, "app": true},
    "debt_paid": {"web": true, "app": true},
    "debt_payment_rejected": {"web": true, "app": true}
  }'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_settings
  add column if not exists notifications_enabled_web boolean not null default true;

alter table public.user_settings
  add column if not exists notifications_enabled_app boolean not null default true;

alter table public.user_settings
  add column if not exists notification_preferences jsonb not null default '{
    "invitation_received": {"web": true, "app": true},
    "invitation_accepted": {"web": true, "app": true},
    "invitation_rejected": {"web": true, "app": true},
    "debt_created": {"web": true, "app": true},
    "debt_payment_requested": {"web": true, "app": true},
    "debt_paid": {"web": true, "app": true},
    "debt_payment_rejected": {"web": true, "app": true}
  }'::jsonb;

alter table public.user_settings enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_settings_upsert_own" on public.user_settings;
create policy "user_settings_upsert_own"
  on public.user_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
  on public.user_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own"
  on public.user_notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_notifications_insert_own" on public.user_notifications;
create policy "user_notifications_insert_own"
  on public.user_notifications
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own"
  on public.user_notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_notifications_delete_own" on public.user_notifications;
create policy "user_notifications_delete_own"
  on public.user_notifications
  for delete
  using (auth.uid() = user_id);

create table if not exists public.user_device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  device_label text not null,
  browser text not null default 'Navegador',
  os text not null default 'Sistema desconocido',
  user_agent text,
  signed_in_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz
);

create unique index if not exists user_device_sessions_user_session_idx
  on public.user_device_sessions (user_id, session_id);

create index if not exists user_device_sessions_user_last_seen_idx
  on public.user_device_sessions (user_id, last_seen_at desc);

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios')),
  device_label text,
  session_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists user_push_tokens_user_token_idx
  on public.user_push_tokens (user_id, token);

create index if not exists user_push_tokens_user_active_idx
  on public.user_push_tokens (user_id, is_active, last_seen_at desc);

create index if not exists user_push_tokens_token_idx
  on public.user_push_tokens (token);

alter table public.user_device_sessions enable row level security;
alter table public.user_push_tokens enable row level security;

drop policy if exists "user_device_sessions_select_own" on public.user_device_sessions;
create policy "user_device_sessions_select_own"
  on public.user_device_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_device_sessions_insert_own" on public.user_device_sessions;
create policy "user_device_sessions_insert_own"
  on public.user_device_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_device_sessions_update_own" on public.user_device_sessions;
create policy "user_device_sessions_update_own"
  on public.user_device_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_push_tokens_select_own" on public.user_push_tokens;
create policy "user_push_tokens_select_own"
  on public.user_push_tokens
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_push_tokens_insert_own" on public.user_push_tokens;
create policy "user_push_tokens_insert_own"
  on public.user_push_tokens
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_push_tokens_update_own" on public.user_push_tokens;
create policy "user_push_tokens_update_own"
  on public.user_push_tokens
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_push_tokens_delete_own" on public.user_push_tokens;
create policy "user_push_tokens_delete_own"
  on public.user_push_tokens
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