-- Purple Gestão — Fase 2.1 — Academic backfill
-- PREPARADO. NÃO EXECUTAR NESTA FASE.
-- Estado esperado: tabelas acadêmicas V2 já criadas.

begin;

create temporary table if not exists tmp_backfill_teachers as
select
  row_number() over () as seq,
  id as source_app_record_id,
  data->>'id' as legacy_record_id,
  data
from public.app_records
where kind = 'teacher';

create temporary table if not exists tmp_backfill_classes as
select
  row_number() over () as seq,
  id as source_app_record_id,
  data->>'id' as legacy_record_id,
  data
from public.app_records
where kind = 'class';

create temporary table if not exists tmp_backfill_students as
select
  row_number() over () as seq,
  id as source_app_record_id,
  data->>'id' as legacy_record_id,
  data
from public.app_records
where kind = 'student';

do $$
declare
  v_missing_links integer;
  v_missing_student_class_links integer;
begin
  select count(*)
  into v_missing_links
  from tmp_backfill_classes c
  left join tmp_backfill_teachers t
    on t.legacy_record_id = c.data->>'teacherId'
  where nullif(c.data->>'teacherId','') is not null
    and t.legacy_record_id is null;

  if v_missing_links > 0 then
    raise exception 'RECONCILIATION_ERROR: class.teacherId sem teacher legado correspondente (%).', v_missing_links
      using errcode = 'P0001';
  end if;

  select count(*)
  into v_missing_student_class_links
  from tmp_backfill_students s
  left join tmp_backfill_classes c
    on c.legacy_record_id = s.data->>'classId'
  where nullif(s.data->>'classId','') is not null
    and c.legacy_record_id is null;

  if v_missing_student_class_links > 0 then
    raise exception 'RECONCILIATION_ERROR: student.classId sem class legado correspondente (%).', v_missing_student_class_links
      using errcode = 'P0001';
  end if;
end $$;

insert into public.teachers (
  legacy_record_id, name, email, phone, workload, classes_count, score, status, data
)
select
  src.legacy_record_id,
  src.data->>'name',
  nullif(src.data->>'email',''),
  nullif(src.data->>'phone',''),
  nullif(src.data->>'workload',''),
  coalesce((src.data->>'classesCount')::integer, 0),
  nullif(src.data->>'score','')::numeric,
  case when upper(coalesce(src.data->>'status','ATIVO')) like 'INAT%' then 'INATIVO' else 'ATIVO' end,
  src.data
from tmp_backfill_teachers src
where nullif(src.legacy_record_id,'') is not null
on conflict (legacy_record_id) do update set
  name = excluded.name,
  email = excluded.email,
  phone = excluded.phone,
  workload = excluded.workload,
  classes_count = excluded.classes_count,
  score = excluded.score,
  status = excluded.status,
  data = excluded.data,
  updated_at = now();

insert into public.classes (
  legacy_record_id, name, course, category, level, class_number, teacher_id, room,
  schedule_label, capacity, students_count, module_hours, class_type, book_legacy_ref,
  start_date, projected_end_date, status, data
)
select
  src.legacy_record_id,
  src.data->>'name',
  src.data->>'course',
  src.data->>'category',
  nullif(src.data->>'level',''),
  coalesce((src.data->>'classNumber')::integer, 1),
  t.id,
  nullif(src.data->>'room',''),
  nullif(src.data->>'schedule',''),
  coalesce((src.data->>'capacity')::integer, 0),
  coalesce((src.data->>'studentsCount')::integer, 0),
  nullif(src.data->>'moduleHours','')::integer,
  nullif(src.data->>'classType',''),
  nullif(src.data->>'bookId',''),
  nullif(src.data->>'startDate','')::date,
  nullif(src.data->>'projectedEndDate','')::date,
  case when upper(coalesce(src.data->>'status','ATIVO')) like 'INAT%' then 'INATIVO' else 'ATIVO' end,
  src.data
from tmp_backfill_classes src
left join public.teachers t
  on t.legacy_record_id = src.data->>'teacherId'
where nullif(src.legacy_record_id,'') is not null
on conflict (legacy_record_id) do update set
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
  updated_at = now();

insert into public.students (
  legacy_record_id, code, name, full_name, social_name, document, rg, birth_date, sex,
  email, phone, whatsapp, contact_phone, guardian_name, responsible_name, class_id,
  status, registration_date, address_line, address_number, district, city, state, zip_code, data
)
select
  src.legacy_record_id,
  src.data->>'code',
  src.data->>'name',
  nullif(src.data->>'fullName',''),
  nullif(src.data->>'socialName',''),
  nullif(src.data->>'document',''),
  nullif(src.data->>'rg',''),
  nullif(src.data->>'birthDate','')::date,
  nullif(src.data->>'sex',''),
  nullif(src.data->>'email',''),
  nullif(src.data->>'phone',''),
  nullif(src.data->>'whatsapp',''),
  nullif(src.data->>'contactPhone',''),
  nullif(src.data->>'guardian',''),
  nullif(src.data->>'responsible',''),
  c.id,
  case when upper(coalesce(src.data->>'status','ATIVO')) like 'INAT%' then 'INATIVO' else 'ATIVO' end,
  nullif(src.data->>'registrationDate','')::date,
  coalesce(nullif(src.data->>'address',''), nullif(src.data->>'endereco','')),
  nullif(src.data->>'number',''),
  coalesce(nullif(src.data->>'bairro',''), nullif(src.data->>'neighborhood','')),
  coalesce(nullif(src.data->>'cidade',''), nullif(src.data->>'city','')),
  coalesce(nullif(src.data->>'state',''), nullif(src.data->>'uf','')),
  coalesce(nullif(src.data->>'cep',''), nullif(src.data->>'zip','')),
  src.data
from tmp_backfill_students src
left join public.classes c
  on c.legacy_record_id = src.data->>'classId'
where nullif(src.legacy_record_id,'') is not null
on conflict (legacy_record_id) do update set
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
  updated_at = now();

commit;
