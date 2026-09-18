create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  status text not null default 'ATIVO' check (status in ('ATIVO','INATIVO')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  course text not null,
  category text not null check (category in ('INFANTIL','YOUNG','ADULTO')),
  level text,
  "classNumber" integer not null default 1,
  name text not null unique,
  teacher_id uuid references public.teachers(id) on delete set null,
  max_students integer not null default 0,
  status text not null default 'ATIVO' check (status in ('ATIVO','INATIVO')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  class_id uuid references public.classes(id) on delete set null,
  status text not null default 'ATIVO' check (status in ('ATIVO','INATIVO')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teachers_status_idx on public.teachers(status);
create index if not exists classes_course_level_idx on public.classes(course, level);
create index if not exists classes_teacher_idx on public.classes(teacher_id);
create index if not exists students_class_idx on public.students(class_id);
create index if not exists students_status_idx on public.students(status);

drop trigger if exists teachers_touch_updated_at on public.teachers;
create trigger teachers_touch_updated_at
before update on public.teachers
for each row execute function public.touch_updated_at();

drop trigger if exists classes_touch_updated_at on public.classes;
create trigger classes_touch_updated_at
before update on public.classes
for each row execute function public.touch_updated_at();

drop trigger if exists students_touch_updated_at on public.students;
create trigger students_touch_updated_at
before update on public.students
for each row execute function public.touch_updated_at();

alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;

drop policy if exists "teachers authenticated select" on public.teachers;
create policy "teachers authenticated select" on public.teachers
for select to authenticated using (true);

drop policy if exists "teachers authenticated write" on public.teachers;
create policy "teachers authenticated write" on public.teachers
for all to authenticated using (public.is_direction() or not public.is_viewer())
with check (public.is_direction() or not public.is_viewer());

drop policy if exists "classes authenticated select" on public.classes;
create policy "classes authenticated select" on public.classes
for select to authenticated using (true);

drop policy if exists "classes authenticated write" on public.classes;
create policy "classes authenticated write" on public.classes
for all to authenticated using (public.is_direction() or not public.is_viewer())
with check (public.is_direction() or not public.is_viewer());

drop policy if exists "students authenticated select" on public.students;
create policy "students authenticated select" on public.students
for select to authenticated using (true);

drop policy if exists "students authenticated write" on public.students;
create policy "students authenticated write" on public.students
for all to authenticated using (public.is_direction() or not public.is_viewer())
with check (public.is_direction() or not public.is_viewer());

grant select, insert, update, delete on public.teachers to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.students to authenticated;
