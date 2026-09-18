-- Purple Gestão — Fase 2 — Integrated Cases V2
-- PREPARADA. NÃO EXECUTAR NESTA FASE.
-- Preserva o legado `app_records(kind='case')` e modela a entidade tipada com rastreabilidade.

create table if not exists public.integrated_cases (
  id uuid primary key default gen_random_uuid(),
  legacy_record_id text not null unique,
  student_name text not null,
  course text not null default '',
  group_name text not null default '',
  owner_name text not null default '',
  next_step text not null default '',
  deadline date,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integrated_case_sector_details (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.integrated_cases(id) on delete cascade,
  sector text not null check (sector in ('retencao','pedagogico','financeiro')),
  level text not null default 'good' check (level in ('good','warn','bad')),
  summary text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (case_id, sector)
);

create index if not exists integrated_cases_updated_at_idx
  on public.integrated_cases(updated_at desc);

create index if not exists integrated_case_sector_details_sector_idx
  on public.integrated_case_sector_details(sector, level, updated_at desc);

drop trigger if exists integrated_cases_touch_updated_at on public.integrated_cases;
create trigger integrated_cases_touch_updated_at before update on public.integrated_cases
for each row execute function public.touch_updated_at();

drop trigger if exists integrated_case_sector_details_touch_updated_at on public.integrated_case_sector_details;
create trigger integrated_case_sector_details_touch_updated_at before update on public.integrated_case_sector_details
for each row execute function public.touch_updated_at();

alter table public.integrated_cases enable row level security;
alter table public.integrated_case_sector_details enable row level security;

drop policy if exists integrated_cases_read_v2 on public.integrated_cases;
create policy integrated_cases_read_v2 on public.integrated_cases
for select to authenticated
using (public.has_permission('cases.view'));

drop policy if exists integrated_case_sector_details_read_v2 on public.integrated_case_sector_details;
create policy integrated_case_sector_details_read_v2 on public.integrated_case_sector_details
for select to authenticated
using (
  public.has_permission('cases.view')
  and (
    public.is_direction()
    or public.is_viewer()
    or sector = public.my_sector()
  )
);

grant select on public.integrated_cases to authenticated;
grant select on public.integrated_case_sector_details to authenticated;
