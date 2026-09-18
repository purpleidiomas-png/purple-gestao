create extension if not exists pgcrypto;

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null default 'ASAAS',
  account_type text not null default 'RECEIVABLE' check (account_type in ('RECEIVABLE','PAYMENT_GATEWAY')),
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asaas_customers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  external_customer_id text not null unique,
  name text not null,
  cpf_cnpj text,
  email text,
  phone text,
  mobile_phone text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asaas_customers_student_unique unique (student_id)
);

create table if not exists public.financial_charges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  financial_account_id uuid references public.financial_accounts(id) on delete set null,
  asaas_customer_id uuid references public.asaas_customers(id) on delete set null,
  provider text not null default 'ASAAS',
  external_charge_id text unique,
  external_reference text not null unique,
  charge_type text not null check (charge_type in ('MENSALIDADE','MATERIAL_DIDATICO','MATRICULA','REPOSICAO','OUTRO')),
  billing_type text not null check (billing_type in ('PIX','BOLETO')),
  status text not null default 'PENDING' check (status in ('PENDING','PAID','OVERDUE','CANCELED','REFUNDED')),
  description text not null,
  competence text,
  due_date date not null,
  value numeric(12,2) not null check (value >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  fee_value numeric(12,2),
  net_value numeric(12,2),
  invoice_url text,
  bank_slip_url text,
  digitable_line text,
  pix_copy_paste text,
  pix_qr_code text,
  paid_at timestamptz,
  student_name text,
  responsible_name text,
  created_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_payments (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.financial_charges(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  provider text not null default 'ASAAS',
  external_payment_id text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING','PAID','OVERDUE','CANCELED','REFUNDED')),
  billing_type text not null check (billing_type in ('PIX','BOLETO')),
  value numeric(12,2) not null default 0 check (value >= 0),
  net_value numeric(12,2),
  fee_value numeric(12,2),
  paid_at timestamptz,
  received_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asaas_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'ASAAS',
  event_type text not null,
  external_event_id text,
  external_charge_id text,
  external_payment_id text,
  payload_checksum text not null,
  processed boolean not null default false,
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asaas_webhook_events_checksum_unique unique (provider, payload_checksum)
);

create index if not exists financial_charges_student_idx on public.financial_charges(student_id);
create index if not exists financial_charges_status_due_idx on public.financial_charges(status, due_date);
create index if not exists financial_charges_external_idx on public.financial_charges(external_charge_id);
create index if not exists financial_payments_charge_idx on public.financial_payments(charge_id);
create index if not exists financial_payments_student_idx on public.financial_payments(student_id);
create index if not exists asaas_webhook_events_event_idx on public.asaas_webhook_events(event_type, created_at desc);

drop trigger if exists financial_accounts_touch_updated_at on public.financial_accounts;
create trigger financial_accounts_touch_updated_at
before update on public.financial_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists asaas_customers_touch_updated_at on public.asaas_customers;
create trigger asaas_customers_touch_updated_at
before update on public.asaas_customers
for each row execute function public.touch_updated_at();

drop trigger if exists financial_charges_touch_updated_at on public.financial_charges;
create trigger financial_charges_touch_updated_at
before update on public.financial_charges
for each row execute function public.touch_updated_at();

drop trigger if exists financial_payments_touch_updated_at on public.financial_payments;
create trigger financial_payments_touch_updated_at
before update on public.financial_payments
for each row execute function public.touch_updated_at();

drop trigger if exists asaas_webhook_events_touch_updated_at on public.asaas_webhook_events;
create trigger asaas_webhook_events_touch_updated_at
before update on public.asaas_webhook_events
for each row execute function public.touch_updated_at();

alter table public.financial_accounts enable row level security;
alter table public.asaas_customers enable row level security;
alter table public.financial_charges enable row level security;
alter table public.financial_payments enable row level security;
alter table public.asaas_webhook_events enable row level security;

drop policy if exists "financial_accounts authenticated select" on public.financial_accounts;
create policy "financial_accounts authenticated select" on public.financial_accounts
for select to authenticated using (public.is_direction());

drop policy if exists "financial_accounts authenticated write" on public.financial_accounts;
create policy "financial_accounts authenticated write" on public.financial_accounts
for insert to authenticated
with check (public.is_direction());

drop policy if exists "financial_accounts authenticated update" on public.financial_accounts;
create policy "financial_accounts authenticated update" on public.financial_accounts
for update to authenticated
using (public.is_direction())
with check (public.is_direction());

drop policy if exists "asaas_customers authenticated select" on public.asaas_customers;
create policy "asaas_customers authenticated select" on public.asaas_customers
for select to authenticated using (public.is_direction());

drop policy if exists "financial_charges authenticated select" on public.financial_charges;
create policy "financial_charges authenticated select" on public.financial_charges
for select to authenticated using (public.is_direction());

drop policy if exists "financial_charges authenticated write" on public.financial_charges;
create policy "financial_charges authenticated write" on public.financial_charges
for insert to authenticated
with check (public.is_direction());

drop policy if exists "financial_charges authenticated update" on public.financial_charges;
create policy "financial_charges authenticated update" on public.financial_charges
for update to authenticated
using (public.is_direction())
with check (public.is_direction());

drop policy if exists "financial_payments authenticated select" on public.financial_payments;
create policy "financial_payments authenticated select" on public.financial_payments
for select to authenticated using (public.is_direction());

drop policy if exists "asaas_webhook_events authenticated select" on public.asaas_webhook_events;
create policy "asaas_webhook_events authenticated select" on public.asaas_webhook_events
for select to authenticated using (public.is_direction());

grant select, insert, update on public.financial_accounts to authenticated;
grant select on public.asaas_customers to authenticated;
grant select, insert, update on public.financial_charges to authenticated;
grant select on public.financial_payments to authenticated;
grant select on public.asaas_webhook_events to authenticated;

insert into public.financial_accounts (name, provider, account_type, active, data)
select 'Conta principal Asaas', 'ASAAS', 'RECEIVABLE', true, jsonb_build_object('mode', 'sandbox')
where not exists (
  select 1 from public.financial_accounts where upper(name) = 'CONTA PRINCIPAL ASAAS'
);
