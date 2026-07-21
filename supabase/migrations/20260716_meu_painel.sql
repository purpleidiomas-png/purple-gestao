-- Purple Gestão — Meu Painel, Pulse, Conquistas e Mural Purple.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  source_type text not null default 'manual',
  source_id text,
  sector text not null default 'all' check (sector in ('all','retencao','pedagogico','financeiro')),
  priority text not null default 'media' check (priority in ('alta','media','baixa')),
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tasks_automatic_source_idx
on public.tasks(user_id, source_type, source_id)
where source_type <> 'manual' and source_id is not null;

create table if not exists public.pulse_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sector text not null check (sector in ('all','retencao','pedagogico','financeiro')),
  feeling text not null check (feeling in ('excelente','bem','normal','dificil','muito_dificil')),
  comment text not null default '',
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique(user_id, entry_date)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  title text not null,
  unlocked_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  unique(user_id, code)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  published_at date not null default current_date,
  valid_until date,
  priority text not null default 'normal' check (priority in ('alta','normal','baixa')),
  audience text not null default 'all' check (audience in ('all','direction','leaders')),
  sector text not null default 'all' check (sector in ('all','retencao','pedagogico','financeiro')),
  pinned boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at before update on public.tasks
for each row execute function public.touch_updated_at();

drop trigger if exists announcements_touch_updated_at on public.announcements;
create trigger announcements_touch_updated_at before update on public.announcements
for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;
alter table public.pulse_entries enable row level security;
alter table public.achievements enable row level security;
alter table public.announcements enable row level security;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select using (user_id = auth.uid() or public.is_direction());
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert with check (user_id = auth.uid() and not public.is_viewer());
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update using (user_id = auth.uid() or public.is_direction()) with check (user_id = auth.uid() or public.is_direction());
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete using (user_id = auth.uid() or public.is_direction());

drop policy if exists pulse_select on public.pulse_entries;
create policy pulse_select on public.pulse_entries for select using (user_id = auth.uid() or public.is_direction());
drop policy if exists pulse_insert on public.pulse_entries;
create policy pulse_insert on public.pulse_entries for insert with check (user_id = auth.uid() and not public.is_viewer());

drop policy if exists achievements_select on public.achievements;
create policy achievements_select on public.achievements for select using (user_id = auth.uid() or public.is_direction());
drop policy if exists achievements_insert on public.achievements;
create policy achievements_insert on public.achievements for insert with check (user_id = auth.uid() and not public.is_viewer());

drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements for select using (
  public.is_direction() or (
    (valid_until is null or valid_until >= current_date)
    and (sector = 'all' or sector = public.my_sector())
    and (audience = 'all' or (audience = 'leaders' and not public.is_viewer()))
  )
);
drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements for insert with check (public.is_direction() and created_by = auth.uid());
drop policy if exists announcements_update on public.announcements;
create policy announcements_update on public.announcements for update using (public.is_direction()) with check (public.is_direction());
drop policy if exists announcements_delete on public.announcements;
create policy announcements_delete on public.announcements for delete using (public.is_direction());

grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert on public.pulse_entries to authenticated;
grant select, insert on public.achievements to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;

revoke all on public.tasks, public.pulse_entries, public.achievements, public.announcements from anon;
