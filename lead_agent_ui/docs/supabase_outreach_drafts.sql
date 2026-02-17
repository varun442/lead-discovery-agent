-- Run in Supabase SQL editor

create table if not exists public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_name text,
  contact_title text,
  contact_email text not null,
  company_name text,
  job_role text,
  job_source_url text,
  subject text,
  draft_body text,
  status text not null default 'generated',
  model_name text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists outreach_drafts_user_created_idx
  on public.outreach_drafts(user_id, created_at desc);

alter table public.outreach_drafts enable row level security;

drop policy if exists "outreach_drafts_select_own" on public.outreach_drafts;
create policy "outreach_drafts_select_own"
on public.outreach_drafts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "outreach_drafts_insert_own" on public.outreach_drafts;
create policy "outreach_drafts_insert_own"
on public.outreach_drafts
for insert
to authenticated
with check (auth.uid() = user_id);

-- Optional: daily usage view
create or replace view public.outreach_daily_usage as
select
  user_id,
  (created_at at time zone 'utc')::date as day_utc,
  count(*) as drafts_count,
  coalesce(sum(total_tokens), 0) as total_tokens
from public.outreach_drafts
group by user_id, (created_at at time zone 'utc')::date;
