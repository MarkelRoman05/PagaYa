-- Add icon column to group_expenses table
alter table public.group_expenses
add column if not exists icon text default '💰';
