-- Purple Gestão — criação de usuários pela Direção e troca obrigatória de senha.
-- Migration não destrutiva: preserva perfis, permissões e usuários existentes.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%'
    and pg_get_constraintdef(oid) ilike '%direction%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('direction','leader','viewer','teacher'));
end $$;

create or replace function public.clear_my_password_change_required()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.profiles;
begin
  update public.profiles
     set must_change_password = false
   where id = auth.uid()
   returning * into updated;

  if updated.id is null then
    raise exception 'Perfil não encontrado para o usuário autenticado.';
  end if;

  return updated;
end;
$$;

grant execute on function public.clear_my_password_change_required() to authenticated;
grant update (must_change_password) on public.profiles to authenticated;
