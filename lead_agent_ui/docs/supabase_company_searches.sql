-- Run in Supabase SQL editor

create table if not exists public.company_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  search_domain text not null,
  website_url text not null,
  linkedin_url text,
  company_name text,
  contacts_count integer not null default 0,
  status text not null check (status in ('success', 'error')),
  error_message text,
  last_searched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, search_domain)
);

create index if not exists company_search_history_user_updated_idx
  on public.company_search_history(user_id, updated_at desc);

create or replace function public.set_company_search_history_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_company_search_history_updated_at on public.company_search_history;
create trigger trg_company_search_history_updated_at
before update on public.company_search_history
for each row execute procedure public.set_company_search_history_updated_at();

alter table public.company_search_history enable row level security;

drop policy if exists "company_search_history_select_own" on public.company_search_history;
create policy "company_search_history_select_own"
on public.company_search_history
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "company_search_history_insert_own" on public.company_search_history;
create policy "company_search_history_insert_own"
on public.company_search_history
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "company_search_history_update_own" on public.company_search_history;
create policy "company_search_history_update_own"
on public.company_search_history
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "company_search_history_delete_own" on public.company_search_history;
create policy "company_search_history_delete_own"
on public.company_search_history
for delete
to authenticated
using (auth.uid() = user_id);
