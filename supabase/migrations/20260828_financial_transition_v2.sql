-- Purple Gestão — Fase 2 — Financeiro V2
-- PREPARADA. NÃO EXECUTAR NESTA FASE.
-- Baseada no schema real confirmado em produção.

alter table public.financial_charges
  add column if not exists legacy_record_id text;

create unique index if not exists financial_charges_legacy_record_id_uidx
  on public.financial_charges(legacy_record_id)
  where legacy_record_id is not null and btrim(legacy_record_id) <> '';

drop table if exists public.financial_ledger_entries;

create or replace view public.financial_ledger_entries
with (security_invoker = true) as
select
  md5(concat_ws('|','charge',coalesce(c.id::text,''),coalesce(c.external_charge_id,''),coalesce(c.paid_at::text,''))) as id,
  coalesce(c.provider,'ASAAS') as provider,
  coalesce(nullif(c.external_charge_id,''), nullif(c.external_reference,''), c.id::text) as external_event_id,
  c.id as charge_id,
  null::uuid as payment_id,
  c.student_id,
  case
    when upper(coalesce(c.status,'')) = 'REFUNDED' then 'REFUND'
    when coalesce(c.fee_value,0) > 0 then 'FEE'
    else 'RECEIVABLE_RECEIVED'
  end as entry_type,
  coalesce(nullif(c.paid_amount,0), c.value, 0)::numeric(12,2) as amount,
  c.net_value,
  c.fee_value,
  coalesce(c.paid_at, c.updated_at, c.created_at) as occurred_at,
  c.data,
  c.created_at
from public.financial_charges c
where coalesce(c.paid_amount,0) > 0
   or upper(coalesce(c.status,'')) in ('PAID','REFUNDED')
union all
select
  md5(concat_ws('|','payment',coalesce(p.id::text,''),coalesce(p.external_payment_id,''),coalesce(p.paid_at::text,''))) as id,
  coalesce(p.provider,'ASAAS') as provider,
  coalesce(nullif(p.external_payment_id,''), p.id::text) as external_event_id,
  p.charge_id,
  p.id as payment_id,
  p.student_id::text,
  case
    when upper(coalesce(p.status,'')) = 'REFUNDED' then 'REFUND'
    when coalesce(p.fee_value,0) > 0 then 'FEE'
    else 'RECEIVABLE_RECEIVED'
  end as entry_type,
  p.value::numeric(12,2) as amount,
  p.net_value,
  p.fee_value,
  coalesce(p.paid_at, p.received_at, p.updated_at, p.created_at) as occurred_at,
  p.data,
  p.created_at
from public.financial_payments p;

grant select on public.financial_ledger_entries to authenticated;
