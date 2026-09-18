-- Purple Gestão — Fase 2.1 — Cutover validation read-only
-- NÃO ALTERA O BANCO

with academic as (
  select
    sum(case when entity='teachers' then missing_in_typed else 0 end
      + case when entity='classes' then missing_in_typed else 0 end
      + case when entity='students' then missing_in_typed else 0 end) as missing_total,
    sum(duplicated_in_typed) as duplicate_total,
    sum(orphan_teacher_link) as orphan_teacher_total,
    sum(orphan_class_link) as orphan_class_total
  from (
    with legacy_teachers as (
      select data->>'id' as legacy_record_id from public.app_records where kind='teacher'
    ),
    legacy_classes as (
      select data->>'id' as legacy_record_id, data from public.app_records where kind='class'
    ),
    legacy_students as (
      select data->>'id' as legacy_record_id, data from public.app_records where kind='student'
    )
    select
      'teachers'::text as entity,
      (select count(*) from legacy_teachers l left join public.teachers t using(legacy_record_id) where t.id is null) as missing_in_typed,
      (select count(*) from (select legacy_record_id from public.teachers where legacy_record_id is not null group by legacy_record_id having count(*)>1) d) as duplicated_in_typed,
      0::bigint as orphan_teacher_link,
      0::bigint as orphan_class_link
    union all
    select
      'classes',
      (select count(*) from legacy_classes l left join public.classes c using(legacy_record_id) where c.id is null),
      (select count(*) from (select legacy_record_id from public.classes where legacy_record_id is not null group by legacy_record_id having count(*)>1) d),
      (select count(*) from legacy_classes l join public.classes c using(legacy_record_id) left join public.teachers t on t.id = c.teacher_id where nullif(l.data->>'teacherId','') is not null and t.id is null),
      0::bigint
    union all
    select
      'students',
      (select count(*) from legacy_students l left join public.students s using(legacy_record_id) where s.id is null),
      (select count(*) from (select legacy_record_id from public.students where legacy_record_id is not null group by legacy_record_id having count(*)>1) d),
      0::bigint,
      (select count(*) from legacy_students l join public.students s using(legacy_record_id) left join public.classes c on c.id = s.class_id where nullif(l.data->>'classId','') is not null and c.id is null)
  ) x
),
financial as (
  with legacy as (
    select coalesce(nullif(data->>'supabaseId',''), nullif(data->>'externalChargeId','')) as stable_identifier,
           nullif(data->>'studentId','') as student_id,
           coalesce(nullif(data->>'dueDate','')::date, nullif(data->>'paidDate','')::date) as due_date
    from public.app_records
    where kind='financial_entry'
  ),
  typed as (
    select coalesce(nullif(external_charge_id,''), nullif(external_reference,''), id::text) as stable_identifier,
           student_id,
           due_date
    from public.financial_charges
  )
  select
    (select count(*) from legacy l left join typed t on (l.stable_identifier is not null and l.stable_identifier=t.stable_identifier) or (l.student_id=t.student_id and l.due_date is not distinct from t.due_date) where t.stable_identifier is null) as legacy_only,
    (select count(*) from typed t left join legacy l on (l.stable_identifier is not null and l.stable_identifier=t.stable_identifier) or (l.student_id=t.student_id and l.due_date is not distinct from t.due_date) where l.stable_identifier is null and l.student_id is null) as typed_only
)
select
  case
    when academic.missing_total > 0
      or academic.duplicate_total > 0
      or academic.orphan_teacher_total > 0
      or academic.orphan_class_total > 0
      or financial.legacy_only > 0
      or financial.typed_only > 0
    then 'NO-GO'
    else 'GO'
  end as cutover_result,
  academic.*,
  financial.*
from academic, financial;
