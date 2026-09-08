create table if not exists public.ai_response_evaluations (
  id uuid primary key default gen_random_uuid(),
  evaluator_id uuid not null references auth.users(id) on delete cascade,
  test_name text not null,
  question text not null,
  response text not null,
  expected_keywords text[] not null default '{}',
  keyword_coverage numeric(5,2) not null default 0,
  retrieval_grounded boolean not null default false,
  sources_present boolean not null default false,
  score numeric(5,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.ai_response_evaluations enable row level security;

create policy "admins can read ai evaluations"
on public.ai_response_evaluations for select
using (exists (
  select 1 from public.users u
  where u.id = auth.uid() and u.role = 'admin' and u.is_active = true
));

create policy "admins can insert ai evaluations"
on public.ai_response_evaluations for insert
with check (evaluator_id = auth.uid() and exists (
  select 1 from public.users u
  where u.id = auth.uid() and u.role = 'admin' and u.is_active = true
));

create index if not exists ai_response_evaluations_created_at_idx
  on public.ai_response_evaluations(created_at desc);
