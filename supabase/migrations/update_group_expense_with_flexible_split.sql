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

revoke all on function public.update_group_expense(uuid, text, numeric, uuid, text, uuid[], jsonb) from public;
grant execute on function public.update_group_expense(uuid, text, numeric, uuid, text, uuid[], jsonb) to authenticated;
