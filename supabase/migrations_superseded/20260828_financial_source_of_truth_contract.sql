-- Purple Gestão — contrato canônico do financeiro.
-- PREPARADA NA FASE 1. NÃO EXECUTAR AUTOMATICAMENTE.

alter table public.financial_charges
  add column if not exists legacy_record_id text,
  add column if not exists installment_number integer not null default 1,
  add column if not exists installment_total integer not null default 1,
  add column if not exists full_value numeric(12,2),
  add column if not exists punctual_value numeric(12,2),
  add column if not exists discount_value numeric(12,2),
  add column if not exists discount_due_date date,
  add column if not exists origin text not null default 'ASAAS';

update public.financial_charges
set
  legacy_record_id = coalesce(nullif(legacy_record_id,''), nullif(data->>'legacyId',''), nullif(data->>'id','')),
  installment_number = coalesce(nullif((data->>'installmentNumber')::integer,0), installment_number, 1),
  installment_total = coalesce(nullif((data->>'installmentTotal')::integer,0), installment_total, 1),
  full_value = coalesce(full_value, nullif((data->>'fullValue')::numeric,0), value),
  punctual_value = coalesce(punctual_value, nullif((data->>'punctualValue')::numeric,0), value),
  discount_value = coalesce(discount_value, nullif((data->>'discountValue')::numeric,0), 0),
  discount_due_date = coalesce(discount_due_date, nullif(data->>'discountDueDate','')::date, due_date),
  origin = coalesce(nullif(origin,''), nullif(data->>'origin',''), provider, 'ASAAS');

update public.financial_charges
set
  full_value = coalesce(full_value, value),
  punctual_value = coalesce(punctual_value, value),
  discount_due_date = coalesce(discount_due_date, due_date),
  discount_value = coalesce(discount_value, greatest(coalesce(full_value,value) - coalesce(punctual_value,value), 0));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'financial_charges_installment_number_check'
      and conrelid = 'public.financial_charges'::regclass
  ) then
    alter table public.financial_charges
      add constraint financial_charges_installment_number_check
      check (installment_number >= 1 and installment_total >= installment_number);
  end if;
end $$;

create unique index if not exists financial_charges_legacy_record_id_uidx
  on public.financial_charges (legacy_record_id)
  where legacy_record_id is not null;

create index if not exists financial_charges_competence_idx
  on public.financial_charges (competence, due_date);
