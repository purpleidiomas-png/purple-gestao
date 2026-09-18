-- Purple Gestão — contrato canônico para diretórios acadêmicos.
-- PREPARADA NA FASE 1. NÃO EXECUTAR AUTOMATICAMENTE.

alter table public.students add column if not exists legacy_record_id text;
alter table public.classes add column if not exists legacy_record_id text;
alter table public.teachers add column if not exists legacy_record_id text;

update public.students
set legacy_record_id = coalesce(
  nullif(legacy_record_id,''),
  nullif(data->>'legacyId',''),
  nullif(data->>'id','')
)
where coalesce(legacy_record_id,'') = '';

update public.classes
set legacy_record_id = coalesce(
  nullif(legacy_record_id,''),
  nullif(data->>'legacyId',''),
  nullif(data->>'id','')
)
where coalesce(legacy_record_id,'') = '';

update public.teachers
set legacy_record_id = coalesce(
  nullif(legacy_record_id,''),
  nullif(data->>'legacyId',''),
  nullif(data->>'id','')
)
where coalesce(legacy_record_id,'') = '';

create unique index if not exists students_legacy_record_id_uidx
  on public.students (legacy_record_id)
  where legacy_record_id is not null;

create unique index if not exists classes_legacy_record_id_uidx
  on public.classes (legacy_record_id)
  where legacy_record_id is not null;

create unique index if not exists teachers_legacy_record_id_uidx
  on public.teachers (legacy_record_id)
  where legacy_record_id is not null;
