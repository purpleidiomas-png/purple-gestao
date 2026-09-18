-- PURPLE GESTÃO
-- PRODUCTION PRE-FLIGHT
-- READ-ONLY
-- PROJECT REF ESPERADO: qqlymzyvvgmbyuhswipp
-- DATA: 2026-08-28
--
-- Este arquivo é 100% read-only.
-- Permitido: SELECT, WITH/CTE, information_schema, pg_catalog e views administrativas.
-- Proibido: qualquer comando de escrita ou alteração de schema/configuração.

with relevant_tables as (
  select unnest(array[
    'profiles',
    'app_records',
    'students',
    'classes',
    'teachers',
    'financial_charges',
    'financial_payments',
    'financial_ledger_entries',
    'integrated_cases',
    'integrated_case_sector_details',
    'student_followups',
    'twr_teacher_profiles',
    'twr_schedule_windows',
    'twr_activities',
    'twr_publication_history',
    'class_opening_analyses',
    'class_opening_checklist',
    'class_opening_history',
    'production_books',
    'production_book_print_specs',
    'production_print_profiles',
    'production_print_profile_ranges',
    'production_book_progressions',
    'production_book_orders',
    'production_book_order_classes',
    'production_book_order_students',
    'production_book_order_recipients',
    'production_book_order_items',
    'production_book_order_spec_snapshots',
    'production_book_order_status_history'
  ]) as table_name
),
relevant_functions as (
  select unnest(array[
    'save_integrated_case',
    'list_integrated_cases',
    'create_production_book_order',
    'create_production_book_order_v3',
    'advance_production_book_order_status',
    'save_production_print_profile',
    'save_production_book_config',
    'remove_production_book_config',
    'remove_production_print_profile',
    'default_permissions',
    'has_permission',
    'has_sector_access',
    'my_sector',
    'is_direction',
    'is_viewer',
    'touch_updated_at',
    'record_my_audit_event',
    'update_my_last_login',
    'update_my_profile'
  ]) as function_name
)
select
  '0.1_PROJECT_CONTEXT' as section,
  current_database() as database_name,
  current_schema() as current_schema,
  current_user as current_user,
  now() as executed_at
;

-- 1. SCHEMA — existência das tabelas relevantes
with relevant_tables as (
  select unnest(array[
    'profiles','app_records','students','classes','teachers',
    'financial_charges','financial_payments','financial_ledger_entries',
    'integrated_cases','integrated_case_sector_details',
    'student_followups',
    'twr_teacher_profiles','twr_schedule_windows','twr_activities','twr_publication_history',
    'class_opening_analyses','class_opening_checklist','class_opening_history',
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students',
    'production_book_order_recipients','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  ]) as table_name
)
select
  '1.1_SCHEMA_TABLES' as section,
  rt.table_name,
  case when c.oid is null then 'TABLE_NOT_FOUND' else 'EXISTS' end as status,
  c.relkind as relkind
from relevant_tables rt
left join pg_catalog.pg_class c
  on c.relname = rt.table_name
 and c.relnamespace = 'public'::regnamespace
order by rt.table_name
;

-- 2. COLUMNS — coluna, tipo, nullable, default
with relevant_tables as (
  select unnest(array[
    'profiles','app_records','students','classes','teachers',
    'financial_charges','financial_payments','financial_ledger_entries',
    'integrated_cases','integrated_case_sector_details',
    'student_followups',
    'twr_teacher_profiles','twr_schedule_windows','twr_activities','twr_publication_history',
    'class_opening_analyses','class_opening_checklist','class_opening_history',
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students',
    'production_book_order_recipients','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  ]) as table_name
)
select
  '2.1_COLUMNS' as section,
  rt.table_name,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from relevant_tables rt
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = rt.table_name
order by rt.table_name, c.ordinal_position
;

-- 3. PRIMARY KEYS
with relevant_tables as (
  select unnest(array[
    'profiles','app_records','students','classes','teachers',
    'financial_charges','financial_payments','financial_ledger_entries',
    'integrated_cases','integrated_case_sector_details',
    'student_followups',
    'twr_teacher_profiles','twr_schedule_windows','twr_activities','twr_publication_history',
    'class_opening_analyses','class_opening_checklist','class_opening_history',
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students',
    'production_book_order_recipients','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  ]) as table_name
)
select
  '3.1_PRIMARY_KEYS' as section,
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as pk_columns
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
 and kcu.table_name = tc.table_name
where tc.table_schema = 'public'
  and tc.constraint_type = 'PRIMARY KEY'
  and tc.table_name in (select table_name from relevant_tables)
group by tc.table_name, tc.constraint_name
order by tc.table_name, tc.constraint_name
;

-- 4. FOREIGN KEYS
with relevant_tables as (
  select unnest(array[
    'profiles','app_records','students','classes','teachers',
    'financial_charges','financial_payments','financial_ledger_entries',
    'integrated_cases','integrated_case_sector_details',
    'student_followups',
    'twr_teacher_profiles','twr_schedule_windows','twr_activities','twr_publication_history',
    'class_opening_analyses','class_opening_checklist','class_opening_history',
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students',
    'production_book_order_recipients','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  ]) as table_name
)
select
  '4.1_FOREIGN_KEYS' as section,
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as fk_columns,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  string_agg(ccu.column_name, ', ' order by kcu.ordinal_position) as referenced_columns
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
 and kcu.table_name = tc.table_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
  and tc.table_name in (select table_name from relevant_tables)
group by tc.table_name, tc.constraint_name, ccu.table_schema, ccu.table_name
order by tc.table_name, tc.constraint_name
;

-- 5. INDEXES
with relevant_tables as (
  select unnest(array[
    'profiles','app_records','students','classes','teachers',
    'financial_charges','financial_payments','financial_ledger_entries',
    'integrated_cases','integrated_case_sector_details',
    'student_followups',
    'twr_teacher_profiles','twr_schedule_windows','twr_activities','twr_publication_history',
    'class_opening_analyses','class_opening_checklist','class_opening_history',
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students',
    'production_book_order_recipients','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  ]) as table_name
)
select
  '5.1_INDEXES' as section,
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (select table_name from relevant_tables)
order by tablename, indexname
;

-- 6. RLS ENABLED/DISABLED
with relevant_tables as (
  select unnest(array[
    'profiles','app_records','students','classes','teachers',
    'financial_charges','financial_payments','financial_ledger_entries',
    'integrated_cases','integrated_case_sector_details',
    'student_followups',
    'twr_teacher_profiles','twr_schedule_windows','twr_activities','twr_publication_history',
    'class_opening_analyses','class_opening_checklist','class_opening_history',
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students',
    'production_book_order_recipients','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  ]) as table_name
)
select
  '6.1_RLS_STATUS' as section,
  rt.table_name,
  case when c.oid is null then 'TABLE_NOT_FOUND'
       when c.relrowsecurity then 'RLS_ENABLED'
       else 'RLS_DISABLED'
  end as rls_status,
  c.relforcerowsecurity as force_rls
from relevant_tables rt
left join pg_catalog.pg_class c
  on c.relname = rt.table_name
 and c.relnamespace = 'public'::regnamespace
order by rt.table_name
;

-- 7. POLICIES
with relevant_tables as (
  select unnest(array[
    'profiles','app_records','students','classes','teachers',
    'financial_charges','financial_payments','financial_ledger_entries',
    'integrated_cases','integrated_case_sector_details',
    'student_followups',
    'twr_teacher_profiles','twr_schedule_windows','twr_activities','twr_publication_history',
    'class_opening_analyses','class_opening_checklist','class_opening_history',
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students',
    'production_book_order_recipients','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  ]) as table_name
)
select
  '7.1_POLICIES' as section,
  p.schemaname,
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual as using_expression,
  p.with_check
from pg_policies p
where p.schemaname = 'public'
  and p.tablename in (select table_name from relevant_tables)
order by p.tablename, p.policyname
;

-- 8. GRANTS relevantes
with relevant_tables as (
  select unnest(array[
    'profiles','app_records','students','classes','teachers',
    'financial_charges','financial_payments','financial_ledger_entries',
    'integrated_cases','integrated_case_sector_details',
    'student_followups',
    'twr_teacher_profiles','twr_schedule_windows','twr_activities','twr_publication_history',
    'class_opening_analyses','class_opening_checklist','class_opening_history',
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students',
    'production_book_order_recipients','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  ]) as table_name
)
select
  '8.1_TABLE_GRANTS' as section,
  g.table_schema,
  g.table_name,
  g.grantee,
  g.privilege_type,
  g.is_grantable
from information_schema.role_table_grants g
where g.table_schema = 'public'
  and g.table_name in (select table_name from relevant_tables)
order by g.table_name, g.grantee, g.privilege_type
;

-- 9. FUNCTIONS / RPCS — sem executar
with relevant_functions as (
  select unnest(array[
    'save_integrated_case',
    'list_integrated_cases',
    'create_production_book_order',
    'create_production_book_order_v3',
    'advance_production_book_order_status',
    'save_production_print_profile',
    'save_production_book_config',
    'remove_production_book_config',
    'remove_production_print_profile',
    'default_permissions',
    'has_permission',
    'has_sector_access',
    'my_sector',
    'is_direction',
    'is_viewer',
    'touch_updated_at',
    'record_my_audit_event',
    'update_my_last_login',
    'update_my_profile'
  ]) as function_name
)
select
  '9.1_FUNCTIONS' as section,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as function_arguments,
  pg_catalog.pg_get_function_result(p.oid) as return_type,
  case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security_mode,
  l.lanname as language_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
  and p.proname in (select function_name from relevant_functions)
order by p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)
;

-- 10. CONTAGENS — tabelas principais (robusto para tabela ausente)
with target_tables as (
  select * from (
    values
      ('10.1_COUNT_profiles', 'profiles'),
      ('10.2_COUNT_app_records', 'app_records'),
      ('10.3_COUNT_students', 'students'),
      ('10.4_COUNT_classes', 'classes'),
      ('10.5_COUNT_teachers', 'teachers'),
      ('10.6_COUNT_financial_charges', 'financial_charges'),
      ('10.7_COUNT_financial_payments', 'financial_payments'),
      ('10.8_COUNT_financial_ledger_entries', 'financial_ledger_entries'),
      ('10.9_COUNT_integrated_cases', 'integrated_cases'),
      ('10.10_COUNT_production_books', 'production_books'),
      ('10.11_COUNT_production_book_orders', 'production_book_orders'),
      ('10.12_COUNT_production_book_order_items', 'production_book_order_items'),
      ('10.13_COUNT_production_book_order_recipients', 'production_book_order_recipients')
  ) as t(section, table_name)
)
select
  tt.section,
  tt.table_name,
  case when to_regclass('public.' || tt.table_name) is null then 'TABLE_NOT_FOUND' else 'OK' end as status,
  case
    when to_regclass('public.' || tt.table_name) is null then null
    else (
      xpath('/row/cnt/text()', query_to_xml(format('select count(*) as cnt from public.%I', tt.table_name), false, true, ''))
    )[1]::text::bigint
  end as row_count
from target_tables tt
order by tt.section
;

-- 10.14 app_records por kind
select
  '10.14_COUNT_app_records_by_kind' as section,
  kind,
  count(*) as row_count
from public.app_records
group by kind
order by kind
;

-- 10.15 financeiro agregado sem PII
with checks as (
  select
    to_regclass('public.financial_charges') is not null as has_table,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'financial_charges'
        and column_name = 'status'
    ) as has_status
)
select
  '10.15_FINANCIAL_CHARGES_BY_STATUS' as section,
  case
    when not has_table then 'TABLE_NOT_FOUND'
    when not has_status then 'COLUMN_NOT_FOUND'
    else x.status_value
  end as status,
  case
    when not has_table or not has_status then null
    else x.row_count
  end as row_count
from checks c
left join lateral (
  select
    (xpath('/row/status/text()', row_xml))[1]::text as status_value,
    (xpath('/row/cnt/text()', row_xml))[1]::text::bigint as row_count
  from unnest(xpath(
    '/table/row',
    query_to_xml(
      'select status, count(*) as cnt from public.financial_charges group by status order by status',
      false, false, ''
    )
  )) as row_xml
  where c.has_table and c.has_status
) x on true
order by status
;

with checks as (
  select
    to_regclass('public.financial_payments') is not null as has_table,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'financial_payments'
        and column_name = 'status'
    ) as has_status
)
select
  '10.16_FINANCIAL_PAYMENTS_BY_STATUS' as section,
  case
    when not has_table then 'TABLE_NOT_FOUND'
    when not has_status then 'COLUMN_NOT_FOUND'
    else x.status_value
  end as status,
  case
    when not has_table or not has_status then null
    else x.row_count
  end as row_count
from checks c
left join lateral (
  select
    (xpath('/row/status/text()', row_xml))[1]::text as status_value,
    (xpath('/row/cnt/text()', row_xml))[1]::text::bigint as row_count
  from unnest(xpath(
    '/table/row',
    query_to_xml(
      'select status, count(*) as cnt from public.financial_payments group by status order by status',
      false, false, ''
    )
  )) as row_xml
  where c.has_table and c.has_status
) x on true
order by status
;

with column_candidates as (
  select *
  from (
    values
      ('asaas_payment_id'),
      ('asaas_charge_id'),
      ('asaas_id'),
      ('external_id'),
      ('provider_reference'),
      ('provider_id')
  ) as t(column_name)
),
selected_column as (
  select cc.column_name
  from column_candidates cc
  where exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'financial_charges'
      and c.column_name = cc.column_name
  )
  order by case cc.column_name
    when 'asaas_payment_id' then 1
    when 'asaas_charge_id' then 2
    when 'asaas_id' then 3
    when 'external_id' then 4
    when 'provider_reference' then 5
    when 'provider_id' then 6
    else 99
  end
  limit 1
),
table_check as (
  select to_regclass('public.financial_charges') is not null as has_table
)
select
  '10.17_FINANCIAL_CHARGES_ASAAS_ID_PRESENCE' as section,
  coalesce(sc.column_name, case when not tc.has_table then 'TABLE_NOT_FOUND' else 'COLUMN_NOT_FOUND' end) as identifier_source,
  x.presence_label,
  x.row_count
from table_check tc
left join selected_column sc on true
left join lateral (
  select
    (xpath('/row/presence/text()', row_xml))[1]::text as presence_label,
    (xpath('/row/cnt/text()', row_xml))[1]::text::bigint as row_count
  from unnest(xpath(
    '/table/row',
      query_to_xml(
        format(
          'select case when %1$I is null or btrim(%1$I::text) = '''' then ''WITHOUT_ASAAS_ID'' else ''WITH_ASAAS_ID'' end as presence, count(*) as cnt from public.financial_charges group by 1 order by 1',
          sc.column_name
        ),
      false, false, ''
    )
  )) as row_xml
  where tc.has_table and sc.column_name is not null
) x on true
order by identifier_source, presence_label
;

select
  '10.18_LEGACY_FINANCIAL_ENTRY_COUNT' as section,
  count(*) as row_count
from public.app_records
where kind = 'financial_entry'
;

-- 11. RECONCILIAÇÃO ACADÊMICA — sem comparação por nome
-- 11.1 Students x app_records(kind='student')
with guard as (
  select
    to_regclass('public.app_records') is not null as has_app_records,
    to_regclass('public.students') is not null as has_students
),
legacy_students as (
  select
    id as app_record_id,
    nullif(data->>'supabaseId', '') as linked_uuid,
    coalesce(nullif(data->>'legacyId', ''), nullif(data->>'id', '')) as legacy_record_id
  from public.app_records
  where kind = 'student'
    and (select has_app_records from guard)
),
typed_students as (
  select
    (xpath('/row/typed_uuid/text()', row_xml))[1]::text as typed_uuid,
    (xpath('/row/legacy_record_id/text()', row_xml))[1]::text as legacy_record_id
  from guard g
  cross join lateral unnest(xpath(
    '/table/row',
    case
      when g.has_students then query_to_xml(
        $$select id::text as typed_uuid,
                 coalesce(nullif(legacy_record_id, ''), nullif(data->>'legacyId', ''), nullif(data->>'id', '')) as legacy_record_id
          from public.students$$,
        false, false, ''
      )
      else xmlparse(document '<table/>')
    end
  )) as row_xml
),
matches as (
  select distinct ls.app_record_id
  from legacy_students ls
  join typed_students ts
    on (
      ls.linked_uuid is not null
      and ts.typed_uuid = ls.linked_uuid
    )
    or (
      ls.legacy_record_id is not null
      and ts.legacy_record_id is not null
      and ls.legacy_record_id = ts.legacy_record_id
    )
),
only_typed as (
  select count(*) as c
  from typed_students ts
  where not exists (
    select 1
    from legacy_students ls
    where (ls.linked_uuid is not null and ls.linked_uuid = ts.typed_uuid)
       or (ls.legacy_record_id is not null and ts.legacy_record_id is not null and ls.legacy_record_id = ts.legacy_record_id)
  )
),
only_legacy as (
  select count(*) as c
  from legacy_students ls
  where not exists (
    select 1
    from typed_students ts
    where (ls.linked_uuid is not null and ts.typed_uuid = ls.linked_uuid)
       or (ls.legacy_record_id is not null and ts.legacy_record_id is not null and ls.legacy_record_id = ts.legacy_record_id)
  )
)
select
  '11.1_STUDENTS_RECONCILIATION' as section,
  case
    when not (select has_app_records from guard) then 'APP_RECORDS_TABLE_NOT_FOUND'
    when not (select has_students from guard) then 'TYPED_TABLE_NOT_FOUND'
    else 'OK'
  end as status,
  (select count(*) from typed_students) as typed_count,
  (select count(*) from legacy_students) as legacy_count,
  (select count(*) from matches) as exact_or_reliable_match_count,
  (select c from only_typed) as only_typed_count,
  (select c from only_legacy) as only_legacy_count
;

-- 11.2 Classes x app_records(kind='class')
with guard as (
  select
    to_regclass('public.app_records') is not null as has_app_records,
    to_regclass('public.classes') is not null as has_classes
),
legacy_classes as (
  select
    id as app_record_id,
    nullif(data->>'supabaseId', '') as linked_uuid,
    coalesce(nullif(data->>'legacyId', ''), nullif(data->>'id', '')) as legacy_record_id
  from public.app_records
  where kind = 'class'
    and (select has_app_records from guard)
),
typed_classes as (
  select
    (xpath('/row/typed_uuid/text()', row_xml))[1]::text as typed_uuid,
    (xpath('/row/legacy_record_id/text()', row_xml))[1]::text as legacy_record_id
  from guard g
  cross join lateral unnest(xpath(
    '/table/row',
    case
      when g.has_classes then query_to_xml(
        $$select id::text as typed_uuid,
                 coalesce(nullif(legacy_record_id, ''), nullif(data->>'legacyId', ''), nullif(data->>'id', '')) as legacy_record_id
          from public.classes$$,
        false, false, ''
      )
      else xmlparse(document '<table/>')
    end
  )) as row_xml
),
matches as (
  select distinct lc.app_record_id
  from legacy_classes lc
  join typed_classes tc
    on (
      lc.linked_uuid is not null
      and tc.typed_uuid = lc.linked_uuid
    )
    or (
      lc.legacy_record_id is not null
      and tc.legacy_record_id is not null
      and lc.legacy_record_id = tc.legacy_record_id
    )
),
only_typed as (
  select count(*) as c
  from typed_classes tc
  where not exists (
    select 1
    from legacy_classes lc
    where (lc.linked_uuid is not null and lc.linked_uuid = tc.typed_uuid)
       or (lc.legacy_record_id is not null and tc.legacy_record_id is not null and lc.legacy_record_id = tc.legacy_record_id)
  )
),
only_legacy as (
  select count(*) as c
  from legacy_classes lc
  where not exists (
    select 1
    from typed_classes tc
    where (lc.linked_uuid is not null and tc.typed_uuid = lc.linked_uuid)
       or (lc.legacy_record_id is not null and tc.legacy_record_id is not null and lc.legacy_record_id = tc.legacy_record_id)
  )
)
select
  '11.2_CLASSES_RECONCILIATION' as section,
  case
    when not (select has_app_records from guard) then 'APP_RECORDS_TABLE_NOT_FOUND'
    when not (select has_classes from guard) then 'TYPED_TABLE_NOT_FOUND'
    else 'OK'
  end as status,
  (select count(*) from typed_classes) as typed_count,
  (select count(*) from legacy_classes) as legacy_count,
  (select count(*) from matches) as exact_or_reliable_match_count,
  (select c from only_typed) as only_typed_count,
  (select c from only_legacy) as only_legacy_count
;

-- 11.3 Teachers x app_records(kind='teacher')
with guard as (
  select
    to_regclass('public.app_records') is not null as has_app_records,
    to_regclass('public.teachers') is not null as has_teachers
),
legacy_teachers as (
  select
    id as app_record_id,
    nullif(data->>'supabaseId', '') as linked_uuid,
    coalesce(nullif(data->>'legacyId', ''), nullif(data->>'id', '')) as legacy_record_id
  from public.app_records
  where kind = 'teacher'
    and (select has_app_records from guard)
),
typed_teachers as (
  select
    (xpath('/row/typed_uuid/text()', row_xml))[1]::text as typed_uuid,
    (xpath('/row/legacy_record_id/text()', row_xml))[1]::text as legacy_record_id
  from guard g
  cross join lateral unnest(xpath(
    '/table/row',
    case
      when g.has_teachers then query_to_xml(
        $$select id::text as typed_uuid,
                 coalesce(nullif(legacy_record_id, ''), nullif(data->>'legacyId', ''), nullif(data->>'id', '')) as legacy_record_id
          from public.teachers$$,
        false, false, ''
      )
      else xmlparse(document '<table/>')
    end
  )) as row_xml
),
matches as (
  select distinct lt.app_record_id
  from legacy_teachers lt
  join typed_teachers tt
    on (
      lt.linked_uuid is not null
      and tt.typed_uuid = lt.linked_uuid
    )
    or (
      lt.legacy_record_id is not null
      and tt.legacy_record_id is not null
      and lt.legacy_record_id = tt.legacy_record_id
    )
),
only_typed as (
  select count(*) as c
  from typed_teachers tt
  where not exists (
    select 1
    from legacy_teachers lt
    where (lt.linked_uuid is not null and lt.linked_uuid = tt.typed_uuid)
       or (lt.legacy_record_id is not null and tt.legacy_record_id is not null and lt.legacy_record_id = tt.legacy_record_id)
  )
),
only_legacy as (
  select count(*) as c
  from legacy_teachers lt
  where not exists (
    select 1
    from typed_teachers tt
    where (lt.linked_uuid is not null and tt.typed_uuid = lt.linked_uuid)
       or (lt.legacy_record_id is not null and tt.legacy_record_id is not null and lt.legacy_record_id = tt.legacy_record_id)
  )
)
select
  '11.3_TEACHERS_RECONCILIATION' as section,
  case
    when not (select has_app_records from guard) then 'APP_RECORDS_TABLE_NOT_FOUND'
    when not (select has_teachers from guard) then 'TYPED_TABLE_NOT_FOUND'
    else 'OK'
  end as status,
  (select count(*) from typed_teachers) as typed_count,
  (select count(*) from legacy_teachers) as legacy_count,
  (select count(*) from matches) as exact_or_reliable_match_count,
  (select c from only_typed) as only_typed_count,
  (select c from only_legacy) as only_legacy_count
;

-- 12. FOLLOW-UP / TIMELINE — somente estrutura e contagens
with student_json as (
  select data
  from public.app_records
  where kind = 'student'
),
timeline_stats as (
  select
    count(*) filter (where jsonb_typeof(coalesce(data->'timeline', '[]'::jsonb)) = 'array' and jsonb_array_length(coalesce(data->'timeline', '[]'::jsonb)) > 0) as students_with_timeline,
    coalesce(sum(case when jsonb_typeof(coalesce(data->'timeline', '[]'::jsonb)) = 'array' then jsonb_array_length(coalesce(data->'timeline', '[]'::jsonb)) else 0 end), 0) as total_timeline_events
  from student_json
),
timeline_events as (
  select e.value as event
  from student_json sj
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(sj.data->'timeline', '[]'::jsonb)) = 'array' then coalesce(sj.data->'timeline', '[]'::jsonb)
      else '[]'::jsonb
    end
  ) e(value)
),
timeline_keys as (
  select key, count(*) as occurrences
  from timeline_events te
  cross join lateral jsonb_object_keys(case when jsonb_typeof(te.event) = 'object' then te.event else '{}'::jsonb end) key
  group by key
),
followup_stats as (
  select
    count(*) filter (where jsonb_typeof(coalesce(data->'followUpEntries', '[]'::jsonb)) = 'array' and jsonb_array_length(coalesce(data->'followUpEntries', '[]'::jsonb)) > 0) as students_with_followups,
    coalesce(sum(case when jsonb_typeof(coalesce(data->'followUpEntries', '[]'::jsonb)) = 'array' then jsonb_array_length(coalesce(data->'followUpEntries', '[]'::jsonb)) else 0 end), 0) as total_followup_events
  from student_json
),
followup_events as (
  select e.value as event
  from student_json sj
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(sj.data->'followUpEntries', '[]'::jsonb)) = 'array' then coalesce(sj.data->'followUpEntries', '[]'::jsonb)
      else '[]'::jsonb
    end
  ) e(value)
),
followup_keys as (
  select key, count(*) as occurrences
  from followup_events fe
  cross join lateral jsonb_object_keys(case when jsonb_typeof(fe.event) = 'object' then fe.event else '{}'::jsonb end) key
  group by key
)
select
  '12.1_TIMELINE_SUMMARY' as section,
  ts.students_with_timeline,
  ts.total_timeline_events,
  (select count(*) from timeline_events where event ? 'date' or event ? 'at' or event ? 'createdAt') as events_with_date,
  (select count(*) from timeline_events where event ? 'author' or event ? 'authorName' or event ? 'employee' or event ? 'userId') as events_with_author,
  (select count(*) from timeline_events where event ? 'source' or event ? 'origin' or event ? 'module') as events_with_origin
from timeline_stats ts
;

select
  '12.2_TIMELINE_KEYS' as section,
  key,
  occurrences
from timeline_keys
order by occurrences desc, key
;

select
  '12.3_TIMELINE_EVENT_TYPE_GUESS' as section,
  case
    when coalesce(event->>'type', event->>'category', event->>'kind', event->>'source', event->>'origin', 'UNSPECIFIED') ilike '%follow%' then 'FOLLOW_UP'
    when coalesce(event->>'type', event->>'category', event->>'kind', event->>'source', event->>'origin', 'UNSPECIFIED') ilike '%whatsapp%' then 'FOLLOW_UP'
    when coalesce(event->>'type', event->>'category', event->>'kind', event->>'source', event->>'origin', 'UNSPECIFIED') ilike '%twr%' then 'FOLLOW_UP'
    when coalesce(event->>'type', event->>'category', event->>'kind', event->>'source', event->>'origin', 'UNSPECIFIED') ilike '%financial%' then 'FINANCIAL'
    when coalesce(event->>'type', event->>'category', event->>'kind', event->>'source', event->>'origin', 'UNSPECIFIED') ilike '%system%' then 'SYSTEM_EVENT'
    when coalesce(event->>'type', event->>'category', event->>'kind', event->>'source', event->>'origin', 'UNSPECIFIED') ilike '%class%' then 'ACADEMIC_EVENT'
    else 'OTHER_OR_UNSPECIFIED'
  end as classified_group,
  count(*) as row_count
from timeline_events
group by 1
order by 1
;

select
  '12.4_FOLLOWUP_SUMMARY' as section,
  fs.students_with_followups,
  fs.total_followup_events,
  (select count(*) from followup_events where event ? 'date' or event ? 'at' or event ? 'createdAt' or event ? 'contactDate') as events_with_date,
  (select count(*) from followup_events where event ? 'author' or event ? 'authorName' or event ? 'employee' or event ? 'userId') as events_with_author,
  (select count(*) from followup_events where event ? 'source' or event ? 'origin' or event ? 'module' or event ? 'type') as events_with_origin
from followup_stats fs
;

select
  '12.5_FOLLOWUP_KEYS' as section,
  key,
  occurrences
from followup_keys
order by occurrences desc, key
;

-- 13. SETTINGS / TWR / CLASS OPENING
with settings_rows as (
  select id, data
  from public.app_records
  where kind = 'settings'
),
top_keys as (
  select key, count(*) as occurrences
  from settings_rows sr
  cross join lateral jsonb_object_keys(case when jsonb_typeof(sr.data) = 'object' then sr.data else '{}'::jsonb end) key
  group by key
),
twr_candidates as (
  select id, data->'twr' as twr_data
  from settings_rows
  where data ? 'twr'
),
class_opening_candidates as (
  select id, data #> '{twr,classOpening}' as class_opening_data
  from settings_rows
  where data ? 'twr'
    and (data->'twr') ? 'classOpening'
)
select
  '13.1_SETTINGS_SUMMARY' as section,
  count(*) as settings_rows,
  count(*) filter (where data ? 'twr') as rows_with_twr,
  count(*) filter (where data ? 'twr' and (data->'twr') ? 'classOpening') as rows_with_class_opening
from settings_rows
;

select
  '13.2_SETTINGS_TOP_KEYS' as section,
  key,
  occurrences
from top_keys
order by occurrences desc, key
;

select
  '13.3_TWR_JSON_KEYS' as section,
  key,
  count(*) as occurrences
from twr_candidates tc
cross join lateral jsonb_object_keys(case when jsonb_typeof(tc.twr_data) = 'object' then tc.twr_data else '{}'::jsonb end) key
group by key
order by occurrences desc, key
;

select
  '13.4_CLASS_OPENING_JSON_KEYS' as section,
  key,
  count(*) as occurrences
from class_opening_candidates coc
cross join lateral jsonb_object_keys(case when jsonb_typeof(coc.class_opening_data) = 'object' then coc.class_opening_data else '{}'::jsonb end) key
group by key
order by occurrences desc, key
;

with target_tables as (
  select * from (
    values
      ('13.5_COUNT_student_followups', 'student_followups'),
      ('13.6_COUNT_twr_teacher_profiles', 'twr_teacher_profiles'),
      ('13.7_COUNT_twr_schedule_windows', 'twr_schedule_windows'),
      ('13.8_COUNT_twr_activities', 'twr_activities'),
      ('13.9_COUNT_twr_publication_history', 'twr_publication_history'),
      ('13.10_COUNT_class_opening_analyses', 'class_opening_analyses'),
      ('13.11_COUNT_class_opening_checklist', 'class_opening_checklist'),
      ('13.12_COUNT_class_opening_history', 'class_opening_history')
  ) as t(section, table_name)
)
select
  tt.section,
  tt.table_name,
  case when to_regclass('public.' || tt.table_name) is null then 'TABLE_NOT_FOUND' else 'OK' end as status,
  case
    when to_regclass('public.' || tt.table_name) is null then null
    else (
      xpath('/row/cnt/text()', query_to_xml(format('select count(*) as cnt from public.%I', tt.table_name), false, true, ''))
    )[1]::text::bigint
  end as row_count
from target_tables tt
order by tt.section
;

-- 14. BOOK PRODUCTION — fotografia administrativa
select
  '14.1_BOOK_PRODUCTION_TABLE_EXISTENCE' as section,
  c.relname as table_name,
  'EXISTS' as status
from pg_catalog.pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students',
    'production_book_order_recipients','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  )
order by c.relname
;

select
  '14.2_BOOK_PRODUCTION_RPCS' as section,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as function_arguments,
  pg_catalog.pg_get_function_result(p.oid) as return_type,
  case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security_mode
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_production_book_order',
    'create_production_book_order_v3',
    'advance_production_book_order_status',
    'save_production_print_profile',
    'save_production_book_config',
    'remove_production_book_config',
    'remove_production_print_profile'
  )
order by p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)
;

-- READ-ONLY CHECK COMPLETE
-- NO DATA MODIFICATION INTENDED
