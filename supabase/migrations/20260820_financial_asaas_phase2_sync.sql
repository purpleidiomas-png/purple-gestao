-- Purple Gestão — Financeiro Fase 2 / Asaas
-- Preparação estrutural para cobrança única Asaas com PIX + boleto, rastreabilidade
-- de sincronização e webhook idempotente.
--
-- IMPORTANTE: esta migration foi criada para revisão. Não foi executada neste turno.

alter table if exists public.financial_charges
  add column if not exists asaas_payment_id text,
  add column if not exists sync_status text not null default 'NOT_SYNCED',
  add column if not exists sync_error text,
  add column if not exists pix_qr_expires_at timestamptz,
  add column if not exists boleto_bar_code text,
  add column if not exists boleto_nosso_numero text,
  add column if not exists received_value numeric(12,2),
  add column if not exists confirmed_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists canceled_by uuid references public.profiles(id) on delete set null,
  add column if not exists canceled_by_name text,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by_name text,
  add column if not exists full_value numeric(12,2),
  add column if not exists punctual_value numeric(12,2),
  add column if not exists discount_value numeric(12,2) not null default 0,
  add column if not exists discount_due_date date,
  add column if not exists installment_number integer not null default 1,
  add column if not exists installment_total integer not null default 1,
  add column if not exists installment_group_id uuid,
  add column if not exists origin text not null default 'ASAAS';

update public.financial_charges
set
  full_value = coalesce(full_value, value),
  punctual_value = coalesce(punctual_value, value),
  discount_due_date = coalesce(discount_due_date, due_date),
  sync_status = case
    when external_charge_id is not null then 'SYNCED'
    else sync_status
  end,
  asaas_payment_id = coalesce(asaas_payment_id, external_charge_id)
where full_value is null
   or punctual_value is null
   or discount_due_date is null
   or asaas_payment_id is null
   or sync_status = 'NOT_SYNCED';

alter table if exists public.financial_charges
  alter column full_value set not null,
  alter column punctual_value set not null;

alter table if exists public.financial_charges
  drop constraint if exists financial_charges_billing_type_check,
  add constraint financial_charges_billing_type_check
    check (billing_type in ('UNDEFINED','PIX','BOLETO'));

alter table if exists public.financial_charges
  drop constraint if exists financial_charges_sync_status_check,
  add constraint financial_charges_sync_status_check
    check (sync_status in ('NOT_SYNCED','SYNCING','SYNCED','SYNC_ERROR'));

alter table if exists public.financial_charges
  drop constraint if exists financial_charges_installments_check,
  add constraint financial_charges_installments_check
    check (installment_number >= 1 and installment_total >= installment_number and installment_total <= 24);

create unique index if not exists financial_charges_asaas_payment_unique
  on public.financial_charges(asaas_payment_id)
  where asaas_payment_id is not null and asaas_payment_id <> '';

create index if not exists financial_charges_sync_status_idx
  on public.financial_charges(sync_status, updated_at desc);

alter table if exists public.financial_payments
  drop constraint if exists financial_payments_billing_type_check,
  add constraint financial_payments_billing_type_check
    check (billing_type in ('UNDEFINED','PIX','BOLETO'));

create unique index if not exists asaas_webhook_events_external_event_unique
  on public.asaas_webhook_events(provider, external_event_id)
  where external_event_id is not null and external_event_id <> '';

create table if not exists public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'ASAAS',
  external_event_id text not null,
  charge_id uuid references public.financial_charges(id) on delete set null,
  payment_id uuid references public.financial_payments(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  entry_type text not null check (entry_type in ('RECEIVABLE_RECEIVED','REFUND','FEE','ADJUSTMENT')),
  amount numeric(12,2) not null default 0,
  net_value numeric(12,2),
  fee_value numeric(12,2),
  occurred_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint financial_ledger_entries_provider_event_unique unique (provider, external_event_id)
);

create index if not exists financial_ledger_entries_charge_idx
  on public.financial_ledger_entries(charge_id);

create index if not exists financial_ledger_entries_student_idx
  on public.financial_ledger_entries(student_id, occurred_at desc);

alter table public.financial_ledger_entries enable row level security;

drop policy if exists "financial_ledger_entries authenticated select" on public.financial_ledger_entries;
create policy "financial_ledger_entries authenticated select" on public.financial_ledger_entries
for select to authenticated using (public.is_direction());

grant select on public.financial_ledger_entries to authenticated;
