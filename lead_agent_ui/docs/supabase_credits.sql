-- Run in Supabase SQL editor

create table if not exists public.user_credit_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(10,2) not null default 10.00,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_created_idx
  on public.credit_transactions(user_id, created_at desc);

alter table public.user_credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;

drop policy if exists "wallets_select_own" on public.user_credit_wallets;
create policy "wallets_select_own"
on public.user_credit_wallets
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "tx_select_own" on public.credit_transactions;
create policy "tx_select_own"
on public.credit_transactions
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.create_default_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credit_wallets (user_id, balance)
  values (new.id, 10.00)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_wallet on auth.users;
create trigger on_auth_user_created_wallet
after insert on auth.users
for each row execute procedure public.create_default_wallet();

create or replace function public.consume_credits(
  p_user_id uuid,
  p_amount numeric,
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(success boolean, balance numeric, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance numeric(10,2);
  new_balance numeric(10,2);
begin
  if p_amount <= 0 then
    return query select false, 0::numeric, 'Invalid credit amount';
    return;
  end if;

  insert into public.user_credit_wallets (user_id, balance)
  values (p_user_id, 10.00)
  on conflict (user_id) do nothing;

  select w.balance into current_balance
  from public.user_credit_wallets w
  where w.user_id = p_user_id
  for update;

  if current_balance < p_amount then
    return query select false, current_balance, 'Insufficient credits';
    return;
  end if;

  new_balance := round((current_balance - p_amount)::numeric, 2);

  update public.user_credit_wallets
  set balance = new_balance, updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, event_type, metadata)
  values (p_user_id, -p_amount, p_event_type, coalesce(p_metadata, '{}'::jsonb));

  return query select true, new_balance, null::text;
end;
$$;

grant execute on function public.consume_credits(uuid, numeric, text, jsonb) to authenticated;

-- Backfill wallet for existing users
insert into public.user_credit_wallets (user_id, balance)
select id, 10.00
from auth.users
on conflict (user_id) do nothing;
