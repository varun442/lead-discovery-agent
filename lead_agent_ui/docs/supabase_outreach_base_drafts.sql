-- Run in Supabase SQL editor

create table if not exists public.outreach_base_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jd_hash text not null,
  resume_hash text not null,
  tone text not null default 'professional',
  company_name text,
  job_role text,
  subject_template text not null,
  body_template text not null,
  model_name text,
  created_at timestamptz not null default now()
);

create unique index if not exists outreach_base_drafts_user_hash_tone_uidx
  on public.outreach_base_drafts(user_id, jd_hash, resume_hash, tone);

create index if not exists outreach_base_drafts_user_created_idx
  on public.outreach_base_drafts(user_id, created_at desc);

alter table public.outreach_base_drafts enable row level security;

drop policy if exists "outreach_base_drafts_select_own" on public.outreach_base_drafts;
create policy "outreach_base_drafts_select_own"
on public.outreach_base_drafts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "outreach_base_drafts_insert_own" on public.outreach_base_drafts;
create policy "outreach_base_drafts_insert_own"
on public.outreach_base_drafts
for insert
to authenticated
with check (auth.uid() = user_id);
