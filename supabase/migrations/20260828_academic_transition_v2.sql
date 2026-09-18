-- Purple Gestão — Fase 2 — Acadêmico V2
-- PREPARADA. NÃO EXECUTAR NESTA FASE.
-- Estado-alvo desta migration: ESTADO B (tabelas criadas, legado ainda canônico).

create extension if not exists pgcrypto;

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  legacy_record_id text unique,
  name text not null,
  email text,
  phone text,
  workload text,
  classes_count integer not null default 0,
  score numeric(6,2),
  status text not null check (status in ('ATIVO','INATIVO')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  legacy_record_id text unique,
  name text not null,
  course text not null,
  category text not null,
  level text,
  class_number integer not null default 1,
  teacher_id uuid references public.teachers(id) on delete set null,
  room text,
  schedule_label text,
  capacity integer not null default 0,
  students_count integer not null default 0,
  module_hours integer,
  class_type text,
  book_legacy_ref text,
  start_date date,
  projected_end_date date,
  status text not null check (status in ('ATIVO','INATIVO')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  legacy_record_id text unique,
  code text not null,
  name text not null,
  full_name text,
  social_name text,
  document text,
  rg text,
  birth_date date,
  sex text,
  email text,
  phone text,
  whatsapp text,
  contact_phone text,
  guardian_name text,
  responsible_name text,
  class_id uuid references public.classes(id) on delete set null,
  status text not null check (status in ('ATIVO','INATIVO')),
  registration_date date,
  address_line text,
  address_number text,
  district text,
  city text,
  state text,
  zip_code text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teachers_status_idx on public.teachers(status);
create index if not exists classes_teacher_idx on public.classes(teacher_id);
create index if not exists classes_status_idx on public.classes(status);
create index if not exists students_class_idx on public.students(class_id);
create index if not exists students_status_idx on public.students(status);

drop trigger if exists teachers_touch_updated_at on public.teachers;
create trigger teachers_touch_updated_at before update on public.teachers
for each row execute function public.touch_updated_at();

drop trigger if exists classes_touch_updated_at on public.classes;
create trigger classes_touch_updated_at before update on public.classes
for each row execute function public.touch_updated_at();

drop trigger if exists students_touch_updated_at on public.students;
create trigger students_touch_updated_at before update on public.students
for each row execute function public.touch_updated_at();

alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;

drop policy if exists teachers_select_v2 on public.teachers;
create policy teachers_select_v2 on public.teachers
for select to authenticated
using (public.has_permission('panel.view'));

drop policy if exists teachers_write_v2 on public.teachers;
create policy teachers_write_v2 on public.teachers
for all to authenticated
using (public.is_direction() or not public.is_viewer())
with check (public.is_direction() or not public.is_viewer());

drop policy if exists classes_select_v2 on public.classes;
create policy classes_select_v2 on public.classes
for select to authenticated
using (public.has_permission('panel.view'));

drop policy if exists classes_write_v2 on public.classes;
create policy classes_write_v2 on public.classes
for all to authenticated
using (public.is_direction() or not public.is_viewer())
with check (public.is_direction() or not public.is_viewer());

drop policy if exists students_select_v2 on public.students;
create policy students_select_v2 on public.students
for select to authenticated
using (public.has_permission('panel.view'));

drop policy if exists students_write_v2 on public.students;
create policy students_write_v2 on public.students
for all to authenticated
using (public.is_direction() or not public.is_viewer())
with check (public.is_direction() or not public.is_viewer());

grant select, insert, update, delete on public.teachers to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.students to authenticated;
