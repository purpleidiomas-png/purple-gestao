-- Incremental only. Do not execute automatically.
-- Preserves every existing amount; legacy rows remain explicitly unclassified.

alter table public.financial_charges
  add column if not exists full_value numeric(12,2),
  add column if not exists punctual_value numeric(12,2),
  add column if not exists discount_value numeric(12,2),
  add column if not exists discount_due_date date,
  add column if not exists installment_number integer,
  add column if not exists installment_total integer,
  add column if not exists installment_group_id uuid,
  add column if not exists origin text not null default 'ASAAS',
  add column if not exists created_by_name text,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by_name text,
  add column if not exists canceled_by uuid references public.profiles(id) on delete set null,
  add column if not exists canceled_by_name text,
  add column if not exists canceled_at timestamptz;

alter table public.financial_charges
  drop constraint if exists financial_charges_origin_check;
alter table public.financial_charges
  add constraint financial_charges_origin_check
  check (origin in ('ASAAS','HISTORICAL','MIGRATION','LEGACY'));

alter table public.financial_charges
  drop constraint if exists financial_charges_values_check;
alter table public.financial_charges
  add constraint financial_charges_values_check check (
    (full_value is null or full_value >= 0) and
    (punctual_value is null or punctual_value >= 0) and
    (discount_value is null or discount_value >= 0) and
    (full_value is null or punctual_value is null or punctual_value <= full_value)
  );

alter table public.financial_charges
  drop constraint if exists financial_charges_installment_position_check;
alter table public.financial_charges
  add constraint financial_charges_installment_position_check check (
    (installment_number is null and installment_total is null) or
    (installment_number between 1 and installment_total and installment_total between 1 and 24)
  );

create index if not exists financial_charges_installment_group_idx
  on public.financial_charges(installment_group_id, installment_number)
  where installment_group_id is not null;
create index if not exists financial_charges_origin_idx
  on public.financial_charges(origin, student_id, due_date);

create table if not exists public.financial_charge_audit (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.financial_charges(id) on delete restrict,
  action text not null check (action in ('CREATE','UPDATE','CANCEL','ARCHIVE','PAYMENT','SYNC_ERROR')),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  provider text not null default 'PURPLE_GESTAO',
  external_charge_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists financial_charge_audit_charge_idx
  on public.financial_charge_audit(charge_id, created_at desc);
alter table public.financial_charge_audit enable row level security;
drop policy if exists "financial_charge_audit authenticated select" on public.financial_charge_audit;
create policy "financial_charge_audit authenticated select" on public.financial_charge_audit
for select to authenticated using (
  public.is_direction() or public.has_permission('financial.receivables.view')
);
grant select on public.financial_charge_audit to authenticated;

-- Compatibility strategy: intentionally no financial backfill. Existing `value`
-- remains readable as the legacy amount until a human classifies full/punctual values.
