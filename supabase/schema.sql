-- Purple Gestão — backend Supabase para o protótipo HTML aprovado.
-- Mantém o formato de dados do app.js e aplica autenticação e RLS no banco.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Novo usuário',
  email text not null unique,
  role text not null default 'viewer' check (role in ('direction','leader','viewer')),
  sector text not null default 'all' check (sector in ('all','retencao','pedagogico','financeiro')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leader_has_sector check (role <> 'leader' or sector <> 'all')
);

create table if not exists public.app_records (
  id text primary key,
  kind text not null check (kind in ('report','action','case','meeting','audit','settings','notification_reads')),
  sector text check (sector in ('all','retencao','pedagogico','financeiro')),
  owner_id uuid references public.profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_records_kind_sector_idx on public.app_records(kind, sector);
create index if not exists app_records_owner_idx on public.app_records(owner_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists app_records_touch_updated_at on public.app_records;
create trigger app_records_touch_updated_at before update on public.app_records
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role, sector, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'viewer'),
    coalesce(new.raw_user_meta_data->>'sector', 'all'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Cria perfis para usuários que já existiam antes da migration.
insert into public.profiles (id, name, email)
select id, coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)), email
from auth.users
where email is not null
on conflict (id) do nothing;

create or replace function public.is_direction()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role = 'direction'
  );
$$;

create or replace function public.is_viewer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role = 'viewer'
  );
$$;

create or replace function public.my_sector()
returns text language sql stable security definer set search_path = public as $$
  select sector from public.profiles where id = auth.uid() and active = true;
$$;

alter table public.profiles enable row level security;
alter table public.app_records enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
using (id = auth.uid() or public.is_direction());

drop policy if exists profiles_direction_update on public.profiles;
create policy profiles_direction_update on public.profiles for update
using (public.is_direction()) with check (public.is_direction());

drop policy if exists records_read on public.app_records;
create policy records_read on public.app_records for select using (
  public.is_direction()
  or public.is_viewer()
  or owner_id = auth.uid()
  or sector = public.my_sector()
  or kind = 'settings'
);

drop policy if exists records_insert on public.app_records;
create policy records_insert on public.app_records for insert with check (
  public.is_direction()
  or (
    owner_id = auth.uid()
    and sector = public.my_sector()
    and kind in ('report','action','case','meeting','audit','notification_reads')
  )
);

drop policy if exists records_update on public.app_records;
create policy records_update on public.app_records for update using (
  public.is_direction()
  or (sector = public.my_sector() and not public.is_viewer())
  or (kind = 'notification_reads' and owner_id = auth.uid())
) with check (
  public.is_direction()
  or (sector = public.my_sector() and not public.is_viewer())
  or (kind = 'notification_reads' and owner_id = auth.uid())
);

drop policy if exists records_delete on public.app_records;
create policy records_delete on public.app_records for delete using (
  public.is_direction()
  or (owner_id = auth.uid() and sector = public.my_sector())
);

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (name, role, sector, active) on public.profiles to authenticated;
grant select, insert, update, delete on public.app_records to authenticated;

-- Usuários anônimos não têm acesso aos dados.
revoke all on public.profiles from anon;
revoke all on public.app_records from anon;
