-- Purple Gestão — Fase 2.1 — Academic reconciliation read-only
-- NÃO ALTERA O BANCO

with legacy_teachers as (
  select data->>'id' as legacy_record_id, data
  from public.app_records
  where kind='teacher'
),
legacy_classes as (
  select data->>'id' as legacy_record_id, data
  from public.app_records
  where kind='class'
),
legacy_students as (
  select data->>'id' as legacy_record_id, data
  from public.app_records
  where kind='student'
),
typed_teachers as (
  select id, legacy_record_id, data from public.teachers
),
typed_classes as (
  select id, legacy_record_id, teacher_id, data from public.classes
),
typed_students as (
  select id, legacy_record_id, class_id, data from public.students
),
teacher_stats as (
  select
    'teachers'::text as entity,
    (select count(*) from legacy_teachers) as legacy_count,
    (select count(*) from typed_teachers) as typed_count,
    (select count(*) from legacy_teachers l join typed_teachers t using(legacy_record_id)) as matched_by_legacy_record_id,
    (select count(*) from legacy_teachers l left join typed_teachers t using(legacy_record_id) where t.id is null) as missing_in_typed,
    (select count(*) from (select legacy_record_id from typed_teachers where legacy_record_id is not null group by legacy_record_id having count(*) > 1) d) as duplicated_in_typed,
    0::bigint as orphan_teacher_link,
    0::bigint as orphan_class_link
),
class_stats as (
  select
    'classes'::text as entity,
    (select count(*) from legacy_classes) as legacy_count,
    (select count(*) from typed_classes) as typed_count,
    (select count(*) from legacy_classes l join typed_classes t using(legacy_record_id)) as matched_by_legacy_record_id,
    (select count(*) from legacy_classes l left join typed_classes t using(legacy_record_id) where t.id is null) as missing_in_typed,
    (select count(*) from (select legacy_record_id from typed_classes where legacy_record_id is not null group by legacy_record_id having count(*) > 1) d) as duplicated_in_typed,
    (select count(*)
     from legacy_classes l
     join typed_classes t using(legacy_record_id)
     left join public.teachers tt on tt.id = t.teacher_id
     where nullif(l.data->>'teacherId','') is not null and tt.id is null) as orphan_teacher_link,
    0::bigint as orphan_class_link
),
student_stats as (
  select
    'students'::text as entity,
    (select count(*) from legacy_students) as legacy_count,
    (select count(*) from typed_students) as typed_count,
    (select count(*) from legacy_students l join typed_students t using(legacy_record_id)) as matched_by_legacy_record_id,
    (select count(*) from legacy_students l left join typed_students t using(legacy_record_id) where t.id is null) as missing_in_typed,
    (select count(*) from (select legacy_record_id from typed_students where legacy_record_id is not null group by legacy_record_id having count(*) > 1) d) as duplicated_in_typed,
    0::bigint as orphan_teacher_link,
    (select count(*)
     from legacy_students l
     join typed_students t using(legacy_record_id)
     left join public.classes tc on tc.id = t.class_id
     where nullif(l.data->>'classId','') is not null and tc.id is null) as orphan_class_link
)
select * from teacher_stats
union all
select * from class_stats
union all
select * from student_stats
order by entity;
