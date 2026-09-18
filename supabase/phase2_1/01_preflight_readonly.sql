-- Purple Gestão — Fase 2.1 — Preflight read-only
-- NÃO ALTERA O BANCO
-- Compara baseline da auditoria de 2026-08-28 com a fotografia real do momento.

with baseline as (
  select *
  from (
    values
      ('student'::text, 159::bigint, date '2026-08-28'),
      ('class'::text, 5::bigint, date '2026-08-28'),
      ('teacher'::text, 7::bigint, date '2026-08-28'),
      ('financial_entry'::text, 8::bigint, date '2026-08-28')
  ) as v(kind, baseline_count, baseline_date)
),
current_counts as (
  select kind, count(*)::bigint as current_count
  from public.app_records
  where kind in ('student','class','teacher','financial_entry')
  group by kind
)
select
  b.kind,
  b.baseline_date,
  b.baseline_count,
  coalesce(c.current_count, 0) as current_count,
  coalesce(c.current_count, 0) - b.baseline_count as delta_since_baseline,
  case
    when c.current_count is null then 'MISSING_KIND'
    when c.current_count = b.baseline_count then 'MATCH_BASELINE'
    when c.current_count > b.baseline_count then 'GROWTH_SINCE_BASELINE'
    else 'LOWER_THAN_BASELINE'
  end as status
from baseline b
left join current_counts c using(kind)
order by b.kind;
