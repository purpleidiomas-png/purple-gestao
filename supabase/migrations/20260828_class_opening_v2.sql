-- Purple Gestão — Fase 2 — Class Opening V2
-- PREPARADA. NÃO EXECUTAR NESTA FASE.
-- Implantação nova; vínculo com classe acadêmica é opcional e sem duplicação.

create table if not exists public.class_opening_analyses (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('demand','time')),
  status text not null default 'EM_ANALISE' check (status in ('EM_ANALISE','EM_FORMACAO','CONFIRMADA','INICIADA','CANCELADA')),
  requested_course text,
  requested_level text,
  requested_day text check (requested_day in ('SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO')),
  requested_time time,
  interested_count integer not null default 0,
  minimum_students integer not null default 0,
  notes text,
  exception_justification text,
  linked_class_id uuid references public.classes(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_opening_checklist (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.class_opening_analyses(id) on delete cascade,
  item_key text not null,
  item_label text not null,
  checked boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references public.profiles(id) on delete set null,
  unique (analysis_id, item_key)
);

create table if not exists public.class_opening_history (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.class_opening_analyses(id) on delete cascade,
  action text not null,
  detail text,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists class_opening_status_idx on public.class_opening_analyses(status, created_at desc);

drop trigger if exists class_opening_analyses_touch_updated_at on public.class_opening_analyses;
create trigger class_opening_analyses_touch_updated_at before update on public.class_opening_analyses
for each row execute function public.touch_updated_at();

alter table public.class_opening_analyses enable row level security;
alter table public.class_opening_checklist enable row level security;
alter table public.class_opening_history enable row level security;

drop policy if exists class_opening_analyses_select_v2 on public.class_opening_analyses;
create policy class_opening_analyses_select_v2 on public.class_opening_analyses
for select to authenticated
using (public.has_permission('class_opening.manage') or public.has_permission('panel.view'));

drop policy if exists class_opening_analyses_write_v2 on public.class_opening_analyses;
create policy class_opening_analyses_write_v2 on public.class_opening_analyses
for all to authenticated
using (public.has_permission('class_opening.manage'))
with check (public.has_permission('class_opening.manage'));

drop policy if exists class_opening_checklist_select_v2 on public.class_opening_checklist;
create policy class_opening_checklist_select_v2 on public.class_opening_checklist
for select to authenticated
using (public.has_permission('class_opening.manage') or public.has_permission('panel.view'));

drop policy if exists class_opening_checklist_write_v2 on public.class_opening_checklist;
create policy class_opening_checklist_write_v2 on public.class_opening_checklist
for all to authenticated
using (public.has_permission('class_opening.manage'))
with check (public.has_permission('class_opening.manage'));

drop policy if exists class_opening_history_select_v2 on public.class_opening_history;
create policy class_opening_history_select_v2 on public.class_opening_history
for select to authenticated
using (public.has_permission('class_opening.manage') or public.has_permission('panel.view'));

grant select, insert, update, delete on public.class_opening_analyses to authenticated;
grant select, insert, update, delete on public.class_opening_checklist to authenticated;
grant select on public.class_opening_history to authenticated;
