-- Purple Academy — R.A.P.I.D. Teacher Certification
-- Estrutura isolada do módulo de treinamento, preservando o contrato legado do Purple Gestão.

create extension if not exists pgcrypto;

create table if not exists public.rapid_enrollments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  status text not null default 'assigned' check (status in ('assigned','in_progress','training_completed','certified','paused')),
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  certified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id)
);

create table if not exists public.rapid_module_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.rapid_enrollments(id) on delete cascade,
  module_key text not null,
  status text not null default 'in_progress' check (status in ('todo','in_progress','review','completed')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  score numeric(5,2) check (score is null or (score between 0 and 100)),
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, module_key)
);

create table if not exists public.rapid_microclasses (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.rapid_enrollments(id) on delete cascade,
  submission_url text not null,
  teacher_notes text,
  status text not null default 'submitted' check (status in ('submitted','approved','changes_requested')),
  rubric_scores jsonb not null default '{}'::jsonb,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rapid_module_media (
  module_key text primary key,
  video_title text,
  video_url text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rapid_enrollments_status_idx on public.rapid_enrollments(status);
create index if not exists rapid_progress_enrollment_idx on public.rapid_module_progress(enrollment_id);
create index if not exists rapid_microclasses_status_idx on public.rapid_microclasses(status);

create or replace function public.rapid_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.rapid_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
      and role = 'direction'
  );
$$;

create or replace function public.rapid_owns_enrollment(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.rapid_enrollments
    where id = target
      and teacher_id = auth.uid()
  );
$$;

drop trigger if exists rapid_enrollments_touch on public.rapid_enrollments;
create trigger rapid_enrollments_touch before update on public.rapid_enrollments
for each row execute function public.rapid_touch_updated_at();

drop trigger if exists rapid_module_progress_touch on public.rapid_module_progress;
create trigger rapid_module_progress_touch before update on public.rapid_module_progress
for each row execute function public.rapid_touch_updated_at();

drop trigger if exists rapid_microclasses_touch on public.rapid_microclasses;
create trigger rapid_microclasses_touch before update on public.rapid_microclasses
for each row execute function public.rapid_touch_updated_at();

drop trigger if exists rapid_module_media_touch on public.rapid_module_media;
create trigger rapid_module_media_touch before update on public.rapid_module_media
for each row execute function public.rapid_touch_updated_at();

alter table public.rapid_enrollments enable row level security;
alter table public.rapid_module_progress enable row level security;
alter table public.rapid_microclasses enable row level security;
alter table public.rapid_module_media enable row level security;

drop policy if exists rapid_enrollments_read on public.rapid_enrollments;
create policy rapid_enrollments_read on public.rapid_enrollments for select
using (public.rapid_is_admin() or teacher_id = auth.uid());

drop policy if exists rapid_enrollments_insert on public.rapid_enrollments;
create policy rapid_enrollments_insert on public.rapid_enrollments for insert
with check (public.rapid_is_admin());

drop policy if exists rapid_enrollments_update on public.rapid_enrollments;
create policy rapid_enrollments_update on public.rapid_enrollments for update
using (public.rapid_is_admin()) with check (public.rapid_is_admin());

drop policy if exists rapid_enrollments_delete on public.rapid_enrollments;
create policy rapid_enrollments_delete on public.rapid_enrollments for delete
using (public.rapid_is_admin());

drop policy if exists rapid_progress_read on public.rapid_module_progress;
create policy rapid_progress_read on public.rapid_module_progress for select
using (public.rapid_is_admin() or public.rapid_owns_enrollment(enrollment_id));

drop policy if exists rapid_progress_insert on public.rapid_module_progress;
create policy rapid_progress_insert on public.rapid_module_progress for insert
with check (public.rapid_is_admin() or public.rapid_owns_enrollment(enrollment_id));

drop policy if exists rapid_progress_update on public.rapid_module_progress;
create policy rapid_progress_update on public.rapid_module_progress for update
using (public.rapid_is_admin() or public.rapid_owns_enrollment(enrollment_id))
with check (public.rapid_is_admin() or public.rapid_owns_enrollment(enrollment_id));

drop policy if exists rapid_progress_delete on public.rapid_module_progress;
create policy rapid_progress_delete on public.rapid_module_progress for delete
using (public.rapid_is_admin());

drop policy if exists rapid_microclasses_read on public.rapid_microclasses;
create policy rapid_microclasses_read on public.rapid_microclasses for select
using (public.rapid_is_admin() or public.rapid_owns_enrollment(enrollment_id));

drop policy if exists rapid_microclasses_insert on public.rapid_microclasses;
create policy rapid_microclasses_insert on public.rapid_microclasses for insert
with check (
  public.rapid_is_admin()
  or (
    public.rapid_owns_enrollment(enrollment_id)
    and status = 'submitted'
    and reviewer_id is null
    and reviewer_notes is null
    and reviewed_at is null
    and rubric_scores = '{}'::jsonb
  )
);

drop policy if exists rapid_microclasses_update on public.rapid_microclasses;
create policy rapid_microclasses_update on public.rapid_microclasses for update
using (
  public.rapid_is_admin()
  or (public.rapid_owns_enrollment(enrollment_id) and status <> 'approved')
)
with check (
  public.rapid_is_admin()
  or (
    public.rapid_owns_enrollment(enrollment_id)
    and status = 'submitted'
    and reviewer_id is null
    and reviewer_notes is null
    and reviewed_at is null
    and rubric_scores = '{}'::jsonb
  )
);

drop policy if exists rapid_microclasses_delete on public.rapid_microclasses;
create policy rapid_microclasses_delete on public.rapid_microclasses for delete
using (
  public.rapid_is_admin()
  or (public.rapid_owns_enrollment(enrollment_id) and status <> 'approved')
);

drop policy if exists rapid_media_read on public.rapid_module_media;
create policy rapid_media_read on public.rapid_module_media for select
using (auth.uid() is not null);

drop policy if exists rapid_media_insert on public.rapid_module_media;
create policy rapid_media_insert on public.rapid_module_media for insert
with check (public.rapid_is_admin());

drop policy if exists rapid_media_update on public.rapid_module_media;
create policy rapid_media_update on public.rapid_module_media for update
using (public.rapid_is_admin()) with check (public.rapid_is_admin());

drop policy if exists rapid_media_delete on public.rapid_module_media;
create policy rapid_media_delete on public.rapid_module_media for delete
using (public.rapid_is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.rapid_enrollments to authenticated;
grant select, insert, update, delete on public.rapid_module_progress to authenticated;
grant select, insert, update, delete on public.rapid_microclasses to authenticated;
grant select, insert, update, delete on public.rapid_module_media to authenticated;

revoke all on public.rapid_enrollments from anon;
revoke all on public.rapid_module_progress from anon;
revoke all on public.rapid_microclasses from anon;
revoke all on public.rapid_module_media from anon;
