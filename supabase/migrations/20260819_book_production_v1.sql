-- Purple Gestão — Produção de Livros V1.
-- Planejamento editorial e ordens de produção. Não movimenta estoque.
-- Depende do estoque de livros criado em 20260717_inventory.sql.

create extension if not exists pgcrypto;

create table if not exists public.production_books (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null unique references public.inventory_items(id) on delete restrict,
  edition text,
  page_count integer not null default 0 check (page_count >= 0),
  closed_format text,
  width_mm numeric(8,2) check (width_mm is null or width_mm > 0),
  height_mm numeric(8,2) check (height_mm is null or height_mm > 0),
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_book_print_specs (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null unique references public.production_books(id) on delete cascade,
  cover_paper text,
  cover_grammage integer check (cover_grammage is null or cover_grammage > 0),
  cover_print text,
  cover_finish text,
  cover_lamination text,
  cover_notes text,
  inner_paper text,
  inner_grammage integer check (inner_grammage is null or inner_grammage > 0),
  inner_print text,
  inner_colors text,
  inner_sides text,
  inner_finish text,
  binding_type text,
  spine text,
  orientation text,
  binding_finish text,
  bleed text,
  technical_notes text,
  printer_instructions text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_print_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  default_spec jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_print_profile_ranges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.production_print_profiles(id) on delete cascade,
  min_pages integer not null default 0 check (min_pages >= 0),
  max_pages integer check (max_pages is null or max_pages >= min_pages),
  suggested_inner_grammage integer check (suggested_inner_grammage is null or suggested_inner_grammage > 0),
  suggested_binding_type text,
  suggested_spine text,
  suggested_finish text,
  additional_spec jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, min_pages)
);

create table if not exists public.production_book_progressions (
  id uuid primary key default gen_random_uuid(),
  current_book_id uuid not null unique references public.production_books(id) on delete restrict,
  next_book_id uuid not null references public.production_books(id) on delete restrict,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_book_id <> next_book_id)
);

create sequence if not exists public.production_book_order_sequence;

create table if not exists public.production_book_orders (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint not null unique default nextval('public.production_book_order_sequence'),
  order_number text not null unique,
  order_date date not null default current_date,
  period_label text not null,
  notes text,
  status text not null default 'DRAFT' check (status in ('DRAFT','REVIEWED','PDF_GENERATED','SENT_TO_PRINTER','IN_PRODUCTION','COMPLETED','CANCELLED')),
  reviewed_at timestamptz,
  pdf_generated_at timestamptz,
  sent_to_printer_at timestamptz,
  production_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.production_book_order_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := 'PL-' || extract(year from new.order_date)::integer || '-' || lpad(new.sequence_number::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists production_book_order_number_before_insert on public.production_book_orders;
create trigger production_book_order_number_before_insert
before insert on public.production_book_orders
for each row execute function public.production_book_order_number();

create or replace function public.production_assert_app_record_kind(
  p_record_id text,
  p_expected_kind text,
  p_label text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_kind text;
begin
  if p_record_id is null or btrim(p_record_id) = '' then
    raise exception '% obrigatório.', p_label using errcode = '22023';
  end if;

  select kind into v_kind
  from public.app_records
  where id = p_record_id;

  if not found then
    raise exception '% inválido: registro não encontrado.', p_label using errcode = '22023';
  end if;

  if v_kind <> p_expected_kind then
    raise exception '% inválido: esperado kind=%, encontrado kind=%.', p_label, p_expected_kind, coalesce(v_kind, 'NULL') using errcode = '22023';
  end if;
end;
$$;

create table if not exists public.production_book_order_classes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.production_book_orders(id) on delete cascade,
  class_record_id text not null references public.app_records(id) on delete restrict,
  next_class_record_id text references public.app_records(id) on delete restrict,
  current_book_id uuid references public.production_books(id) on delete restrict,
  next_book_id uuid not null references public.production_books(id) on delete restrict,
  class_name_snapshot text not null,
  next_class_name_snapshot text,
  student_quantity integer not null default 0 check (student_quantity >= 0),
  extra_quantity integer not null default 0 check (extra_quantity >= 0),
  total_quantity integer generated always as (student_quantity + extra_quantity) stored,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, class_record_id)
);

create table if not exists public.production_book_order_students (
  id uuid primary key default gen_random_uuid(),
  order_class_id uuid not null references public.production_book_order_classes(id) on delete cascade,
  student_record_id text not null references public.app_records(id) on delete restrict,
  student_name_snapshot text not null,
  current_class_record_id text references public.app_records(id) on delete restrict,
  next_class_record_id text references public.app_records(id) on delete restrict,
  current_book_id uuid references public.production_books(id) on delete restrict,
  next_book_id uuid not null references public.production_books(id) on delete restrict,
  included boolean not null default true,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_class_id, student_record_id)
);

create table if not exists public.production_book_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.production_book_orders(id) on delete cascade,
  book_id uuid not null references public.production_books(id) on delete restrict,
  book_name_snapshot text not null,
  student_quantity integer not null default 0 check (student_quantity >= 0),
  extra_quantity integer not null default 0 check (extra_quantity >= 0),
  total_quantity integer generated always as (student_quantity + extra_quantity) stored,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, book_id)
);

create table if not exists public.production_book_order_spec_snapshots (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.production_book_order_items(id) on delete cascade,
  book_id uuid not null references public.production_books(id) on delete restrict,
  specification jsonb not null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.production_book_order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.production_book_orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid not null default auth.uid() references public.profiles(id),
  changed_at timestamptz not null default now(),
  notes text
);

create index if not exists production_books_inventory_item_idx on public.production_books(inventory_item_id);
create index if not exists production_order_status_date_idx on public.production_book_orders(status, order_date desc);
create index if not exists production_order_classes_order_idx on public.production_book_order_classes(order_id);
create index if not exists production_order_students_class_idx on public.production_book_order_students(order_class_id);
create index if not exists production_order_items_order_idx on public.production_book_order_items(order_id);
create index if not exists production_order_history_order_idx on public.production_book_order_status_history(order_id, changed_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students','production_book_order_items'
  ] loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.create_production_book_order(
  p_order jsonb,
  p_classes jsonb,
  p_items jsonb
)
returns public.production_book_orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.production_book_orders;
  v_class jsonb;
  v_student jsonb;
  v_item jsonb;
begin
  if not public.is_direction() then
    raise exception 'Operação restrita à Direção.' using errcode = '42501';
  end if;

  if coalesce(p_order->>'status', '') not in ('DRAFT', 'REVIEWED') then
    raise exception 'Status inicial inválido.' using errcode = '22023';
  end if;

  insert into public.production_book_orders (
    order_number, order_date, period_label, notes, status, reviewed_at,
    created_by, updated_by
  ) values (
    '', (p_order->>'order_date')::date, p_order->>'period_label',
    nullif(p_order->>'notes', ''), p_order->>'status',
    case when p_order->>'status' = 'REVIEWED' then now() else null end,
    auth.uid(), auth.uid()
  ) returning * into v_order;

  for v_class in select value from jsonb_array_elements(coalesce(p_classes, '[]'::jsonb)) loop
    perform public.production_assert_app_record_kind(v_class->>'class_record_id', 'class', 'Turma atual');

    if nullif(v_class->>'next_class_record_id', '') is not null then
      perform public.production_assert_app_record_kind(v_class->>'next_class_record_id', 'class', 'Próxima turma');
    end if;

    insert into public.production_book_order_classes (
      id, order_id, class_record_id, next_class_record_id, current_book_id,
      next_book_id, class_name_snapshot, next_class_name_snapshot,
      student_quantity, extra_quantity, notes, created_by, updated_by
    ) values (
      (v_class->>'id')::uuid, v_order.id, v_class->>'class_record_id',
      nullif(v_class->>'next_class_record_id', ''),
      nullif(v_class->>'current_book_id', '')::uuid,
      (v_class->>'next_book_id')::uuid, v_class->>'class_name_snapshot',
      nullif(v_class->>'next_class_name_snapshot', ''),
      coalesce((v_class->>'student_quantity')::integer, 0),
      coalesce((v_class->>'extra_quantity')::integer, 0),
      nullif(v_class->>'notes', ''), auth.uid(), auth.uid()
    );

    for v_student in select value from jsonb_array_elements(coalesce(v_class->'students', '[]'::jsonb)) loop
      perform public.production_assert_app_record_kind(v_student->>'student_record_id', 'student', 'Aluno');

      if nullif(v_student->>'current_class_record_id', '') is not null then
        perform public.production_assert_app_record_kind(v_student->>'current_class_record_id', 'class', 'Turma atual do aluno');
      end if;

      if nullif(v_student->>'next_class_record_id', '') is not null then
        perform public.production_assert_app_record_kind(v_student->>'next_class_record_id', 'class', 'Próxima turma do aluno');
      end if;

      insert into public.production_book_order_students (
        id, order_class_id, student_record_id, student_name_snapshot,
        current_class_record_id, next_class_record_id, current_book_id,
        next_book_id, included, notes, created_by, updated_by
      ) values (
        (v_student->>'id')::uuid, (v_class->>'id')::uuid,
        v_student->>'student_record_id', v_student->>'student_name_snapshot',
        nullif(v_student->>'current_class_record_id', ''),
        nullif(v_student->>'next_class_record_id', ''),
        nullif(v_student->>'current_book_id', '')::uuid,
        (v_student->>'next_book_id')::uuid, true,
        nullif(v_student->>'notes', ''), auth.uid(), auth.uid()
      );
    end loop;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    insert into public.production_book_order_items (
      id, order_id, book_id, book_name_snapshot, student_quantity,
      extra_quantity, created_by, updated_by
    ) values (
      (v_item->>'id')::uuid, v_order.id, (v_item->>'book_id')::uuid,
      v_item->>'book_name_snapshot',
      coalesce((v_item->>'student_quantity')::integer, 0),
      coalesce((v_item->>'extra_quantity')::integer, 0), auth.uid(), auth.uid()
    );

    if p_order->>'status' = 'REVIEWED' then
      insert into public.production_book_order_spec_snapshots (
        order_item_id, book_id, specification, created_by
      ) values (
        (v_item->>'id')::uuid, (v_item->>'book_id')::uuid,
        v_item->'specification', auth.uid()
      );
    end if;
  end loop;

  insert into public.production_book_order_status_history (
    order_id, from_status, to_status, changed_by, notes
  ) values (v_order.id, null, p_order->>'status', auth.uid(), 'Pedido criado');

  return v_order;
end;
$$;

create or replace function public.save_production_print_profile(
  p_profile jsonb,
  p_ranges jsonb
)
returns public.production_print_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.production_print_profiles;
  v_range jsonb;
  v_profile_id uuid := nullif(p_profile->>'id', '')::uuid;
begin
  if not public.is_direction() then
    raise exception 'Operação restrita à Direção.' using errcode = '42501';
  end if;

  if coalesce(btrim(p_profile->>'name'), '') = '' then
    raise exception 'Informe o nome do padrão.' using errcode = '22023';
  end if;

  if v_profile_id is null then
    insert into public.production_print_profiles (
      name, description, status, default_spec, created_by, updated_by
    ) values (
      btrim(p_profile->>'name'), nullif(p_profile->>'description', ''),
      coalesce(nullif(p_profile->>'status', ''), 'ACTIVE'),
      coalesce(p_profile->'default_spec', '{}'::jsonb), auth.uid(), auth.uid()
    ) returning * into v_profile;
  else
    update public.production_print_profiles set
      name = btrim(p_profile->>'name'),
      description = nullif(p_profile->>'description', ''),
      status = coalesce(nullif(p_profile->>'status', ''), 'ACTIVE'),
      default_spec = coalesce(p_profile->'default_spec', '{}'::jsonb),
      updated_by = auth.uid()
    where id = v_profile_id
    returning * into v_profile;
    if not found then raise exception 'Padrão gráfico não encontrado.' using errcode = 'P0002'; end if;
    delete from public.production_print_profile_ranges where profile_id = v_profile_id;
  end if;

  for v_range in select value from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb)) loop
    insert into public.production_print_profile_ranges (
      profile_id, min_pages, max_pages, suggested_inner_grammage,
      suggested_binding_type, suggested_spine, suggested_finish,
      created_by, updated_by
    ) values (
      v_profile.id, coalesce((v_range->>'min_pages')::integer, 0),
      nullif(v_range->>'max_pages', '')::integer,
      nullif(v_range->>'suggested_inner_grammage', '')::integer,
      nullif(v_range->>'suggested_binding_type', ''),
      nullif(v_range->>'suggested_spine', ''),
      nullif(v_range->>'suggested_finish', ''), auth.uid(), auth.uid()
    );
  end loop;

  return v_profile;
end;
$$;

create or replace function public.advance_production_book_order_status(
  p_order_id uuid,
  p_next_status text
)
returns public.production_book_orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.production_book_orders;
  v_previous_status text;
  v_allowed boolean;
begin
  if not public.is_direction() then
    raise exception 'Operação restrita à Direção.' using errcode = '42501';
  end if;

  select * into v_order from public.production_book_orders
  where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  v_previous_status := v_order.status;

  v_allowed :=
    (v_order.status = 'DRAFT' and p_next_status = 'REVIEWED') or
    (v_order.status = 'REVIEWED' and p_next_status = 'PDF_GENERATED') or
    (v_order.status = 'PDF_GENERATED' and p_next_status = 'SENT_TO_PRINTER') or
    (v_order.status = 'SENT_TO_PRINTER' and p_next_status = 'IN_PRODUCTION') or
    (v_order.status = 'IN_PRODUCTION' and p_next_status = 'COMPLETED') or
    (v_order.status not in ('COMPLETED','CANCELLED') and p_next_status = 'CANCELLED');
  if not v_allowed then
    raise exception 'Transição de status inválida.' using errcode = '22023';
  end if;

  update public.production_book_orders set
    status = p_next_status,
    reviewed_at = case when p_next_status in ('REVIEWED','PDF_GENERATED') then coalesce(reviewed_at, now()) else reviewed_at end,
    pdf_generated_at = case when p_next_status = 'PDF_GENERATED' then now() else pdf_generated_at end,
    sent_to_printer_at = case when p_next_status = 'SENT_TO_PRINTER' then now() else sent_to_printer_at end,
    production_started_at = case when p_next_status = 'IN_PRODUCTION' then now() else production_started_at end,
    completed_at = case when p_next_status = 'COMPLETED' then now() else completed_at end,
    cancelled_at = case when p_next_status = 'CANCELLED' then now() else cancelled_at end,
    updated_by = auth.uid()
  where id = p_order_id
  returning * into v_order;

  insert into public.production_book_order_status_history (
    order_id, from_status, to_status, changed_by, notes
  ) values (
    p_order_id, v_previous_status, p_next_status, auth.uid(), 'Status alterado'
  );

  return v_order;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'production_books','production_book_print_specs','production_print_profiles',
    'production_print_profile_ranges','production_book_progressions','production_book_orders',
    'production_book_order_classes','production_book_order_students','production_book_order_items',
    'production_book_order_spec_snapshots','production_book_order_status_history'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I_direction_select on public.%I', table_name, table_name);
    execute format('create policy %I_direction_select on public.%I for select to authenticated using (public.is_direction())', table_name, table_name);
    execute format('drop policy if exists %I_direction_insert on public.%I', table_name, table_name);
    execute format('create policy %I_direction_insert on public.%I for insert to authenticated with check (public.is_direction())', table_name, table_name);
    execute format('drop policy if exists %I_direction_update on public.%I', table_name, table_name);
    execute format('create policy %I_direction_update on public.%I for update to authenticated using (public.is_direction()) with check (public.is_direction())', table_name, table_name);
    execute format('grant select, insert, update on public.%I to authenticated', table_name);
    execute format('revoke delete on public.%I from authenticated', table_name);
    execute format('revoke all on public.%I from anon', table_name);
  end loop;
end $$;

grant usage, select on sequence public.production_book_order_sequence to authenticated;
revoke execute on function public.create_production_book_order(jsonb,jsonb,jsonb) from public, anon;
revoke execute on function public.save_production_print_profile(jsonb,jsonb) from public, anon;
revoke execute on function public.advance_production_book_order_status(uuid,text) from public, anon;
revoke execute on function public.production_assert_app_record_kind(text,text,text) from public, anon;
grant execute on function public.create_production_book_order(jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.save_production_print_profile(jsonb,jsonb) to authenticated;
grant execute on function public.advance_production_book_order_status(uuid,text) to authenticated;
grant execute on function public.production_assert_app_record_kind(text,text,text) to authenticated;
