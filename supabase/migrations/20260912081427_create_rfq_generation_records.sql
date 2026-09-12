create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  pr_no varchar not null unique references public.purchase_requests(pr_no) on delete cascade,
  template_type varchar not null check (template_type in ('less_than_50k', 'more_than_50k')),
  reference_no varchar not null,
  project_name text not null,
  location text not null default '',
  rfq_date date not null default current_date,
  generated_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rfqs_pr_no on public.rfqs(pr_no);
create index if not exists idx_rfqs_generated_by on public.rfqs(generated_by);

alter table public.rfqs enable row level security;

revoke all on table public.rfqs from anon, authenticated;

drop policy if exists rfqs_admin_select on public.rfqs;
drop policy if exists rfqs_admin_insert on public.rfqs;
drop policy if exists rfqs_admin_update on public.rfqs;
drop policy if exists rfqs_admin_delete on public.rfqs;

create policy rfqs_admin_select
on public.rfqs for select to authenticated
using (private.is_admin());

create policy rfqs_admin_insert
on public.rfqs for insert to authenticated
with check (private.is_admin() and generated_by = auth.uid());

create policy rfqs_admin_update
on public.rfqs for update to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy rfqs_admin_delete
on public.rfqs for delete to authenticated
using (private.is_admin());

create or replace function public.touch_rfqs_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_rfqs_updated_at on public.rfqs;
create trigger trg_rfqs_updated_at
before update on public.rfqs
for each row execute function public.touch_rfqs_updated_at();

grant select, insert, update, delete on table public.rfqs to authenticated;
