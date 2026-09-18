-- Purple Gestão — Fase 2.1 — Financial reconciliation read-only
-- NÃO ALTERA O BANCO

with legacy as (
  select
    id as app_record_id,
    data->>'id' as legacy_record_id,
    coalesce(nullif(data->>'supabaseId',''), nullif(data->>'externalChargeId','')) as stable_identifier,
    nullif(data->>'studentId','') as student_id,
    coalesce(nullif(data->>'dueDate','')::date, nullif(data->>'paidDate','')::date) as due_date,
    coalesce(nullif(data->>'fullValue','')::numeric, nullif(data->>'amount','')::numeric, 0) as full_value,
    coalesce(nullif(data->>'punctualValue','')::numeric, nullif(data->>'amount','')::numeric, 0) as punctual_value,
    coalesce(nullif(data->>'discountValue','')::numeric, 0) as discount_value,
    nullif(data->>'competence','') as competence,
    coalesce((data->>'installmentNumber')::integer, 1) as installment_number,
    coalesce((data->>'installmentTotal')::integer, 1) as installment_total,
    upper(coalesce(nullif(data->>'status',''),'UNKNOWN')) as raw_status
  from public.app_records
  where kind='financial_entry'
),
typed as (
  select
    id::text as typed_id,
    legacy_record_id,
    coalesce(nullif(external_charge_id,''), nullif(external_reference,''), id::text) as stable_identifier,
    student_id,
    due_date,
    coalesce(full_value, value, 0) as full_value,
    coalesce(punctual_value, value, 0) as punctual_value,
    coalesce(discount_value, 0) as discount_value,
    competence,
    coalesce(installment_number, 1) as installment_number,
    coalesce(installment_total, 1) as installment_total,
    upper(coalesce(status,'UNKNOWN')) as raw_status
  from public.financial_charges
),
matched as (
  select
    l.app_record_id,
    l.legacy_record_id,
    t.typed_id,
    md5(concat_ws('|',
      coalesce(l.stable_identifier,''),
      coalesce(l.due_date::text,''),
      coalesce(l.full_value::text,''),
      coalesce(l.punctual_value::text,''),
      coalesce(l.discount_value::text,''),
      coalesce(l.competence,''),
      coalesce(l.installment_number::text,''),
      coalesce(l.installment_total::text,''),
      coalesce(l.raw_status,'')
    )) as legacy_fingerprint,
    md5(concat_ws('|',
      coalesce(t.stable_identifier,''),
      coalesce(t.due_date::text,''),
      coalesce(t.full_value::text,''),
      coalesce(t.punctual_value::text,''),
      coalesce(t.discount_value::text,''),
      coalesce(t.competence,''),
      coalesce(t.installment_number::text,''),
      coalesce(t.installment_total::text,''),
      coalesce(t.raw_status,'')
    )) as typed_fingerprint,
    case
      when t.typed_id is null then 'LEGACY_ONLY'
      when l.stable_identifier is not null
       and l.stable_identifier = t.stable_identifier
       and md5(concat_ws('|',
         coalesce(l.stable_identifier,''),
         coalesce(l.due_date::text,''),
         coalesce(l.full_value::text,''),
         coalesce(l.punctual_value::text,''),
         coalesce(l.discount_value::text,''),
         coalesce(l.competence,''),
         coalesce(l.installment_number::text,''),
         coalesce(l.installment_total::text,''),
         coalesce(l.raw_status,'')
       )) = md5(concat_ws('|',
         coalesce(t.stable_identifier,''),
         coalesce(t.due_date::text,''),
         coalesce(t.full_value::text,''),
         coalesce(t.punctual_value::text,''),
         coalesce(t.discount_value::text,''),
         coalesce(t.competence,''),
         coalesce(t.installment_number::text,''),
         coalesce(t.installment_total::text,''),
         coalesce(t.raw_status,'')
       )) then 'MATCHED'
      when l.stable_identifier is not null and l.stable_identifier = t.stable_identifier then 'DIVERGENT'
      when l.student_id = t.student_id
       and l.due_date is not distinct from t.due_date
       and l.full_value is not distinct from t.full_value
       and l.installment_number is not distinct from t.installment_number
      then 'MATCHED'
      when l.student_id = t.student_id
       and l.due_date is not distinct from t.due_date
       and l.full_value is distinct from t.full_value
      then 'DIVERGENT'
      when l.student_id = t.student_id
       and l.due_date is not distinct from t.due_date
      then 'AMBIGUOUS'
      else 'DIVERGENT'
    end as classification
  from legacy l
  left join lateral (
    select *
    from typed t
    where (l.stable_identifier is not null and l.stable_identifier = t.stable_identifier)
       or (l.legacy_record_id is not null and l.legacy_record_id = t.legacy_record_id)
       or (
         l.student_id = t.student_id
         and l.due_date is not distinct from t.due_date
       )
    order by
      case when l.stable_identifier = t.stable_identifier then 0 else 1 end,
      case when l.legacy_record_id = t.legacy_record_id then 0 else 1 end,
      case when l.full_value is not distinct from t.full_value then 0 else 1 end
    limit 1
  ) t on true
)
select
  (select count(*) from legacy) as legacy_count,
  (select count(*) from typed) as typed_count,
  (select count(*) from matched where classification='MATCHED') as matched_count,
  (select count(*) from matched where classification='LEGACY_ONLY') as legacy_only,
  (select count(*) from typed t where not exists (select 1 from matched m where m.typed_id = t.typed_id)) as typed_only,
  (select count(*) from matched where classification='DIVERGENT') as divergent,
  (select count(*) from matched where classification='AMBIGUOUS') as ambiguous,
  (select count(*) from matched where classification='MATCHED' and legacy_fingerprint = typed_fingerprint) as fingerprint_match_count;
