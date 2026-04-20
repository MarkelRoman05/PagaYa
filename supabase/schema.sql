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
  var_username text;
begin
  var_username := lower(nullif(trim((new.raw_user_meta_data->>'username')::text), ''));

  -- Never block auth signup because of malformed metadata.
  if var_username is not null and var_username !~ '^[a-z0-9_]{3,24}$' then
    var_username := null;
  end if;

  begin
    insert into public.user_profiles (user_id, username, updated_at)
    values (new.id, var_username::citext, timezone('utc', now()))
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
  var_username text;
begin
  var_username := lower(nullif(trim(username_input), ''));

  if var_username is null then
    return false;
  end if;

  if var_username !~ '^[a-z0-9_]{3,24}$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.user_profiles up
    where up.username = var_username::citext
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

create or replace function public.is_email_registered(email_input text)
returns boolean as $$
declare
  var_email text;
begin
  var_email := lower(nullif(trim(email_input), ''));

  if var_email is null then
    return false;
  end if;

  return exists (
    select 1
    from auth.users u
    where lower(u.email) = var_email
  );
end;
$$ language plpgsql security definer;

create or replace function public.update_my_username(username_input text)
returns void as $$
declare
  var_user_id uuid;
  var_username text;
begin
  var_user_id := auth.uid();

  if var_user_id is null then
    raise exception 'User not authenticated';
  end if;

  var_username := lower(nullif(trim(username_input), ''));

  if var_username is null or var_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'El nombre de usuario no cumple el formato permitido.';
  end if;

  if exists (
    select 1
    from public.user_profiles up
    where up.username = var_username::citext
      and up.user_id <> var_user_id
  ) then
    raise exception 'Este nombre de usuario ya está en uso.';
  end if;

  update auth.users u
  set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', var_username)
  where u.id = var_user_id;

  insert into public.user_profiles (user_id, username, updated_at)
  values (var_user_id, var_username::citext, timezone('utc', now()))
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

revoke all on function public.is_email_registered(text) from public;
grant execute on function public.is_email_registered(text) to anon, authenticated;

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
  with inv as (
    select fi.*
    from public.friend_invitations fi
    where fi.id = invitation_id
      and fi.status = 'pending'
      and (
        fi.to_user_id = auth.uid()
        or (fi.to_user_id is null and lower(coalesce(auth.email(), '')) = lower(fi.to_email))
      )
    for update
  ),
  me as (
    select
      auth.uid() as user_id,
      lower(nullif(trim((u.raw_user_meta_data->>'username')::text), '')) as username,
      coalesce((u.raw_user_meta_data->>'full_name')::text, split_part(u.email, '@', 1)) as name,
      coalesce(u.email, '') as email,
      (u.raw_user_meta_data->>'avatar_url')::text as avatar
    from auth.users u
    where u.id = auth.uid()
  ),
  inviter as (
    select
      u.id as user_id,
      lower(nullif(trim((u.raw_user_meta_data->>'username')::text), '')) as username,
      (u.raw_user_meta_data->>'avatar_url')::text as avatar
    from auth.users u
    join inv on inv.from_user_id = u.id
  ),
  inserted_receiver_side as (
    insert into public.friends (user_id, other_user_id, name, username, email, avatar)
    select
      me.user_id,
      inv.from_user_id,
      inv.inviter_name,
      coalesce(inv.inviter_username, inviter.username),
      inv.inviter_email,
      inviter.avatar
    from inv
    join me on true
    left join inviter on true
    returning id
  ),
  inserted_inviter_side as (
    insert into public.friends (user_id, other_user_id, name, username, email, avatar)
    select
      inv.from_user_id,
      me.user_id,
      coalesce(inv.invited_name, me.name, 'Amigo'),
      me.username,
      me.email,
      me.avatar
    from inv
    join me on true
    returning id
  ),
  updated as (
    update public.friend_invitations fi
    set status = 'accepted',
        updated_at = timezone('utc', now())
    where fi.id in (select id from inv)
    returning fi.id
  )
  select irs.id as friend_id, inv.inviter_name as friend_name
  from inserted_receiver_side irs
  cross join inv;
$$ language sql security definer;

-- Debtor can only request payment confirmation. Creditor confirms final payment.
create or replace function public.request_debt_payment(debt_id_input uuid)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  update public.debts
  set status = 'payment_requested',
      paid_at = null,
      payment_request_rejected_at = null,
      payment_request_rejected_by = null
  where id = debt_id_input
    and status = 'pending'
    and (
      (type = 'owed_to_me' and other_user_id = auth.uid())
      or
      (type = 'owed_by_me' and user_id = auth.uid())
    );

  if not found then
    raise exception 'Debt not found, not pending, or you are not allowed to request payment confirmation';
  end if;
end;
$$ language plpgsql security definer;

create or replace function public.confirm_debt_payment(debt_id_input uuid)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  update public.debts
  set status = 'paid',
      paid_at = timezone('utc', now()),
      payment_request_rejected_at = null,
      payment_request_rejected_by = null
  where id = debt_id_input
    and status in ('pending', 'payment_requested')
    and (
      (type = 'owed_to_me' and user_id = auth.uid())
      or
      (type = 'owed_by_me' and other_user_id = auth.uid())
    );

  if not found then
    raise exception 'Debt not found, not in a valid status, or you are not allowed to confirm payment';
  end if;
end;
$$ language plpgsql security definer;

create or replace function public.reject_debt_payment_request(debt_id_input uuid)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  update public.debts
  set status = 'pending',
      paid_at = null,
      payment_request_rejected_at = timezone('utc', now()),
      payment_request_rejected_by = auth.uid(),
      payment_request_rejection_count = coalesce(payment_request_rejection_count, 0) + 1
  where id = debt_id_input
    and status = 'payment_requested'
    and (
      (type = 'owed_to_me' and user_id = auth.uid())
      or
      (type = 'owed_by_me' and other_user_id = auth.uid())
    );

  if not found then
    raise exception 'Debt not found, no payment request exists, or you are not allowed to reject it';
  end if;
end;
$$ language plpgsql security definer;

create or replace function public.update_debt_details(
  debt_id_input uuid,
  description_input text default null,
  amount_input numeric default null,
  type_input text default null,
  friend_id_input uuid default null
)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  if description_input is not null and nullif(trim(description_input), '') is null then
    raise exception 'Debt description cannot be empty';
  end if;

  if amount_input is not null and amount_input <= 0 then
    raise exception 'Debt amount must be greater than zero';
  end if;

  if type_input is not null and type_input not in ('owed_to_me', 'owed_by_me') then
    raise exception 'Debt type is invalid';
  end if;

  if friend_id_input is not null then
    if not exists (
      select 1
      from public.friends f
      where f.id = friend_id_input
        and f.user_id = auth.uid()
    ) then
      raise exception 'Friend is invalid for this user';
    end if;
  end if;

  update public.debts
  set
    description = coalesce(nullif(trim(description_input), ''), description),
    amount = coalesce(amount_input, amount),
    type = coalesce(type_input, type),
    friend_id = coalesce(friend_id_input, friend_id),
    other_user_id = case
      when friend_id_input is not null then (
        select f.other_user_id
        from public.friends f
        where f.id = friend_id_input
          and f.user_id = auth.uid()
      )
      else other_user_id
    end
  where id = debt_id_input
    and user_id = auth.uid();

  if not found then
    raise exception 'Debt not found or you are not allowed to edit it';
  end if;
end;
$$ language plpgsql security definer;

revoke all on function public.request_debt_payment(uuid) from public;
grant execute on function public.request_debt_payment(uuid) to authenticated;

revoke all on function public.confirm_debt_payment(uuid) from public;
grant execute on function public.confirm_debt_payment(uuid) to authenticated;

revoke all on function public.reject_debt_payment_request(uuid) from public;
grant execute on function public.reject_debt_payment_request(uuid) to authenticated;

revoke all on function public.update_debt_details(uuid, text, numeric, text, uuid) from public;
grant execute on function public.update_debt_details(uuid, text, numeric, text, uuid) to authenticated;

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
    'debt_payment_rejected',
    'group_invitation_received',
    'group_invitation_accepted',
    'group_invitation_rejected',
    'group_expense_created',
    'group_share_settled'
  )),
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  push_enabled boolean not null default true,
  push_sent_at timestamptz,
  push_attempts integer not null default 0,
  push_last_error text
);

alter table public.user_notifications
  add column if not exists push_enabled boolean not null default true;

alter table public.user_notifications
  add column if not exists push_sent_at timestamptz;

alter table public.user_notifications
  add column if not exists push_attempts integer not null default 0;

alter table public.user_notifications
  add column if not exists push_last_error text;

alter table public.user_notifications
  drop constraint if exists user_notifications_type_check;

alter table public.user_notifications
  add constraint user_notifications_type_check
  check (type in (
    'invitation_received',
    'invitation_accepted',
    'invitation_rejected',
    'debt_created',
    'debt_payment_requested',
    'debt_paid',
    'debt_payment_rejected',
    'group_invitation_received',
    'group_invitation_accepted',
    'group_invitation_rejected',
    'group_expense_created',
    'group_share_settled'
  ));

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id, is_read, created_at desc);

create index if not exists user_notifications_push_pending_idx
  on public.user_notifications (created_at asc)
  where push_enabled is true and push_sent_at is null;

create or replace function public.create_user_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_metadata jsonb default '{}'::jsonb
)
returns void as $$
begin
  if target_user_id is null then
    return;
  end if;

  if to_regclass('public.user_settings') is null then
    insert into public.user_notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      push_enabled
    )
    values (
      target_user_id,
      notification_type,
      notification_title,
      notification_message,
      coalesce(notification_metadata, '{}'::jsonb),
      true
    );
    return;
  end if;

  insert into public.user_notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    push_enabled
  )
  select
    target_user_id,
    notification_type,
    notification_title,
    notification_message,
    coalesce(notification_metadata, '{}'::jsonb),
    (coalesce(us.notifications_enabled_app, true)
      and coalesce((us.notification_preferences -> notification_type ->> 'app')::boolean, true))
  from public.user_settings us
  where us.user_id = target_user_id
    and not (
      coalesce(us.notifications_enabled_web, true) is false
      and coalesce(us.notifications_enabled_app, true) is false
    )
    and (
      coalesce((us.notification_preferences -> notification_type ->> 'web')::boolean, true)
      or coalesce((us.notification_preferences -> notification_type ->> 'app')::boolean, true)
    );

  if not found and not exists (
    select 1
    from public.user_settings us
    where us.user_id = target_user_id
  ) then
    insert into public.user_notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      push_enabled
    )
    values (
      target_user_id,
      notification_type,
      notification_title,
      notification_message,
      coalesce(notification_metadata, '{}'::jsonb),
      true
    );
  end if;
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
begin
  if tg_op = 'INSERT' then
    if new.other_user_id is not null then
      perform public.create_user_notification(
        new.other_user_id,
        'debt_created',
        'Nueva deuda asignada',
        coalesce((
          select coalesce(
            nullif(trim((u.raw_user_meta_data->>'username')::text), ''),
            nullif(trim((u.raw_user_meta_data->>'full_name')::text), ''),
            split_part(u.email, '@', 1),
            'Un usuario'
          )
          from auth.users u
          where u.id = new.user_id
        ), 'Un usuario')
          || ' ha registrado una deuda para ti de '
          || replace(to_char(new.amount, 'FM999999990.00'), '.', ',')
          || '€ por "'
          || new.description
          || '".',
        jsonb_build_object(
          'debt_id', new.id,
          'creator_user_id', new.user_id,
          'creator_name', (
            select coalesce(
              nullif(trim((u.raw_user_meta_data->>'username')::text), ''),
              nullif(trim((u.raw_user_meta_data->>'full_name')::text), ''),
              split_part(u.email, '@', 1),
              'Un usuario'
            )
            from auth.users u
            where u.id = new.user_id
          ),
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
        case when new.type = 'owed_to_me' then new.user_id else new.other_user_id end,
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
        case when new.type = 'owed_to_me' then new.other_user_id else new.user_id end,
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
        case when new.type = 'owed_to_me' then new.other_user_id else new.user_id end,
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

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists groups_created_by_idx
  on public.groups (created_by_id, created_at desc);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  display_name text not null,
  username text,
  email text not null,
  avatar text,
  joined_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists group_members_group_user_idx
  on public.group_members (group_id, user_id);

create index if not exists group_members_group_role_idx
  on public.group_members (group_id, role, joined_at desc);

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  delivery_channel text not null default 'email' check (delivery_channel in ('email', 'whatsapp')),
  delivery_target text,
  to_username text,
  to_email text not null,
  to_user_id uuid references auth.users(id) on delete cascade,
  invited_name text not null,
  inviter_name text not null,
  inviter_username text,
  inviter_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists group_invitations_group_status_idx
  on public.group_invitations (group_id, status, created_at desc);

create index if not exists group_invitations_to_user_idx
  on public.group_invitations (to_user_id, status, created_at desc);

create unique index if not exists group_invitations_invite_token_idx
  on public.group_invitations (id);

create table if not exists public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_by_member_id uuid not null references public.group_members(id) on delete cascade,
  split_mode text not null default 'equal' check (split_mode in ('equal', 'custom')),
  icon text default '💰',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.group_expenses
add column if not exists icon text default '💰';

alter table public.group_expenses
  drop constraint if exists group_expenses_split_mode_check;

alter table public.group_expenses
  add constraint group_expenses_split_mode_check
  check (split_mode in ('equal', 'custom'));

create index if not exists group_expenses_group_idx
  on public.group_expenses (group_id, created_at desc);

create table if not exists public.group_expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.group_expenses(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  is_settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists group_expense_splits_expense_member_idx
  on public.group_expense_splits (expense_id, member_id);

create index if not exists group_expense_splits_member_state_idx
  on public.group_expense_splits (member_id, is_settled, created_at desc);

create or replace function public.create_group(
  name_input text,
  description_input text default null
)
returns table (
  id uuid,
  created_by_id uuid,
  name text,
  description text,
  created_at timestamptz,
  updated_at timestamptz
) as $$
  with me as (
    select
      u.id as user_id,
      coalesce(nullif(trim((u.raw_user_meta_data->>'full_name')::text), ''), split_part(u.email, '@', 1)) as display_name,
      lower(nullif(trim((u.raw_user_meta_data->>'username')::text), '')) as username,
      coalesce(u.email, '') as email,
      (u.raw_user_meta_data->>'avatar_url')::text as avatar
    from auth.users u
    where u.id = auth.uid()
  ),
  created_group as (
    insert into public.groups (created_by_id, name, description, updated_at)
    select
      me.user_id,
      trim(name_input),
      nullif(trim(description_input), ''),
      timezone('utc', now())
    from me
    where nullif(trim(name_input), '') is not null
    returning
      groups.id,
      groups.created_by_id,
      groups.name,
      groups.description,
      groups.created_at,
      groups.updated_at
  ),
  owner_member as (
    insert into public.group_members (
      group_id,
      user_id,
      role,
      display_name,
      username,
      email,
      avatar,
      updated_at
    )
    select
      cg.id,
      me.user_id,
      'owner',
      me.display_name,
      me.username,
      me.email,
      me.avatar,
      timezone('utc', now())
    from created_group cg
    join me on true
    returning id
  )
  select
    cg.id,
    cg.created_by_id,
    cg.name,
    cg.description,
    cg.created_at,
    cg.updated_at
  from created_group cg;
$$ language sql security definer;

create or replace function public.accept_group_invitation(invitation_id uuid)
returns table (
  id uuid,
  group_id uuid,
  user_id uuid,
  role text,
  display_name text,
  username text,
  email text,
  avatar text,
  joined_at timestamptz,
  updated_at timestamptz
) as $$
  with inv as (
    select gi.*
    from public.group_invitations gi
    where gi.id = invitation_id
      and gi.status = 'pending'
      and (
        gi.to_user_id = auth.uid()
        or (gi.to_user_id is null and lower(coalesce(auth.email(), '')) = lower(gi.to_email))
      )
    for update
  ),
  me as (
    select
      u.id as user_id,
      coalesce(nullif(trim((u.raw_user_meta_data->>'full_name')::text), ''), split_part(u.email, '@', 1)) as display_name,
      lower(nullif(trim((u.raw_user_meta_data->>'username')::text), '')) as username,
      coalesce(u.email, '') as email,
      (u.raw_user_meta_data->>'avatar_url')::text as avatar
    from auth.users u
    where u.id = auth.uid()
  ),
  inserted_member as (
    insert into public.group_members (
      group_id,
      user_id,
      role,
      display_name,
      username,
      email,
      avatar,
      updated_at
    )
    select
      inv.group_id,
      me.user_id,
      'member',
      me.display_name,
      me.username,
      me.email,
      me.avatar,
      timezone('utc', now())
    from inv
    join me on true
    on conflict (group_id, user_id)
    do update
      set updated_at = timezone('utc', now())
    returning
      group_members.id,
      group_members.group_id,
      group_members.user_id,
      group_members.role,
      group_members.display_name,
      group_members.username,
      group_members.email,
      group_members.avatar,
      group_members.joined_at,
      group_members.updated_at
  ),
  updated_inv as (
    update public.group_invitations gi
    set status = 'accepted',
        updated_at = timezone('utc', now())
    where gi.id in (select id from inv)
    returning gi.id
  )
  select
    im.id,
    im.group_id,
    im.user_id,
    im.role,
    im.display_name,
    im.username,
    im.email,
    im.avatar,
    im.joined_at,
    im.updated_at
  from inserted_member im;
$$ language sql security definer;

create or replace function public.get_group_invitation_public(invitation_id uuid)
returns table (
  invitation_id uuid,
  group_id uuid,
  group_name text,
  inviter_name text,
  invited_name text,
  delivery_channel text,
  status text,
  created_at timestamptz
) as $$
  select
    gi.id,
    gi.group_id,
    g.name,
    gi.inviter_name,
    gi.invited_name,
    gi.delivery_channel,
    gi.status,
    gi.created_at
  from public.group_invitations gi
  join public.groups g on g.id = gi.group_id
  where gi.id = invitation_id
  limit 1;
$$ language sql security definer;

create or replace function public.create_group_expense(
  group_id_input uuid,
  description_input text,
  amount_input numeric,
  paid_by_member_id_input uuid,
  split_mode_input text default 'equal',
  selected_member_ids_input uuid[] default null,
  custom_shares_input jsonb default null
)
returns table (
  id uuid,
  group_id uuid,
  created_by_id uuid,
  description text,
  amount numeric,
  paid_by_member_id uuid,
  split_mode text,
  created_at timestamptz,
  updated_at timestamptz
) as $$
declare
  var_current_user_id uuid;
  var_group public.groups%rowtype;
  var_current_member public.group_members%rowtype;
  var_payer_member public.group_members%rowtype;
  var_member_count integer;
  var_selected_member_ids uuid[];
  var_custom_total numeric(12, 2);
  var_share_amount numeric(12, 2);
  var_expense public.group_expenses%rowtype;
begin
  var_current_user_id := auth.uid();

  if var_current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  if nullif(trim(description_input), '') is null then
    raise exception 'Expense description cannot be empty';
  end if;

  if amount_input is null or amount_input <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;

  if split_mode_input is null or split_mode_input not in ('equal', 'custom') then
    raise exception 'Split mode is invalid';
  end if;

  select * into var_group
  from public.groups g
  where g.id = group_id_input;

  if (var_group).id is null then
    raise exception 'Group not found';
  end if;

  select * into var_current_member
  from public.group_members gm
  where gm.group_id = group_id_input
    and gm.user_id = var_current_user_id
  limit 1;

  if (var_current_member).id is null then
    raise exception 'You are not a member of this group';
  end if;

  select * into var_payer_member
  from public.group_members gm
  where gm.id = paid_by_member_id_input
    and gm.group_id = group_id_input
  limit 1;

  if (var_payer_member).id is null then
    raise exception 'The payer must belong to the group';
  end if;

  if split_mode_input = 'equal' then
    if selected_member_ids_input is null or cardinality(selected_member_ids_input) = 0 then
      select array_agg(gm.id order by gm.joined_at asc, gm.id asc) into var_selected_member_ids
      from public.group_members gm
      where gm.group_id = group_id_input;
    else
      select array_agg(distinct selected_id) into var_selected_member_ids
      from unnest(selected_member_ids_input) as selected_id;
    end if;

    if var_selected_member_ids is null or cardinality(var_selected_member_ids) = 0 then
      raise exception 'At least one member must be selected';
    end if;

    if exists (
      select 1
      from unnest(var_selected_member_ids) as selected_id
      where not exists (
        select 1
        from public.group_members gm
        where gm.id = selected_id
          and gm.group_id = group_id_input
      )
    ) then
      raise exception 'All selected members must belong to the group';
    end if;
  end if;

  if split_mode_input = 'custom' then
    if custom_shares_input is null or jsonb_typeof(custom_shares_input) <> 'array' then
      raise exception 'Custom shares must be provided as an array';
    end if;

    if jsonb_array_length(custom_shares_input) = 0 then
      raise exception 'Custom shares cannot be empty';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(custom_shares_input) as elem
      where (elem->>'member_id') is null
        or nullif(trim(elem->>'member_id'), '') is null
        or (elem->>'amount') is null
        or nullif(trim(elem->>'amount'), '') is null
    ) then
      raise exception 'Each custom share must include member_id and amount';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(custom_shares_input) as elem
      where not exists (
        select 1
        from public.group_members gm
        where gm.id = (elem->>'member_id')::uuid
          and gm.group_id = group_id_input
      )
    ) then
      raise exception 'All custom share members must belong to the group';
    end if;

    if exists (
      select 1
      from (
        select (elem->>'member_id')::uuid as member_id
        from jsonb_array_elements(custom_shares_input) as elem
      ) items
      group by member_id
      having count(*) > 1
    ) then
      raise exception 'Each member can only appear once in custom shares';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(custom_shares_input) as elem
      where round((elem->>'amount')::numeric, 2) < 0
    ) then
      raise exception 'Share amounts cannot be negative';
    end if;

    select round(coalesce(sum(round((elem->>'amount')::numeric, 2)), 0), 2) into var_custom_total
    from jsonb_array_elements(custom_shares_input) as elem;

    if var_custom_total <> round(amount_input::numeric, 2) then
      raise exception 'Custom shares must add up to the total expense amount';
    end if;
  end if;

  insert into public.group_expenses (
    group_id,
    created_by_id,
    description,
    amount,
    paid_by_member_id,
    split_mode,
    updated_at
  )
  values (
    group_id_input,
    var_current_user_id,
    trim(description_input),
    round(amount_input::numeric, 2),
    paid_by_member_id_input,
    split_mode_input,
    timezone('utc', now())
  )
  returning * into var_expense;

  if split_mode_input = 'equal' then
    select count(*) into var_member_count
    from unnest(var_selected_member_ids) as selected_id;

    if var_member_count is null or var_member_count = 0 then
      raise exception 'At least one member must be selected';
    end if;

    var_share_amount := round((amount_input::numeric / var_member_count::numeric), 2);

    with ordered_members as (
      select
        selected_id as member_id,
        row_number() over (order by selected_id asc) as member_rank,
        count(*) over () as member_total
      from unnest(var_selected_member_ids) as selected_id
    ),
    member_shares as (
      select
        member_id,
        case
          when member_rank = member_total then round(amount_input::numeric - (var_share_amount * (member_total - 1)), 2)
          else var_share_amount
        end as share_amount
      from ordered_members
    )
    insert into public.group_expense_splits (
      expense_id,
      group_id,
      member_id,
      share_amount,
      is_settled,
      settled_at,
      updated_at
    )
    select
      (var_expense).id,
      group_id_input,
      ms.member_id,
      ms.share_amount,
      (ms.member_id = paid_by_member_id_input),
      case when ms.member_id = paid_by_member_id_input then timezone('utc', now()) else null end,
      timezone('utc', now())
    from member_shares ms;
  else
    insert into public.group_expense_splits (
      expense_id,
      group_id,
      member_id,
      share_amount,
      is_settled,
      settled_at,
      updated_at
    )
    select
      (var_expense).id,
      group_id_input,
      (elem->>'member_id')::uuid,
      round((elem->>'amount')::numeric, 2),
      ((elem->>'member_id')::uuid = paid_by_member_id_input),
      case when (elem->>'member_id')::uuid = paid_by_member_id_input then timezone('utc', now()) else null end,
      timezone('utc', now())
    from jsonb_array_elements(custom_shares_input) as elem;
  end if;

  return query
    select
      (var_expense).id,
      (var_expense).group_id,
      (var_expense).created_by_id,
      (var_expense).description,
      (var_expense).amount,
      (var_expense).paid_by_member_id,
      (var_expense).split_mode,
      (var_expense).created_at,
      (var_expense).updated_at;
end;
$$ language plpgsql security definer;

create or replace function public.update_group_expense(
  expense_id_input uuid,
  description_input text,
  amount_input numeric,
  paid_by_member_id_input uuid,
  split_mode_input text default 'equal',
  selected_member_ids_input uuid[] default null,
  custom_shares_input jsonb default null
)
returns table (
  id uuid,
  group_id uuid,
  created_by_id uuid,
  description text,
  amount numeric,
  paid_by_member_id uuid,
  split_mode text,
  created_at timestamptz,
  updated_at timestamptz
) as $$
declare
  var_current_user_id uuid;
  var_expense public.group_expenses%rowtype;
  var_payer_member public.group_members%rowtype;
  var_selected_member_ids uuid[];
  var_member_count integer;
  var_custom_total numeric(12, 2);
  var_share_amount numeric(12, 2);
begin
  var_current_user_id := auth.uid();

  if var_current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  if nullif(trim(description_input), '') is null then
    raise exception 'Expense description cannot be empty';
  end if;

  if amount_input is null or amount_input <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;

  if split_mode_input is null or split_mode_input not in ('equal', 'custom') then
    raise exception 'Split mode is invalid';
  end if;

  select * into var_expense
  from public.group_expenses ge
  where ge.id = expense_id_input
  for update;

  if (var_expense).id is null then
    raise exception 'Expense not found';
  end if;

  if not (
    (var_expense).created_by_id = var_current_user_id
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = (var_expense).group_id
        and gm.user_id = var_current_user_id
        and gm.role in ('owner', 'admin')
    )
  ) then
    raise exception 'You are not allowed to edit this expense';
  end if;

  select * into var_payer_member
  from public.group_members gm
  where gm.id = paid_by_member_id_input
    and gm.group_id = (var_expense).group_id
  limit 1;

  if (var_payer_member).id is null then
    raise exception 'The payer must belong to the group';
  end if;

  if split_mode_input = 'equal' then
    if selected_member_ids_input is null or cardinality(selected_member_ids_input) = 0 then
      select array_agg(gm.id order by gm.joined_at asc, gm.id asc) into var_selected_member_ids
      from public.group_members gm
      where gm.group_id = (var_expense).group_id;
    else
      select array_agg(distinct selected_id) into var_selected_member_ids
      from unnest(selected_member_ids_input) as selected_id;
    end if;

    if var_selected_member_ids is null or cardinality(var_selected_member_ids) = 0 then
      raise exception 'At least one member must be selected';
    end if;

    if exists (
      select 1
      from unnest(var_selected_member_ids) as selected_id
      where not exists (
        select 1
        from public.group_members gm
        where gm.id = selected_id
          and gm.group_id = (var_expense).group_id
      )
    ) then
      raise exception 'All selected members must belong to the group';
    end if;
  end if;

  if split_mode_input = 'custom' then
    if custom_shares_input is null or jsonb_typeof(custom_shares_input) <> 'array' then
      raise exception 'Custom shares must be provided as an array';
    end if;

    if jsonb_array_length(custom_shares_input) = 0 then
      raise exception 'Custom shares cannot be empty';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(custom_shares_input) as elem
      where (elem->>'member_id') is null
        or nullif(trim(elem->>'member_id'), '') is null
        or (elem->>'amount') is null
        or nullif(trim(elem->>'amount'), '') is null
    ) then
      raise exception 'Each custom share must include member_id and amount';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(custom_shares_input) as elem
      where not exists (
        select 1
        from public.group_members gm
        where gm.id = (elem->>'member_id')::uuid
          and gm.group_id = (var_expense).group_id
      )
    ) then
      raise exception 'All custom share members must belong to the group';
    end if;

    if exists (
      select 1
      from (
        select (elem->>'member_id')::uuid as member_id
        from jsonb_array_elements(custom_shares_input) as elem
      ) items
      group by member_id
      having count(*) > 1
    ) then
      raise exception 'Each member can only appear once in custom shares';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(custom_shares_input) as elem
      where round((elem->>'amount')::numeric, 2) < 0
    ) then
      raise exception 'Share amounts cannot be negative';
    end if;

    select round(coalesce(sum(round((elem->>'amount')::numeric, 2)), 0), 2) into var_custom_total
    from jsonb_array_elements(custom_shares_input) as elem;

    if var_custom_total <> round(amount_input::numeric, 2) then
      raise exception 'Custom shares must add up to the total expense amount';
    end if;
  end if;

  update public.group_expenses ge
  set description = trim(description_input),
      amount = round(amount_input::numeric, 2),
      paid_by_member_id = paid_by_member_id_input,
      split_mode = split_mode_input,
      updated_at = timezone('utc', now())
  where ge.id = expense_id_input
  returning * into var_expense;

  delete from public.group_expense_splits ges
  where ges.expense_id = expense_id_input;

  if split_mode_input = 'equal' then
    select count(*) into var_member_count
    from unnest(var_selected_member_ids) as selected_id;

    if var_member_count is null or var_member_count = 0 then
      raise exception 'At least one member must be selected';
    end if;

    var_share_amount := round((amount_input::numeric / var_member_count::numeric), 2);

    with ordered_members as (
      select
        selected_id as member_id,
        row_number() over (order by selected_id asc) as member_rank,
        count(*) over () as member_total
      from unnest(var_selected_member_ids) as selected_id
    ),
    member_shares as (
      select
        member_id,
        case
          when member_rank = member_total then round(amount_input::numeric - (var_share_amount * (member_total - 1)), 2)
          else var_share_amount
        end as share_amount
      from ordered_members
    )
    insert into public.group_expense_splits (
      expense_id,
      group_id,
      member_id,
      share_amount,
      is_settled,
      settled_at,
      updated_at
    )
    select
      expense_id_input,
      (var_expense).group_id,
      ms.member_id,
      ms.share_amount,
      (ms.member_id = paid_by_member_id_input),
      case when ms.member_id = paid_by_member_id_input then timezone('utc', now()) else null end,
      timezone('utc', now())
    from member_shares ms;
  else
    insert into public.group_expense_splits (
      expense_id,
      group_id,
      member_id,
      share_amount,
      is_settled,
      settled_at,
      updated_at
    )
    select
      expense_id_input,
      (var_expense).group_id,
      (elem->>'member_id')::uuid,
      round((elem->>'amount')::numeric, 2),
      ((elem->>'member_id')::uuid = paid_by_member_id_input),
      case when (elem->>'member_id')::uuid = paid_by_member_id_input then timezone('utc', now()) else null end,
      timezone('utc', now())
    from jsonb_array_elements(custom_shares_input) as elem;
  end if;

  return query
    select
      (var_expense).id,
      (var_expense).group_id,
      (var_expense).created_by_id,
      (var_expense).description,
      (var_expense).amount,
      (var_expense).paid_by_member_id,
      (var_expense).split_mode,
      (var_expense).created_at,
      (var_expense).updated_at;
end;
$$ language plpgsql security definer;

create or replace function public.settle_group_expense_share(split_id_input uuid)
returns table (
  id uuid,
  expense_id uuid,
  group_id uuid,
  member_id uuid,
  share_amount numeric,
  is_settled boolean,
  settled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
) as $$
declare
  var_current_user_id uuid;
  var_split public.group_expense_splits%rowtype;
  var_member public.group_members%rowtype;
begin
  var_current_user_id := auth.uid();

  if var_current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  select * into var_split
  from public.group_expense_splits ges
  where ges.id = split_id_input
  for update;

  if (var_split).id is null then
    raise exception 'Split not found';
  end if;

  select * into var_member
  from public.group_members gm
  where gm.id = (var_split).member_id
    and gm.user_id = var_current_user_id
  limit 1;

  if (var_member).id is null then
    raise exception 'You can only settle your own split';
  end if;

  if (var_split).is_settled then
    return query
      select
        (var_split).id,
        (var_split).expense_id,
        (var_split).group_id,
        (var_split).member_id,
        (var_split).share_amount,
        (var_split).is_settled,
        (var_split).settled_at,
        (var_split).created_at,
        (var_split).updated_at;
    return;
  end if;

  update public.group_expense_splits ges
  set is_settled = true,
      settled_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where ges.id = split_id_input
  returning * into var_split;

  return query
    select
      (var_split).id,
      (var_split).expense_id,
      (var_split).group_id,
      (var_split).member_id,
      (var_split).share_amount,
      (var_split).is_settled,
      (var_split).settled_at,
      (var_split).created_at,
      (var_split).updated_at;
end;
$$ language plpgsql security definer;

create or replace function public.notify_on_group_invitation_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' and new.to_user_id is not null then
      perform public.create_user_notification(
        new.to_user_id,
        'group_invitation_received',
        'Nueva invitación a un grupo',
        coalesce(new.inviter_name, 'Un usuario') || ' te ha invitado al grupo ' || new.invited_name || '.',
        jsonb_build_object(
          'group_id', new.group_id,
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
        'group_invitation_accepted',
        'Invitación al grupo aceptada',
        coalesce(new.invited_name, 'Un usuario') || ' se ha unido al grupo ' || new.inviter_name || '.',
        jsonb_build_object(
          'group_id', new.group_id,
          'invitation_id', new.id,
          'from_user_id', new.from_user_id,
          'to_user_id', new.to_user_id
        )
      );
    elsif new.status = 'rejected' then
      perform public.create_user_notification(
        new.from_user_id,
        'group_invitation_rejected',
        'Invitación al grupo rechazada',
        coalesce(new.invited_name, 'Un usuario') || ' ha rechazado la invitación al grupo ' || new.inviter_name || '.',
        jsonb_build_object(
          'group_id', new.group_id,
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

create or replace function public.notify_on_group_expense_change()
returns trigger as $$
declare
  var_group_name text;
  var_payer_name text;
  var_amount_label text;
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;

  select name into var_group_name
  from public.groups
  where id = new.group_id;

  select display_name into var_payer_name
  from public.group_members
  where id = new.paid_by_member_id;

  var_amount_label := replace(to_char(new.amount, 'FM999999990.00'), '.', ',');

  perform public.create_user_notification(
    new.created_by_id,
    'group_expense_created',
    'Nuevo gasto compartido',
    coalesce(var_payer_name, 'Un miembro') || ' registró un gasto de ' || var_amount_label || '€ en ' || coalesce(var_group_name, 'el grupo') || '.',
    jsonb_build_object(
      'group_id', new.group_id,
      'expense_id', new.id,
      'paid_by_member_id', new.paid_by_member_id,
      'description', new.description,
      'amount', new.amount
    )
  );

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.notify_on_group_split_change()
returns trigger as $$
declare
  var_expense public.group_expenses%rowtype;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.is_settled is not distinct from new.is_settled or new.is_settled is false then
    return new;
  end if;

  select * into var_expense
  from public.group_expenses
  where id = new.expense_id;

  if (var_expense).id is null then
    return new;
  end if;

  perform public.create_user_notification(
    (var_expense).created_by_id,
    'group_share_settled',
    'Una parte del gasto fue pagada',
    'Una cuota del gasto "' || (var_expense).description || '" ha sido marcada como pagada.',
    jsonb_build_object(
      'group_id', new.group_id,
      'expense_id', new.expense_id,
      'split_id', new.id,
      'member_id', new.member_id,
      'share_amount', new.share_amount
    )
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_group_invitation_notify on public.group_invitations;
create trigger on_group_invitation_notify
after insert or update on public.group_invitations
for each row
execute function public.notify_on_group_invitation_change();

drop trigger if exists on_group_expense_notify on public.group_expenses;
create trigger on_group_expense_notify
after insert on public.group_expenses
for each row
execute function public.notify_on_group_expense_change();

drop trigger if exists on_group_split_notify on public.group_expense_splits;
create trigger on_group_split_notify
after update on public.group_expense_splits
for each row
execute function public.notify_on_group_split_change();

revoke all on function public.create_group(text, text) from public;
grant execute on function public.create_group(text, text) to authenticated;

revoke all on function public.accept_group_invitation(uuid) from public;
grant execute on function public.accept_group_invitation(uuid) to authenticated;

revoke all on function public.get_group_invitation_public(uuid) from public;
grant execute on function public.get_group_invitation_public(uuid) to anon, authenticated;

revoke all on function public.create_group_expense(uuid, text, numeric, uuid, text, uuid[], jsonb) from public;
grant execute on function public.create_group_expense(uuid, text, numeric, uuid, text, uuid[], jsonb) to authenticated;

revoke all on function public.update_group_expense(uuid, text, numeric, uuid, text, uuid[], jsonb) from public;
grant execute on function public.update_group_expense(uuid, text, numeric, uuid, text, uuid[], jsonb) to authenticated;

revoke all on function public.settle_group_expense_share(uuid) from public;
grant execute on function public.settle_group_expense_share(uuid) to authenticated;

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

create or replace function public.is_group_member(group_id_input uuid)
returns boolean as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_id_input
      and gm.user_id = auth.uid()
  );
$$ language sql security definer set search_path = public;

create or replace function public.is_group_admin(group_id_input uuid)
returns boolean as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_id_input
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  );
$$ language sql security definer set search_path = public;

create or replace function public.is_group_member_owner(member_id_input uuid)
returns boolean as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.id = member_id_input
      and gm.user_id = auth.uid()
  );
$$ language sql security definer set search_path = public;

revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;

revoke all on function public.is_group_admin(uuid) from public;
grant execute on function public.is_group_admin(uuid) to authenticated;

revoke all on function public.is_group_member_owner(uuid) from public;
grant execute on function public.is_group_member_owner(uuid) to authenticated;

-- Groups Policies
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;
alter table public.group_expenses enable row level security;
alter table public.group_expense_splits enable row level security;

drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member"
  on public.groups
  for select
  using (public.is_group_member(groups.id));

drop policy if exists "groups_insert_own" on public.groups;
create policy "groups_insert_own"
  on public.groups
  for insert
  with check (auth.uid() = created_by_id);

drop policy if exists "groups_update_admin" on public.groups;
create policy "groups_update_admin"
  on public.groups
  for update
  using (public.is_group_admin(groups.id))
  with check (public.is_group_admin(groups.id));

drop policy if exists "group_members_select_member" on public.group_members;
create policy "group_members_select_member"
  on public.group_members
  for select
  using (public.is_group_member(group_members.group_id));

drop policy if exists "group_members_insert_own" on public.group_members;
create policy "group_members_insert_own"
  on public.group_members
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "group_members_update_own_or_admin" on public.group_members;
create policy "group_members_update_own_or_admin"
  on public.group_members
  for update
  using (auth.uid() = user_id or public.is_group_admin(group_members.group_id))
  with check (auth.uid() = user_id or public.is_group_admin(group_members.group_id));

drop policy if exists "group_invitations_select_related" on public.group_invitations;
create policy "group_invitations_select_related"
  on public.group_invitations
  for select
  using (
    auth.uid() = from_user_id
    or auth.uid() = to_user_id
    or auth.email() = to_email
    or public.is_group_member(group_invitations.group_id)
  );

drop policy if exists "group_invitations_insert_own" on public.group_invitations;
create policy "group_invitations_insert_own"
  on public.group_invitations
  for insert
  with check (auth.uid() = from_user_id);

drop policy if exists "group_invitations_update_target" on public.group_invitations;
create policy "group_invitations_update_target"
  on public.group_invitations
  for update
  using (auth.uid() = to_user_id or auth.email() = to_email)
  with check (auth.uid() = to_user_id or auth.email() = to_email);

drop policy if exists "group_expenses_select_member" on public.group_expenses;
create policy "group_expenses_select_member"
  on public.group_expenses
  for select
  using (public.is_group_member(group_expenses.group_id));

drop policy if exists "group_expenses_insert_member" on public.group_expenses;
create policy "group_expenses_insert_member"
  on public.group_expenses
  for insert
  with check (
    auth.uid() = created_by_id
    and public.is_group_member(group_expenses.group_id)
  );

drop policy if exists "group_expenses_update_creator_or_admin" on public.group_expenses;
create policy "group_expenses_update_creator_or_admin"
  on public.group_expenses
  for update
  using (auth.uid() = created_by_id or public.is_group_admin(group_expenses.group_id))
  with check (auth.uid() = created_by_id or public.is_group_admin(group_expenses.group_id));

drop policy if exists "group_expense_splits_select_member" on public.group_expense_splits;
create policy "group_expense_splits_select_member"
  on public.group_expense_splits
  for select
  using (public.is_group_member(group_expense_splits.group_id));

drop policy if exists "group_expense_splits_insert_creator" on public.group_expense_splits;
create policy "group_expense_splits_insert_creator"
  on public.group_expense_splits
  for insert
  with check (
    exists (
      select 1
      from public.group_expenses ge
      where ge.id = group_expense_splits.expense_id
        and ge.created_by_id = auth.uid()
    )
  );

drop policy if exists "group_expense_splits_update_member" on public.group_expense_splits;
create policy "group_expense_splits_update_member"
  on public.group_expense_splits
  for update
  using (public.is_group_member_owner(group_expense_splits.member_id))
  with check (public.is_group_member_owner(group_expense_splits.member_id));

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
    "debt_payment_rejected": {"web": true, "app": true},
    "group_invitation_received": {"web": true, "app": true},
    "group_invitation_accepted": {"web": true, "app": true},
    "group_invitation_rejected": {"web": true, "app": true},
    "group_expense_created": {"web": true, "app": true},
    "group_share_settled": {"web": true, "app": true}
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
    "debt_payment_rejected": {"web": true, "app": true},
    "group_invitation_received": {"web": true, "app": true},
    "group_invitation_accepted": {"web": true, "app": true},
    "group_invitation_rejected": {"web": true, "app": true},
    "group_expense_created": {"web": true, "app": true},
    "group_share_settled": {"web": true, "app": true}
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