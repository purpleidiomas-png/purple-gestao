-- Purple Gestão — privacidade e concorrência dos Casos Integrados.
-- Migração idempotente e não destrutiva.
--
-- Compatibilidade:
--   * preserva integralmente os registros JSON kind = 'case' em app_records;
--   * copia somente casos ainda ausentes para a estrutura normalizada;
--   * bloqueia o JSON legado para líderes, sem afetar os demais kinds;
--   * Direção e Consulta explicitamente autorizada continuam com visão integral;
--   * toda mutação passa pela RPC e cada resumo setorial ocupa uma linha própria.

begin;

create table if not exists public.integrated_cases (
  id text primary key,
  student text not null,
  course text not null default '',
  group_name text not null default '',
  owner_name text not null default '',
  next_step text not null default '',
  deadline text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integrated_cases_id_not_blank check (btrim(id) <> ''),
  constraint integrated_cases_student_not_blank check (btrim(student) <> ''),
  constraint integrated_cases_deadline_format check (
    deadline is null or deadline ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  )
);

create table if not exists public.integrated_case_sector_details (
  case_id text not null references public.integrated_cases(id) on delete cascade,
  sector text not null check (sector in ('retencao', 'pedagogico', 'financeiro')),
  level text not null default 'good' check (level in ('good', 'warn', 'bad')),
  summary text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (case_id, sector)
);

create index if not exists integrated_cases_updated_at_idx
  on public.integrated_cases(updated_at desc);

create index if not exists integrated_case_sector_details_sector_idx
  on public.integrated_case_sector_details(sector, level, updated_at desc);

drop trigger if exists integrated_cases_touch_updated_at
  on public.integrated_cases;
create trigger integrated_cases_touch_updated_at
before update on public.integrated_cases
for each row execute function public.touch_updated_at();

drop trigger if exists integrated_case_sector_details_touch_updated_at
  on public.integrated_case_sector_details;
create trigger integrated_case_sector_details_touch_updated_at
before update on public.integrated_case_sector_details
for each row execute function public.touch_updated_at();

-- Migra somente o que ainda não foi normalizado. Nenhuma execução posterior
-- sobrescreve uma edição mais recente nem remove o JSON original.
insert into public.integrated_cases (
  id,
  student,
  course,
  group_name,
  owner_name,
  next_step,
  deadline,
  created_by,
  created_at,
  updated_at
)
select
  legacy.id,
  coalesce(nullif(btrim(legacy.data ->> 'student'), ''), 'Caso sem identificação'),
  coalesce(legacy.data ->> 'course', ''),
  coalesce(legacy.data ->> 'group', ''),
  coalesce(legacy.data ->> 'owner', ''),
  coalesce(legacy.data ->> 'nextStep', ''),
  case
    when coalesce(legacy.data ->> 'deadline', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      then legacy.data ->> 'deadline'
    else null
  end,
  legacy.owner_id,
  legacy.created_at,
  legacy.updated_at
from public.app_records legacy
where legacy.kind = 'case'
on conflict (id) do nothing;

insert into public.integrated_case_sector_details (
  case_id,
  sector,
  level,
  summary,
  updated_by,
  updated_at
)
select
  legacy.id,
  sector_data.sector,
  case
    when legacy.data -> sector_data.sector ->> 'level' in ('good', 'warn', 'bad')
      then legacy.data -> sector_data.sector ->> 'level'
    else 'good'
  end,
  coalesce(legacy.data -> sector_data.sector ->> 'summary', ''),
  legacy.owner_id,
  legacy.updated_at
from public.app_records legacy
cross join (
  values ('retencao'::text), ('pedagogico'::text), ('financeiro'::text)
) as sector_data(sector)
where legacy.kind = 'case'
  and exists (
    select 1
    from public.integrated_cases current_case
    where current_case.id = legacy.id
  )
on conflict (case_id, sector) do nothing;

alter table public.integrated_cases enable row level security;
alter table public.integrated_case_sector_details enable row level security;

drop policy if exists integrated_cases_read on public.integrated_cases;
create policy integrated_cases_read
on public.integrated_cases
for select
to authenticated
using (public.has_permission('cases.view'));

drop policy if exists integrated_case_sector_details_read
  on public.integrated_case_sector_details;
create policy integrated_case_sector_details_read
on public.integrated_case_sector_details
for select
to authenticated
using (
  public.has_permission('cases.view')
  and (
    public.is_direction()
    or public.is_viewer()
    or sector = public.my_sector()
  )
);

-- As políticas permissivas antigas de app_records são combinadas por OR.
-- Estas guardas RESTRICTIVE são necessárias para que nenhuma delas volte a
-- expor ou aceitar gravação do JSON integral de um caso para authenticated.
drop policy if exists integrated_cases_legacy_read_guard on public.app_records;
create policy integrated_cases_legacy_read_guard
on public.app_records
as restrictive
for select
to authenticated
using (
  kind <> 'case'
  or (
    (public.is_direction() or public.is_viewer())
    and public.has_permission('cases.view')
  )
);

drop policy if exists integrated_cases_legacy_insert_guard on public.app_records;
create policy integrated_cases_legacy_insert_guard
on public.app_records
as restrictive
for insert
to authenticated
with check (kind <> 'case');

drop policy if exists integrated_cases_legacy_update_guard on public.app_records;
create policy integrated_cases_legacy_update_guard
on public.app_records
as restrictive
for update
to authenticated
using (kind <> 'case')
with check (kind <> 'case');

drop policy if exists integrated_cases_legacy_delete_guard on public.app_records;
create policy integrated_cases_legacy_delete_guard
on public.app_records
as restrictive
for delete
to authenticated
using (kind <> 'case');

-- Retorna exatamente o contrato usado pela interface. Resumos dos outros
-- setores nunca integram a resposta de um líder; a máscara ocorre no banco.
create or replace function public.list_integrated_cases()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_full_access boolean;
  v_result jsonb;
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

  if coalesce(v_profile.permissions ->> 'cases.view', 'false') <> 'true' then
    raise exception 'Acesso aos casos integrados não autorizado.'
      using errcode = '42501';
  end if;

  v_full_access := v_profile.role in ('direction', 'viewer');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', current_case.id,
        'student', current_case.student,
        'course', current_case.course,
        'group', current_case.group_name,
        'owner', current_case.owner_name,
        'nextStep', current_case.next_step,
        'deadline', current_case.deadline,
        'updatedAt', greatest(
          current_case.updated_at,
          coalesce(retention.updated_at, current_case.updated_at),
          coalesce(pedagogical.updated_at, current_case.updated_at),
          coalesce(financial.updated_at, current_case.updated_at)
        ),
        'coreUpdatedAt', current_case.updated_at,
        'retencao', jsonb_build_object(
          'level', coalesce(retention.level, 'good'),
          'summary', case
            when v_full_access or v_profile.sector = 'retencao'
              then coalesce(retention.summary, '')
            else ''
          end,
          'updatedAt', retention.updated_at
        ),
        'pedagogico', jsonb_build_object(
          'level', coalesce(pedagogical.level, 'good'),
          'summary', case
            when v_full_access or v_profile.sector = 'pedagogico'
              then coalesce(pedagogical.summary, '')
            else ''
          end,
          'updatedAt', pedagogical.updated_at
        ),
        'financeiro', jsonb_build_object(
          'level', coalesce(financial.level, 'good'),
          'summary', case
            when v_full_access or v_profile.sector = 'financeiro'
              then coalesce(financial.summary, '')
            else ''
          end,
          'updatedAt', financial.updated_at
        )
      )
      order by greatest(
        current_case.updated_at,
        coalesce(retention.updated_at, current_case.updated_at),
        coalesce(pedagogical.updated_at, current_case.updated_at),
        coalesce(financial.updated_at, current_case.updated_at)
      ) desc
    ),
    '[]'::jsonb
  ) into v_result
  from public.integrated_cases current_case
  left join public.integrated_case_sector_details retention
    on retention.case_id = current_case.id
   and retention.sector = 'retencao'
  left join public.integrated_case_sector_details pedagogical
    on pedagogical.case_id = current_case.id
   and pedagogical.sector = 'pedagogico'
  left join public.integrated_case_sector_details financial
    on financial.case_id = current_case.id
   and financial.sector = 'financeiro'
  where
    v_full_access
    or current_case.created_by = v_profile.id
    or current_case.owner_name = v_profile.name
    or exists (
      select 1
      from public.integrated_case_sector_details own_detail
      where own_detail.case_id = current_case.id
        and own_detail.sector = v_profile.sector
        and own_detail.level <> 'good'
    );

  return v_result;
end;
$$;

-- Uma transação atualiza o núcleo compartilhado com trava otimista e somente
-- as linhas setoriais autorizadas. Setores diferentes nunca compartilham a
-- mesma linha e uma edição concorrente do mesmo setor é rejeitada explicitamente.
create or replace function public.save_integrated_case(
  p_case_id text,
  p_student text,
  p_course text,
  p_group text,
  p_owner text,
  p_next_step text,
  p_deadline text,
  p_expected_core_updated_at timestamptz,
  p_sector_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_case public.integrated_cases%rowtype;
  v_detail public.integrated_case_sector_details%rowtype;
  v_case_id text := nullif(btrim(p_case_id), '');
  v_student text := nullif(btrim(p_student), '');
  v_course text := coalesce(btrim(p_course), '');
  v_group text := coalesce(btrim(p_group), '');
  v_owner text := coalesce(btrim(p_owner), '');
  v_next_step text := coalesce(btrim(p_next_step), '');
  v_deadline text := nullif(btrim(p_deadline), '');
  v_sector text;
  v_sector_data jsonb;
  v_level text;
  v_summary text;
  v_expected_sector_updated_at timestamptz;
  v_allowed_sectors text[];
  v_is_new boolean;
  v_core_changed boolean;
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

  if coalesce(v_profile.permissions ->> 'cases.view', 'false') <> 'true'
     or v_profile.role not in ('direction', 'leader') then
    raise exception 'Alteração de casos integrados não autorizada.'
      using errcode = '42501';
  end if;

  if v_case_id is null or length(v_case_id) > 200 then
    raise exception 'Identificador do caso inválido.'
      using errcode = '22023';
  end if;

  if v_student is null then
    raise exception 'Informe o aluno ou referência.'
      using errcode = '22023';
  end if;

  if v_deadline is not null
     and v_deadline !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Prazo do caso inválido.'
      using errcode = '22023';
  end if;

  if p_sector_payload is null
     or jsonb_typeof(p_sector_payload) <> 'object' then
    raise exception 'Resumo setorial inválido.'
      using errcode = '22023';
  end if;

  if v_profile.role = 'leader' then
    if v_profile.sector not in ('retencao', 'pedagogico', 'financeiro') then
      raise exception 'Setor do líder inválido.'
        using errcode = '42501';
    end if;

    if exists (
      select 1
      from jsonb_object_keys(p_sector_payload) as payload(payload_sector)
      where payload_sector <> v_profile.sector
    ) then
      raise exception 'Um líder só pode atualizar o próprio setor.'
        using errcode = '42501';
    end if;

    v_allowed_sectors := array[v_profile.sector];
  else
    if exists (
      select 1
      from jsonb_object_keys(p_sector_payload) as payload(payload_sector)
      where payload_sector not in ('retencao', 'pedagogico', 'financeiro')
    ) then
      raise exception 'Setor informado no resumo é inválido.'
        using errcode = '22023';
    end if;

    v_allowed_sectors := array['retencao', 'pedagogico', 'financeiro'];
  end if;

  select * into v_case
  from public.integrated_cases
  where id = v_case_id
  for update;

  v_is_new := not found;

  if v_is_new then
    insert into public.integrated_cases (
      id, student, course, group_name, owner_name, next_step,
      deadline, created_by
    ) values (
      v_case_id, v_student, v_course, v_group, v_owner, v_next_step,
      v_deadline, v_profile.id
    );

    insert into public.integrated_case_sector_details (
      case_id, sector, level, summary, updated_by
    )
    select v_case_id, new_sector, 'good', '', v_profile.id
    from unnest(array['retencao', 'pedagogico', 'financeiro']) as sectors(new_sector)
    on conflict (case_id, sector) do nothing;
  else
    if v_profile.role = 'leader'
       and v_case.created_by is distinct from v_profile.id
       and v_case.owner_name is distinct from v_profile.name
       and not exists (
         select 1
         from public.integrated_case_sector_details own_detail
         where own_detail.case_id = v_case_id
           and own_detail.sector = v_profile.sector
           and own_detail.level <> 'good'
       ) then
      raise exception 'Caso integrado não autorizado para este líder.'
        using errcode = '42501';
    end if;

    if v_profile.role = 'leader'
       and v_case.student is distinct from v_student then
      raise exception 'Um líder não pode alterar a identificação do caso.'
        using errcode = '42501';
    end if;

    v_core_changed :=
      v_case.student is distinct from v_student
      or v_case.course is distinct from v_course
      or v_case.group_name is distinct from v_group
      or v_case.owner_name is distinct from v_owner
      or v_case.next_step is distinct from v_next_step
      or v_case.deadline is distinct from v_deadline;

    if v_core_changed then
      if p_expected_core_updated_at is null
         or v_case.updated_at is distinct from p_expected_core_updated_at then
        raise exception 'CASE_CORE_CONFLICT'
          using errcode = '40001',
                detail = 'Os dados compartilhados deste caso foram atualizados por outra pessoa.';
      end if;

      update public.integrated_cases
      set student = v_student,
          course = v_course,
          group_name = v_group,
          owner_name = v_owner,
          next_step = v_next_step,
          deadline = v_deadline
      where id = v_case_id;
    end if;
  end if;

  foreach v_sector in array v_allowed_sectors loop
    if p_sector_payload ? v_sector then
      v_sector_data := p_sector_payload -> v_sector;

      if jsonb_typeof(v_sector_data) <> 'object' then
        raise exception 'Resumo do setor % inválido.', v_sector
          using errcode = '22023';
      end if;

      v_level := coalesce(v_sector_data ->> 'level', 'good');
      v_summary := coalesce(btrim(v_sector_data ->> 'summary'), '');

      if v_level not in ('good', 'warn', 'bad') then
        raise exception 'Classificação do setor % inválida.', v_sector
          using errcode = '22023';
      end if;

      begin
        v_expected_sector_updated_at := nullif(
          v_sector_data ->> 'expectedUpdatedAt',
          ''
        )::timestamptz;
      exception
        when invalid_datetime_format then
          raise exception 'Versão do setor % inválida.', v_sector
            using errcode = '22023';
      end;

      select * into v_detail
      from public.integrated_case_sector_details
      where case_id = v_case_id
        and sector = v_sector
      for update;

      if found then
        if not v_is_new
           and (
             v_expected_sector_updated_at is null
             or v_detail.updated_at is distinct from v_expected_sector_updated_at
           ) then
          raise exception 'CASE_SECTOR_CONFLICT:%', v_sector
            using errcode = '40001',
                  detail = 'O resumo deste setor foi atualizado por outra pessoa.';
        end if;

        if v_detail.level is distinct from v_level
           or v_detail.summary is distinct from v_summary then
          update public.integrated_case_sector_details
          set level = v_level,
              summary = v_summary,
              updated_by = v_profile.id
          where case_id = v_case_id
            and sector = v_sector;
        end if;
      else
        insert into public.integrated_case_sector_details (
          case_id, sector, level, summary, updated_by
        ) values (
          v_case_id, v_sector, v_level, v_summary, v_profile.id
        );
      end if;
    end if;
  end loop;

  return v_case_id;
end;
$$;

grant select on public.integrated_cases to authenticated;
grant select on public.integrated_case_sector_details to authenticated;
revoke insert, update, delete on public.integrated_cases from authenticated;
revoke insert, update, delete on public.integrated_case_sector_details from authenticated;
revoke all on public.integrated_cases from anon;
revoke all on public.integrated_case_sector_details from anon;

revoke all privileges on function public.list_integrated_cases()
from public, anon;
grant execute on function public.list_integrated_cases()
to authenticated;

revoke all privileges on function public.save_integrated_case(
  text, text, text, text, text, text, text, timestamptz, jsonb
)
from public, anon;
grant execute on function public.save_integrated_case(
  text, text, text, text, text, text, text, timestamptz, jsonb
)
to authenticated;

commit;
