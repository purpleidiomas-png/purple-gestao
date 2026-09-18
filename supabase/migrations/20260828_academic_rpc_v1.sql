-- Purple Gestão — Fase 2.2 — Academic RPC V1
-- PREPARADA. NÃO EXECUTAR EM PRODUÇÃO NESTA FASE.
-- Suporte a cutover controlado com feature flag explícita e auditoria transacional.

create table if not exists public.runtime_flags (
  flag_key text primary key,
  flag_value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.runtime_flags (flag_key, flag_value)
values ('ACADEMIC_SOURCE', 'APP_RECORDS')
on conflict (flag_key) do nothing;

create table if not exists public.academic_directory_audit (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('teacher','class','student')),
  operation text not null check (operation in ('create','update','delete')),
  record_id uuid,
  legacy_record_id text,
  actor_id uuid references public.profiles(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.runtime_flags enable row level security;
alter table public.academic_directory_audit enable row level security;

drop policy if exists runtime_flags_select_v1 on public.runtime_flags;
create policy runtime_flags_select_v1 on public.runtime_flags
for select to authenticated
using (public.has_permission('settings.view') or public.has_permission('panel.view'));

drop policy if exists runtime_flags_write_v1 on public.runtime_flags;
create policy runtime_flags_write_v1 on public.runtime_flags
for all to authenticated
using (public.is_direction() and public.has_permission('settings.edit'))
with check (public.is_direction() and public.has_permission('settings.edit'));

drop policy if exists academic_directory_audit_select_v1 on public.academic_directory_audit;
create policy academic_directory_audit_select_v1 on public.academic_directory_audit
for select to authenticated
using (public.is_direction() and public.has_permission('audit.view'));

grant select on public.runtime_flags to authenticated;
grant select on public.academic_directory_audit to authenticated;

create or replace function public.current_academic_source()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select flag_value
  from public.runtime_flags
  where flag_key = 'ACADEMIC_SOURCE'
$$;

create or replace function public.save_academic_directory_record(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation text := coalesce(nullif(p_payload->>'operation',''), '');
  v_entity text := split_part(v_operation, '.', 1);
  v_action text := split_part(v_operation, '.', 2);
  v_source text := coalesce(nullif(p_payload->>'source_mode',''), '');
  v_record jsonb := coalesce(p_payload->'record', '{}'::jsonb);
  v_actor uuid := auth.uid();
  v_now timestamptz := now();
  v_existing jsonb;
  v_result_id uuid;
  v_legacy_record_id text := nullif(v_record->>'legacy_record_id','');
  v_record_id uuid := nullif(v_record->>'id','')::uuid;
  v_expected_updated_at timestamptz := nullif(p_payload#>>'{expected_version,updated_at}','')::timestamptz;
  v_teacher_id uuid := nullif(v_record->>'teacher_id','')::uuid;
  v_class_id uuid := nullif(v_record->>'class_id','')::uuid;
begin
  if v_actor is null then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  if public.current_academic_source() <> 'TYPED' or v_source <> 'TYPED' then
    raise exception 'ACADEMIC_SOURCE_NOT_TYPED' using errcode = 'P0001';
  end if;

  if public.is_viewer() then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  if v_entity not in ('teacher','class','student') or v_action not in ('upsert','delete') then
    raise exception 'INVALID_OPERATION' using errcode = '22023';
  end if;

  if v_action = 'upsert' and v_legacy_record_id is null then
    raise exception 'LEGACY_RECORD_ID_REQUIRED' using errcode = '22023';
  end if;

  if v_entity = 'class' and v_teacher_id is not null then
    if not exists (select 1 from public.teachers where id = v_teacher_id) then
      raise exception 'TEACHER_REFERENCE_NOT_FOUND' using errcode = '23503';
    end if;
  end if;

  if v_entity = 'student' and v_class_id is not null then
    if not exists (select 1 from public.classes where id = v_class_id) then
      raise exception 'CLASS_REFERENCE_NOT_FOUND' using errcode = '23503';
    end if;
  end if;

  if v_entity = 'teacher' then
    if v_action = 'delete' then
      select to_jsonb(t.*) into v_existing from public.teachers t where t.id = v_record_id;
      delete from public.teachers where id = v_record_id;
      v_result_id := v_record_id;
    else
      if v_record_id is not null then
        select to_jsonb(t.*) into v_existing from public.teachers t where t.id = v_record_id;
        if v_expected_updated_at is not null and exists (
          select 1 from public.teachers t where t.id = v_record_id and t.updated_at <> v_expected_updated_at
        ) then
          raise exception 'OPTIMISTIC_LOCK_FAILED' using errcode = '40001';
        end if;
      end if;
      insert into public.teachers (id, legacy_record_id, name, email, phone, workload, classes_count, score, status, data, created_at, updated_at)
      values (
        coalesce(v_record_id, gen_random_uuid()),
        v_legacy_record_id,
        coalesce(nullif(v_record->>'name',''),'SEM NOME'),
        nullif(v_record->>'email',''),
        nullif(v_record->>'phone',''),
        nullif(v_record->>'workload',''),
        coalesce(nullif(v_record->>'classes_count','')::integer,0),
        nullif(v_record->>'score','')::numeric,
        coalesce(nullif(v_record->>'status',''),'ATIVO'),
        coalesce(v_record->'data','{}'::jsonb),
        v_now,
        v_now
      )
      on conflict (id) do update set
        legacy_record_id = excluded.legacy_record_id,
        name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        workload = excluded.workload,
        classes_count = excluded.classes_count,
        score = excluded.score,
        status = excluded.status,
        data = excluded.data,
        updated_at = v_now
      returning id into v_result_id;
    end if;
  elsif v_entity = 'class' then
    if v_action = 'delete' then
      select to_jsonb(c.*) into v_existing from public.classes c where c.id = v_record_id;
      delete from public.classes where id = v_record_id;
      v_result_id := v_record_id;
    else
      if v_record_id is not null then
        select to_jsonb(c.*) into v_existing from public.classes c where c.id = v_record_id;
        if v_expected_updated_at is not null and exists (
          select 1 from public.classes c where c.id = v_record_id and c.updated_at <> v_expected_updated_at
        ) then
          raise exception 'OPTIMISTIC_LOCK_FAILED' using errcode = '40001';
        end if;
      end if;
      insert into public.classes (
        id, legacy_record_id, name, course, category, level, class_number, teacher_id, room,
        schedule_label, capacity, students_count, module_hours, class_type, book_legacy_ref,
        start_date, projected_end_date, status, data, created_at, updated_at
      )
      values (
        coalesce(v_record_id, gen_random_uuid()),
        v_legacy_record_id,
        coalesce(nullif(v_record->>'name',''),'SEM NOME'),
        coalesce(nullif(v_record->>'course',''),'SEM CURSO'),
        coalesce(nullif(v_record->>'category',''),'ADULTO'),
        nullif(v_record->>'level',''),
        coalesce(nullif(v_record->>'class_number','')::integer,1),
        v_teacher_id,
        nullif(v_record->>'room',''),
        nullif(v_record->>'schedule_label',''),
        coalesce(nullif(v_record->>'capacity','')::integer,0),
        coalesce(nullif(v_record->>'students_count','')::integer,0),
        nullif(v_record->>'module_hours','')::integer,
        nullif(v_record->>'class_type',''),
        nullif(v_record->>'book_legacy_ref',''),
        nullif(v_record->>'start_date','')::date,
        nullif(v_record->>'projected_end_date','')::date,
        coalesce(nullif(v_record->>'status',''),'ATIVO'),
        coalesce(v_record->'data','{}'::jsonb),
        v_now,
        v_now
      )
      on conflict (id) do update set
        legacy_record_id = excluded.legacy_record_id,
        name = excluded.name,
        course = excluded.course,
        category = excluded.category,
        level = excluded.level,
        class_number = excluded.class_number,
        teacher_id = excluded.teacher_id,
        room = excluded.room,
        schedule_label = excluded.schedule_label,
        capacity = excluded.capacity,
        students_count = excluded.students_count,
        module_hours = excluded.module_hours,
        class_type = excluded.class_type,
        book_legacy_ref = excluded.book_legacy_ref,
        start_date = excluded.start_date,
        projected_end_date = excluded.projected_end_date,
        status = excluded.status,
        data = excluded.data,
        updated_at = v_now
      returning id into v_result_id;
    end if;
  else
    if v_action = 'delete' then
      select to_jsonb(s.*) into v_existing from public.students s where s.id = v_record_id;
      delete from public.students where id = v_record_id;
      v_result_id := v_record_id;
    else
      if v_record_id is not null then
        select to_jsonb(s.*) into v_existing from public.students s where s.id = v_record_id;
        if v_expected_updated_at is not null and exists (
          select 1 from public.students s where s.id = v_record_id and s.updated_at <> v_expected_updated_at
        ) then
          raise exception 'OPTIMISTIC_LOCK_FAILED' using errcode = '40001';
        end if;
      end if;
      insert into public.students (
        id, legacy_record_id, code, name, full_name, social_name, document, rg, birth_date, sex,
        email, phone, whatsapp, contact_phone, guardian_name, responsible_name, class_id,
        status, registration_date, address_line, address_number, district, city, state, zip_code,
        data, created_at, updated_at
      )
      values (
        coalesce(v_record_id, gen_random_uuid()),
        v_legacy_record_id,
        coalesce(nullif(v_record->>'code',''),'SEM CODIGO'),
        coalesce(nullif(v_record->>'name',''),'SEM NOME'),
        nullif(v_record->>'full_name',''),
        nullif(v_record->>'social_name',''),
        nullif(v_record->>'document',''),
        nullif(v_record->>'rg',''),
        nullif(v_record->>'birth_date','')::date,
        nullif(v_record->>'sex',''),
        nullif(v_record->>'email',''),
        nullif(v_record->>'phone',''),
        nullif(v_record->>'whatsapp',''),
        nullif(v_record->>'contact_phone',''),
        nullif(v_record->>'guardian_name',''),
        nullif(v_record->>'responsible_name',''),
        v_class_id,
        coalesce(nullif(v_record->>'status',''),'ATIVO'),
        nullif(v_record->>'registration_date','')::date,
        nullif(v_record->>'address_line',''),
        nullif(v_record->>'address_number',''),
        nullif(v_record->>'district',''),
        nullif(v_record->>'city',''),
        nullif(v_record->>'state',''),
        nullif(v_record->>'zip_code',''),
        coalesce(v_record->'data','{}'::jsonb),
        v_now,
        v_now
      )
      on conflict (id) do update set
        legacy_record_id = excluded.legacy_record_id,
        code = excluded.code,
        name = excluded.name,
        full_name = excluded.full_name,
        social_name = excluded.social_name,
        document = excluded.document,
        rg = excluded.rg,
        birth_date = excluded.birth_date,
        sex = excluded.sex,
        email = excluded.email,
        phone = excluded.phone,
        whatsapp = excluded.whatsapp,
        contact_phone = excluded.contact_phone,
        guardian_name = excluded.guardian_name,
        responsible_name = excluded.responsible_name,
        class_id = excluded.class_id,
        status = excluded.status,
        registration_date = excluded.registration_date,
        address_line = excluded.address_line,
        address_number = excluded.address_number,
        district = excluded.district,
        city = excluded.city,
        state = excluded.state,
        zip_code = excluded.zip_code,
        data = excluded.data,
        updated_at = v_now
      returning id into v_result_id;
    end if;
  end if;

  insert into public.academic_directory_audit (
    entity, operation, record_id, legacy_record_id, actor_id, before_data, after_data, created_at
  )
  values (
    v_entity,
    case when v_action = 'delete' then 'delete' when v_existing is null then 'create' else 'update' end,
    v_result_id,
    v_legacy_record_id,
    v_actor,
    v_existing,
    case
      when v_entity = 'teacher' and v_action <> 'delete' then (select to_jsonb(t.*) from public.teachers t where t.id = v_result_id)
      when v_entity = 'class' and v_action <> 'delete' then (select to_jsonb(c.*) from public.classes c where c.id = v_result_id)
      when v_entity = 'student' and v_action <> 'delete' then (select to_jsonb(s.*) from public.students s where s.id = v_result_id)
      else null
    end,
    v_now
  );

  return jsonb_build_object('ok', true, 'entity', v_entity, 'record_id', v_result_id, 'operation', v_action);
end;
$$;

grant execute on function public.save_academic_directory_record(jsonb) to authenticated;
