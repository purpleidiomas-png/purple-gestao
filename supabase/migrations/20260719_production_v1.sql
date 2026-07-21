begin;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists avatar_url text,
  add column if not exists electronic_signature text,
  add column if not exists last_login_at timestamptz;

update public.profiles
set name = case email
  when 'direcao@purple.com' then 'Raphael'
  when 'pedagogico@purple.com' then 'Victor'
  when 'financeiro@purple.com' then 'Waleska'
  when 'retencao@purple.com' then 'Déborah'
  else name end,
  job_title = case email
  when 'direcao@purple.com' then 'Direção'
  when 'pedagogico@purple.com' then 'Liderança Pedagógica'
  when 'financeiro@purple.com' then 'Liderança Financeira'
  when 'retencao@purple.com' then 'Liderança de Retenção'
  else job_title end,
  active = email in ('direcao@purple.com','pedagogico@purple.com','financeiro@purple.com','retencao@purple.com');

grant update (name, phone, job_title, avatar_url, electronic_signature, last_login_at) on public.profiles to authenticated;

create or replace function public.update_my_profile(
  p_name text,
  p_phone text default null,
  p_job_title text default null,
  p_electronic_signature text default null
) returns public.profiles
language plpgsql security definer set search_path=public as $$
declare v_profile public.profiles;
begin
  if nullif(trim(p_name),'') is null then raise exception 'Nome obrigatório.'; end if;
  update public.profiles set
    name=trim(p_name), phone=nullif(trim(p_phone),''),
    job_title=nullif(trim(p_job_title),''),
    electronic_signature=nullif(trim(p_electronic_signature),'')
  where id=auth.uid() and active=true returning * into v_profile;
  if v_profile.id is null then raise exception 'Perfil não encontrado.'; end if;
  return v_profile;
end; $$;

grant execute on function public.update_my_profile(text,text,text,text) to authenticated;

alter table public.profiles disable trigger profiles_permission_audit;
update public.profiles
set permissions=permissions||'{"settings.view":true}'::jsonb
where active=true;
alter table public.profiles enable trigger profiles_permission_audit;

commit;
