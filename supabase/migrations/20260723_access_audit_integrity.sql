-- Purple Gestão — integridade de acesso, perfil e auditoria de sessão.
-- Migração idempotente, não destrutiva e sem alteração de dados existentes.
-- Dependências: 20260716_access_control.sql e 20260719_production_v1.sql.

-- A Direção somente enxerga outros perfis quando users.view estiver concedida.
-- A leitura do próprio perfil permanece disponível para restauração de sessão.
-- A Edge Function usa o JWT do chamador: com users.view ela continua podendo
-- ler o alvo, validar o último administrador e receber o registro atualizado.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read
on public.profiles
for select
using (
  id = auth.uid()
  or (
    public.is_direction()
    and public.has_permission('users.view')
  )
);

-- Atualiza exclusivamente o último acesso do próprio usuário ativo. A função
-- evita conceder UPDATE direto sobre last_login_at a todos os autenticados.
create or replace function public.update_my_last_login()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_login_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sessão de autenticação não encontrada.'
      using errcode = '42501';
  end if;

  update public.profiles
  set last_login_at = clock_timestamp()
  where id = auth.uid()
    and active = true
  returning last_login_at into v_last_login_at;

  if v_last_login_at is null then
    raise exception 'Perfil ativo não encontrado.'
      using errcode = '42501';
  end if;

  return v_last_login_at;
end;
$$;

revoke all privileges on function public.update_my_last_login()
from public, anon;
grant execute on function public.update_my_last_login()
to authenticated;

revoke update (last_login_at) on public.profiles from authenticated;

-- Registra somente eventos pessoais de autenticação e segurança. O ator, nome,
-- setor e horário são derivados no servidor; o cliente não pode registrar um
-- evento em nome de outra pessoa nem precisa receber audit.view.
create or replace function public.record_my_audit_event(
  p_event_type text,
  p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_event_type text;
  v_action text;
  v_detail text := nullif(btrim(p_detail), '');
  v_id text := 'audit-' || gen_random_uuid()::text;
  v_at timestamptz := clock_timestamp();
  v_event jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão de autenticação não encontrada.'
      using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid()
    and active = true;

  if not found then
    raise exception 'Perfil ativo não encontrado.'
      using errcode = '42501';
  end if;

  case lower(btrim(coalesce(p_event_type, '')))
    when 'login' then
      v_event_type := 'login';
      v_action := 'Login';
    when 'logout' then
      v_event_type := 'logout';
      v_action := 'Logout';
    when 'profile' then
      v_event_type := 'profile_update';
      v_action := 'Editou o próprio perfil';
    when 'profile_update' then
      v_event_type := 'profile_update';
      v_action := 'Editou o próprio perfil';
    when 'editou o próprio perfil' then
      v_event_type := 'profile_update';
      v_action := 'Editou o próprio perfil';
    when 'password' then
      v_event_type := 'password_change';
      v_action := 'Alterou a senha';
    when 'password_change' then
      v_event_type := 'password_change';
      v_action := 'Alterou a senha';
    when 'alterou a senha' then
      v_event_type := 'password_change';
      v_action := 'Alterou a senha';
    else
      raise exception 'Tipo de evento de auditoria não autorizado.'
        using errcode = '22023';
  end case;

  if v_detail is not null and length(v_detail) > 2000 then
    raise exception 'O detalhe da auditoria excede o limite permitido.'
      using errcode = '22001';
  end if;

  v_event := jsonb_build_object(
    'id', v_id,
    'at', v_at,
    'actor', v_profile.name,
    'actorId', v_profile.id,
    'action', v_action,
    'detail', v_detail,
    'eventType', v_event_type
  );

  insert into public.app_records (
    id, kind, sector, owner_id, data
  ) values (
    v_id,
    'audit',
    case
      when v_profile.sector in ('all', 'retencao', 'pedagogico', 'financeiro')
        then v_profile.sector
      else 'all'
    end,
    v_profile.id,
    v_event
  );

  return v_event;
end;
$$;

revoke all privileges on function public.record_my_audit_event(text, text)
from public, anon;
grant execute on function public.record_my_audit_event(text, text)
to authenticated;

-- O ator da auditoria de permissões é sempre o subject autenticado real. Para
-- rotinas administrativas sem JWT, exige-se um UUID explícito na configuração
-- local da transação: SET LOCAL app.permission_actor_id = '<uuid>'. Sem um ator
-- identificável, a alteração é revertida em vez de gravar autoria falsa/nula.
create or replace function public.audit_profile_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_setting text;
  v_old_keys text[];
  v_new_keys text[];
begin
  if old.role is distinct from new.role
     or old.sector is distinct from new.sector
     or old.access_scope is distinct from new.access_scope
     or old.permissions is distinct from new.permissions then

    if v_actor_id is null then
      v_actor_setting := nullif(
        current_setting('app.permission_actor_id', true),
        ''
      );

      if v_actor_setting is null then
        raise exception 'Ator da alteração de permissões não identificado.'
          using errcode = '42501';
      end if;

      begin
        v_actor_id := v_actor_setting::uuid;
      exception
        when invalid_text_representation then
          raise exception 'Identificador do ator da alteração de permissões é inválido.'
            using errcode = '22023';
      end;
    end if;

    if not exists (
      select 1
      from public.profiles actor_profile
      where actor_profile.id = v_actor_id
    ) then
      raise exception 'O ator da alteração de permissões não possui perfil correspondente.'
        using errcode = '42501';
    end if;

    select coalesce(array_agg(key order by key), '{}')
      into v_old_keys
    from jsonb_each_text(old.permissions)
    where value = 'true';

    select coalesce(array_agg(key order by key), '{}')
      into v_new_keys
    from jsonb_each_text(new.permissions)
    where value = 'true';

    insert into public.permission_audit (
      actor_id, affected_user_id,
      old_role, new_role, old_sector, new_sector,
      old_scope, new_scope, old_permissions, new_permissions,
      added_permissions, removed_permissions
    ) values (
      v_actor_id, new.id,
      old.role, new.role, old.sector, new.sector,
      old.access_scope, new.access_scope, old.permissions, new.permissions,
      array(
        select unnest(v_new_keys)
        except
        select unnest(v_old_keys)
      ),
      array(
        select unnest(v_old_keys)
        except
        select unnest(v_new_keys)
      )
    );
  end if;

  return new;
end;
$$;
