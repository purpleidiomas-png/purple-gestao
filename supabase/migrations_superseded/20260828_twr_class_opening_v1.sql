-- Purple Gestão — tipagem de TWR e Abertura de Turmas.
-- PREPARADA NA FASE 1. NÃO EXECUTAR AUTOMATICAMENTE.

create table if not exists public.twr_teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  weekly_mode text not null default 'FIXA' check (weekly_mode in ('FIXA','FLEXIVEL')),
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','ENVIADO PARA VALIDAÇÃO','APROVADO','PUBLICADO')),
  break_start time,
  break_end time,
  published_at timestamptz,
  effective_from date,
  effective_to date,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, effective_from)
);

create table if not exists public.twr_schedule_windows (
  id uuid primary key default gen_random_uuid(),
  twr_profile_id uuid not null references public.twr_teacher_profiles(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO')),
  start_time time not null,
  end_time time not null,
  kind text not null default 'WORK' check (kind in ('WORK','BREAK')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.twr_activities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  twr_profile_id uuid references public.twr_teacher_profiles(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  activity_type text not null check (activity_type in ('REGULAR_CLASS','VIP_CLASS','TRIAL_CLASS','PLANNING','MAKEUP','REINFORCEMENT','MEETING','ADMIN_ACTIVITY','BREAK','ABSENCE')),
  status text not null default 'AGENDADO',
  day_of_week text check (day_of_week in ('SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO')),
  activity_date date,
  start_time time not null,
  end_time time not null,
  source text not null default 'MANUAL' check (source in ('CLASS_DERIVED','MANUAL','LEGACY_SETTINGS')),
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.twr_publication_history (
  id uuid primary key default gen_random_uuid(),
  twr_profile_id uuid not null references public.twr_teacher_profiles(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.class_opening_analyses (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('demand','time')),
  status text not null default 'EM ANÁLISE' check (status in ('EM ANÁLISE','EM FORMAÇÃO','CONFIRMADA','INICIADA','CANCELADA')),
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

create index if not exists twr_teacher_profiles_teacher_idx on public.twr_teacher_profiles(teacher_id, effective_from desc);
create index if not exists twr_activities_teacher_idx on public.twr_activities(teacher_id, activity_date, day_of_week);
create index if not exists twr_activities_class_idx on public.twr_activities(class_id);
create index if not exists twr_activities_student_idx on public.twr_activities(student_id);
create index if not exists class_opening_status_idx on public.class_opening_analyses(status, created_at desc);

drop trigger if exists twr_teacher_profiles_touch_updated_at on public.twr_teacher_profiles;
create trigger twr_teacher_profiles_touch_updated_at before update on public.twr_teacher_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists twr_schedule_windows_touch_updated_at on public.twr_schedule_windows;
create trigger twr_schedule_windows_touch_updated_at before update on public.twr_schedule_windows
for each row execute function public.touch_updated_at();

drop trigger if exists twr_activities_touch_updated_at on public.twr_activities;
create trigger twr_activities_touch_updated_at before update on public.twr_activities
for each row execute function public.touch_updated_at();

drop trigger if exists class_opening_analyses_touch_updated_at on public.class_opening_analyses;
create trigger class_opening_analyses_touch_updated_at before update on public.class_opening_analyses
for each row execute function public.touch_updated_at();
