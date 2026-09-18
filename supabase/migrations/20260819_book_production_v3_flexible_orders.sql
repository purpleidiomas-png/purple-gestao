-- Purple Gestão — Produção de Livros V3: pedidos flexíveis.
-- NÃO EXECUTAR automaticamente. Migration incremental, compatível com V1 + V2.
--
-- Objetivo:
-- - Preservar pedidos antigos.
-- - Permitir pedido para STOCK, CLASS ou STUDENT sem IDs fictícios.
-- - Manter inventory_items como origem cadastral dos livros.
-- - Não movimentar estoque na criação da ordem.

alter table public.production_book_orders
  add column if not exists order_source text not null default 'LEGACY',
  add column if not exists source_context jsonb not null default '{}'::jsonb;

alter table public.production_book_order_classes
  alter column next_book_id drop not null;

alter table public.production_book_order_students
  alter column next_book_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.production_book_orders'::regclass
      and conname = 'production_book_orders_source_check'
  ) then
    alter table public.production_book_orders
      add constraint production_book_orders_source_check
      check (order_source in ('LEGACY','STOCK','CLASS','STUDENT'));
  end if;
end;
$$;

create table if not exists public.production_book_order_recipients (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.production_book_orders(id) on delete cascade,
  student_record_id text references public.app_records(id) on delete restrict,
  student_name_snapshot text,
  class_record_id text references public.app_records(id) on delete restrict,
  class_name_snapshot text,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (student_record_id is not null or class_record_id is not null)
);

create index if not exists production_order_recipients_order_idx
  on public.production_book_order_recipients(order_id);

create index if not exists production_order_recipients_student_idx
  on public.production_book_order_recipients(student_record_id)
  where student_record_id is not null;

create index if not exists production_order_source_date_idx
  on public.production_book_orders(order_source, order_date desc);

alter table public.production_book_order_recipients enable row level security;

drop policy if exists production_book_order_recipients_select on public.production_book_order_recipients;
create policy production_book_order_recipients_select
on public.production_book_order_recipients
for select
using (public.is_direction());

drop policy if exists production_book_order_recipients_write on public.production_book_order_recipients;
create policy production_book_order_recipients_write
on public.production_book_order_recipients
for all
using (public.is_direction())
with check (public.is_direction());

drop trigger if exists production_book_order_recipients_touch_updated_at
on public.production_book_order_recipients;

create trigger production_book_order_recipients_touch_updated_at
before update on public.production_book_order_recipients
for each row execute function public.touch_updated_at();

create or replace function public.production_assert_active_production_book(
  p_book_id uuid
)
returns public.production_books
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_book public.production_books;
  v_inventory public.inventory_items;
  v_profile public.production_print_profiles;
  v_spec public.production_book_print_specs;
begin
  if p_book_id is null then
    raise exception 'Livro obrigatório.' using errcode = '22023';
  end if;

  select * into v_book
  from public.production_books
  where id = p_book_id;

  if not found then
    raise exception 'Livro de produção inválido.' using errcode = '22023';
  end if;

  select * into v_inventory
  from public.inventory_items
  where id = v_book.inventory_item_id
    and item_type = 'book';

  if not found then
    raise exception 'Livro sem inventory_item de livro.' using errcode = '22023';
  end if;

  if v_book.status <> 'ACTIVE' then
    raise exception 'Livro de produção inativo.' using errcode = '22023';
  end if;

  if coalesce(v_book.page_count, 0) <= 0 then
    raise exception 'Livro sem quantidade de páginas válida.' using errcode = '22023';
  end if;

  if v_book.print_profile_id is not null then
    select * into v_profile
    from public.production_print_profiles
    where id = v_book.print_profile_id
      and status = 'ACTIVE';

    if found then
      return v_book;
    end if;
  end if;

  if v_book.has_custom_spec then
    select * into v_spec
    from public.production_book_print_specs
    where book_id = v_book.id;

    if found then
      return v_book;
    end if;
  end if;

  raise exception 'Livro sem padrão gráfico ativo ou exceção individual válida.'
    using errcode = '22023';
end;
$$;

create or replace function public.create_production_book_order_v3(
  p_order jsonb,
  p_classes jsonb default '[]'::jsonb,
  p_recipients jsonb default '[]'::jsonb,
  p_items jsonb default '[]'::jsonb
)
returns public.production_book_orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.production_book_orders;
  v_source text;
  v_class jsonb;
  v_student jsonb;
  v_recipient jsonb;
  v_item jsonb;
  v_item_count integer;
  v_class_count integer;
  v_recipient_count integer;
begin
  if not public.is_direction() then
    raise exception 'Operação restrita à Direção.' using errcode = '42501';
  end if;

  v_source := coalesce(nullif(p_order->>'order_source', ''), 'CLASS');

  if v_source not in ('STOCK','CLASS','STUDENT') then
    raise exception 'Origem do pedido inválida.' using errcode = '22023';
  end if;

  if coalesce(p_order->>'status', '') not in ('DRAFT', 'REVIEWED') then
    raise exception 'Status inicial inválido.' using errcode = '22023';
  end if;

  select count(*) into v_item_count
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb));

  select count(*) into v_class_count
  from jsonb_array_elements(coalesce(p_classes, '[]'::jsonb));

  select count(*) into v_recipient_count
  from jsonb_array_elements(coalesce(p_recipients, '[]'::jsonb));

  if v_item_count = 0 then
    raise exception 'Informe ao menos um livro.' using errcode = '22023';
  end if;

  if v_source = 'STOCK' and (v_class_count > 0 or v_recipient_count > 0) then
    raise exception 'Pedido de estoque não pode ter turma ou aluno vinculado.' using errcode = '22023';
  end if;

  if v_source = 'CLASS' and v_class_count = 0 then
    raise exception 'Pedido por turma exige ao menos uma turma.' using errcode = '22023';
  end if;

  if v_source = 'STUDENT' and v_recipient_count = 0 then
    raise exception 'Pedido por aluno exige ao menos um aluno.' using errcode = '22023';
  end if;

  insert into public.production_book_orders (
    order_number, order_date, period_label, notes, status, reviewed_at,
    order_source, source_context, created_by, updated_by
  ) values (
    '', (p_order->>'order_date')::date,
    coalesce(nullif(p_order->>'period_label', ''), 'Produção de livros'),
    nullif(p_order->>'notes', ''),
    p_order->>'status',
    case when p_order->>'status' = 'REVIEWED' then now() else null end,
    v_source,
    coalesce(p_order->'source_context', '{}'::jsonb),
    auth.uid(),
    auth.uid()
  ) returning * into v_order;

  for v_class in select value from jsonb_array_elements(coalesce(p_classes, '[]'::jsonb)) loop
    perform public.production_assert_app_record_kind(v_class->>'class_record_id', 'class', 'Turma');

    if nullif(v_class->>'next_class_record_id', '') is not null then
      perform public.production_assert_app_record_kind(v_class->>'next_class_record_id', 'class', 'Próxima turma');
    end if;

    if nullif(v_class->>'next_book_id', '') is not null then
      perform public.production_assert_active_production_book((v_class->>'next_book_id')::uuid);
    end if;

    insert into public.production_book_order_classes (
      id, order_id, class_record_id, next_class_record_id, current_book_id,
      next_book_id, class_name_snapshot, next_class_name_snapshot,
      student_quantity, extra_quantity, notes, created_by, updated_by
    ) values (
      (v_class->>'id')::uuid, v_order.id, v_class->>'class_record_id',
      nullif(v_class->>'next_class_record_id', ''),
      nullif(v_class->>'current_book_id', '')::uuid,
      nullif(v_class->>'next_book_id', '')::uuid,
      v_class->>'class_name_snapshot',
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

      if nullif(v_student->>'next_book_id', '') is not null then
        perform public.production_assert_active_production_book((v_student->>'next_book_id')::uuid);
      end if;

      insert into public.production_book_order_students (
        id, order_class_id, student_record_id, student_name_snapshot,
        current_class_record_id, next_class_record_id, current_book_id,
        next_book_id, included, notes, created_by, updated_by
      ) values (
        (v_student->>'id')::uuid, (v_class->>'id')::uuid,
        v_student->>'student_record_id',
        v_student->>'student_name_snapshot',
        nullif(v_student->>'current_class_record_id', ''),
        nullif(v_student->>'next_class_record_id', ''),
        nullif(v_student->>'current_book_id', '')::uuid,
        nullif(v_student->>'next_book_id', '')::uuid,
        true, nullif(v_student->>'notes', ''), auth.uid(), auth.uid()
      );
    end loop;
  end loop;

  for v_recipient in select value from jsonb_array_elements(coalesce(p_recipients, '[]'::jsonb)) loop
    if nullif(v_recipient->>'student_record_id', '') is not null then
      perform public.production_assert_app_record_kind(v_recipient->>'student_record_id', 'student', 'Aluno');
    end if;

    if nullif(v_recipient->>'class_record_id', '') is not null then
      perform public.production_assert_app_record_kind(v_recipient->>'class_record_id', 'class', 'Turma do aluno');
    end if;

    insert into public.production_book_order_recipients (
      id, order_id, student_record_id, student_name_snapshot,
      class_record_id, class_name_snapshot, notes, created_by, updated_by
    ) values (
      (v_recipient->>'id')::uuid, v_order.id,
      nullif(v_recipient->>'student_record_id', ''),
      nullif(v_recipient->>'student_name_snapshot', ''),
      nullif(v_recipient->>'class_record_id', ''),
      nullif(v_recipient->>'class_name_snapshot', ''),
      nullif(v_recipient->>'notes', ''),
      auth.uid(), auth.uid()
    );
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    perform public.production_assert_active_production_book((v_item->>'book_id')::uuid);

    if coalesce((v_item->>'total_quantity')::integer, 0) <= 0 then
      raise exception 'Quantidade do livro deve ser maior que zero.' using errcode = '22023';
    end if;

    insert into public.production_book_order_items (
      id, order_id, book_id, book_name_snapshot, student_quantity,
      extra_quantity, created_by, updated_by
    ) values (
      (v_item->>'id')::uuid, v_order.id, (v_item->>'book_id')::uuid,
      v_item->>'book_name_snapshot',
      coalesce((v_item->>'student_quantity')::integer, 0),
      coalesce((v_item->>'extra_quantity')::integer, 0),
      auth.uid(), auth.uid()
    );

    if p_order->>'status' = 'REVIEWED' then
      insert into public.production_book_order_spec_snapshots (
        order_item_id, book_id, specification, created_by
      ) values (
        (v_item->>'id')::uuid, (v_item->>'book_id')::uuid,
        coalesce(v_item->'specification', '{}'::jsonb), auth.uid()
      );
    end if;
  end loop;

  insert into public.production_book_order_status_history (
    order_id, from_status, to_status, changed_by, notes
  ) values (v_order.id, null, p_order->>'status', auth.uid(), 'Pedido criado');

  return v_order;
end;
$$;

revoke execute on function public.create_production_book_order_v3(jsonb,jsonb,jsonb,jsonb) from public, anon;
revoke execute on function public.production_assert_active_production_book(uuid) from public, anon;

grant select on public.production_book_order_recipients to authenticated;
grant execute on function public.create_production_book_order_v3(jsonb,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.production_assert_active_production_book(uuid) to authenticated;

revoke all on public.production_book_order_recipients from anon;
