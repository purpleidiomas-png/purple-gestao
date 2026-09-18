-- Purple Gestão — Fase 2 — Student Follow-ups V2
-- PREPARADA. NÃO EXECUTAR NESTA FASE.
-- O backfill inicial esperado é zero porque os 23 eventos reais observados são acadêmicos, não follow-up humano.

create table if not exists public.student_followups (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  legacy_record_id text,
  source_module text not null check (source_module in ('MANUAL','WHATSAPP','TWR','FINANCIAL','CASE','OTHER')),
  source_ref text,
  contact_at timestamptz not null,
  employee_name text,
  subject text not null,
  result text,
  next_contact_date date,
  done boolean not null default true,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_followups_student_idx
  on public.student_followups(student_id, contact_at desc);

drop trigger if exists student_followups_touch_updated_at on public.student_followups;
create trigger student_followups_touch_updated_at before update on public.student_followups
for each row execute function public.touch_updated_at();

alter table public.student_followups enable row level security;

drop policy if exists student_followups_select_v2 on public.student_followups;
create policy student_followups_select_v2 on public.student_followups
for select to authenticated
using (public.has_permission('panel.view'));

drop policy if exists student_followups_write_v2 on public.student_followups;
create policy student_followups_write_v2 on public.student_followups
for all to authenticated
using (public.is_direction() or not public.is_viewer())
with check (public.is_direction() or not public.is_viewer());

grant select, insert, update, delete on public.student_followups to authenticated;
