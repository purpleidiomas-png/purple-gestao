-- Purple Gestão — integridade transacional de Estoque de Livros e Patrimônio.
-- Migração aditiva, idempotente e não destrutiva.
-- Dependências: 20260717_inventory.sql e 20260718_books_assets.sql.

-- A unicidade sem diferenciar maiúsculas/minúsculas só pode ser instalada se os
-- dados legados já forem compatíveis. Em caso de conflito, a migração para com
-- uma mensagem explícita e não altera nem exclui os registros conflitantes.
do $$
declare
  v_duplicates text;
begin
  select string_agg(d.normalized_code, ', ' order by d.normalized_code)
    into v_duplicates
  from (
    select lower(btrim(internal_code)) as normalized_code
    from public.inventory_items
    where internal_code is not null and btrim(internal_code) <> ''
    group by lower(btrim(internal_code))
    having count(*) > 1
    order by lower(btrim(internal_code))
    limit 20
  ) d;

  if v_duplicates is not null then
    raise exception
      'Não foi possível criar a unicidade case-insensitive de internal_code. Códigos duplicados: %',
      v_duplicates
      using errcode = '23505';
  end if;
end;
$$;

create unique index if not exists inventory_items_internal_code_ci_uidx
  on public.inventory_items (lower(btrim(internal_code)))
  where internal_code is not null and btrim(internal_code) <> '';

-- Liga cada devolução à entrega que lhe deu origem. A constraint de CHECK fica
-- NOT VALID para preservar eventuais devoluções históricas anteriores a esta
-- migração; ainda assim ela é aplicada a toda nova linha.
alter table public.book_movements
  add column if not exists related_movement_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.book_movements'::regclass
      and conname = 'book_movements_related_movement_fk'
  ) then
    alter table public.book_movements
      add constraint book_movements_related_movement_fk
      foreign key (related_movement_id)
      references public.book_movements(id)
      on delete restrict;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.book_movements'::regclass
      and conname = 'book_movements_return_link_ck'
  ) then
    alter table public.book_movements
      add constraint book_movements_return_link_ck
      check (movement_type <> 'return' or related_movement_id is not null)
      not valid;
  end if;
end;
$$;

create index if not exists book_movements_related_movement_idx
  on public.book_movements (related_movement_id)
  where related_movement_id is not null;

-- Novos livros sempre começam em zero e recebem o saldo inicial por uma única
-- movimentação transacional. Códigos novos são persistidos de forma canônica.
create or replace function public.guard_inventory_item_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.current_quantity <> 0 then
    raise exception 'O estoque inicial deve ser registrado como entrada.'
      using errcode = '23514';
  end if;

  if new.internal_code is not null then
    new.internal_code := upper(btrim(new.internal_code));
  end if;

  if new.item_type = 'book'
     and coalesce(new.internal_code, '') = '' then
    raise exception 'Informe o código interno do livro.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Protege autoria, tipo, saldo e inativação mesmo quando o UPDATE é enviado
-- diretamente à tabela. O modo interno de movimentação permite somente saldo e
-- valor unitário; nenhum outro dado cadastral pode ser alterado nesse contexto.
create or replace function public.guard_inventory_item_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement boolean := coalesce(current_setting('app.inventory_movement', true), '') = 'on';
begin
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'A identidade e a data de criação do item não podem ser alteradas.'
      using errcode = '42501';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'O autor original do item não pode ser alterado.'
      using errcode = '42501';
  end if;

  if new.item_type is distinct from old.item_type then
    raise exception 'O tipo do item não pode ser alterado.'
      using errcode = '42501';
  end if;

  if new.internal_code is distinct from old.internal_code
     and new.internal_code is not null then
    new.internal_code := upper(btrim(new.internal_code));
  end if;

  if new.item_type = 'book'
     and coalesce(new.internal_code, '') = '' then
    raise exception 'Informe o código interno do livro.'
      using errcode = '23514';
  end if;

  if v_movement then
    if new.id is distinct from old.id
       or new.item_type is distinct from old.item_type
       or new.internal_code is distinct from old.internal_code
       or new.name is distinct from old.name
       or new.category is distinct from old.category
       or new.course is distinct from old.course
       or new.level is distinct from old.level
       or new.minimum_quantity is distinct from old.minimum_quantity
       or new.location is distinct from old.location
       or new.notes is distinct from old.notes
       or new.active is distinct from old.active
       or new.created_by is distinct from old.created_by
       or new.collection is distinct from old.collection
       or new.volume is distinct from old.volume
       or new.edition is distinct from old.edition
       or new.language is distinct from old.language then
      raise exception 'Uma movimentação só pode alterar saldo e valor unitário.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.current_quantity is distinct from old.current_quantity then
    raise exception 'A quantidade só pode ser alterada por movimentação de livros.'
      using errcode = '42501';
  end if;

  if new.active is distinct from old.active then
    if old.active = true
       and new.active = false
       and (
         public.has_permission('inventory.inactivate')
         or public.has_permission('inventory.delete')
       )
       and new.internal_code is not distinct from old.internal_code
       and new.name is not distinct from old.name
       and new.category is not distinct from old.category
       and new.course is not distinct from old.course
       and new.level is not distinct from old.level
       and new.minimum_quantity is not distinct from old.minimum_quantity
       and new.location is not distinct from old.location
       and new.notes is not distinct from old.notes
       and new.collection is not distinct from old.collection
       and new.volume is not distinct from old.volume
       and new.edition is not distinct from old.edition
       and new.language is not distinct from old.language
       and new.unit_value is not distinct from old.unit_value then
      return new;
    end if;

    raise exception 'Alteração de status do livro não autorizada.'
      using errcode = '42501';
  end if;

  if not public.has_permission('inventory.edit') then
    raise exception 'Alteração de livro não autorizada.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop policy if exists inventory_items_update on public.inventory_items;
create policy inventory_items_update
on public.inventory_items
for update
using (
  public.has_permission('inventory.edit')
  or public.has_permission('inventory.inactivate')
  or public.has_permission('inventory.delete')
)
with check (
  public.has_permission('inventory.edit')
  or public.has_permission('inventory.inactivate')
  or public.has_permission('inventory.delete')
);

-- Núcleo privado e transacional de movimentações. Toda escrita no saldo e no
-- histórico oficial de livros passa por esta função.
create or replace function public._record_book_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_student_name text,
  p_class_name text,
  p_movement_date date,
  p_supplier text,
  p_document_number text,
  p_unit_value numeric,
  p_notes text,
  p_related_issue_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_profile public.profiles%rowtype;
  v_issue public.book_movements%rowtype;
  v_permission text;
  v_delta integer;
  v_result integer;
  v_returned integer;
  v_id uuid;
  v_student text := nullif(btrim(p_student_name), '');
begin
  if p_movement_type is null
     or p_movement_type not in ('entry', 'issue', 'return', 'adjustment') then
    raise exception 'Tipo de movimentação inválido.' using errcode = '22023';
  end if;

  if p_quantity is null then
    raise exception 'Informe a quantidade da movimentação.' using errcode = '22023';
  end if;

  v_permission := case p_movement_type
    when 'entry' then 'inventory.entry'
    when 'issue' then 'inventory.issue'
    when 'return' then 'inventory.return'
    else 'inventory.adjust'
  end;

  if not public.has_permission(v_permission) then
    raise exception 'Operação de livros não autorizada.' using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid() and active = true;

  if not found then
    raise exception 'Perfil ativo não encontrado.' using errcode = '42501';
  end if;

  -- O lock do item serializa todas as operações concorrentes do mesmo livro.
  select * into v_item
  from public.inventory_items
  where id = p_item_id and item_type = 'book' and active = true
  for update;

  if not found then
    raise exception 'Livro não encontrado ou inativo.' using errcode = 'P0002';
  end if;

  if p_movement_type in ('entry', 'issue', 'return') and p_quantity <= 0 then
    raise exception 'A quantidade deve ser maior que zero.' using errcode = '22023';
  end if;

  if p_movement_type = 'adjustment' and p_quantity = 0 then
    raise exception 'O ajuste deve alterar o saldo.' using errcode = '22023';
  end if;

  if p_movement_type = 'issue' and v_student is null then
    raise exception 'Informe o aluno.' using errcode = '23514';
  end if;

  if p_movement_type = 'return' then
    if p_related_issue_id is not null then
      select * into v_issue
      from public.book_movements
      where id = p_related_issue_id
        and item_id = p_item_id
        and movement_type = 'issue'
      for update;
    else
      if v_student is null then
        raise exception 'Informe o aluno da devolução.' using errcode = '23514';
      end if;

      -- Compatibilidade com a API atual: quando a entrega não é informada pelo
      -- cliente, vincula à entrega mais recente do mesmo aluno com saldo aberto.
      select bm.* into v_issue
      from public.book_movements bm
      where bm.item_id = p_item_id
        and bm.movement_type = 'issue'
        and lower(btrim(coalesce(bm.student_name, ''))) = lower(v_student)
        and abs(bm.quantity_change) - coalesce((
          select sum(r.quantity_change)
          from public.book_movements r
          where r.related_movement_id = bm.id
            and r.movement_type = 'return'
        ), 0) >= p_quantity
      order by bm.movement_date desc, bm.created_at desc
      limit 1
      for update;
    end if;

    if not found then
      raise exception 'Nenhuma entrega pendente foi encontrada para esta devolução.'
        using errcode = '23514';
    end if;

    if v_student is not null
       and lower(v_student) <> lower(btrim(coalesce(v_issue.student_name, ''))) then
      raise exception 'O aluno informado não corresponde à entrega selecionada.'
        using errcode = '23514';
    end if;

    -- Não é seguro inferir retroativamente a qual entrega pertencem devoluções
    -- legadas sem vínculo. Bloqueia uma nova devolução para o mesmo livro/aluno,
    -- em vez de correr o risco de devolver a mesma unidade duas vezes.
    if exists (
      select 1
      from public.book_movements legacy_return
      where legacy_return.item_id = p_item_id
        and legacy_return.movement_type = 'return'
        and legacy_return.related_movement_id is null
        and lower(btrim(coalesce(legacy_return.student_name, ''))) =
            lower(btrim(coalesce(v_issue.student_name, '')))
    ) then
      raise exception 'Existem devoluções históricas sem vínculo para este livro e aluno. Revise o histórico antes de registrar outra devolução.'
        using errcode = '23514';
    end if;

    select coalesce(sum(quantity_change), 0)::integer
      into v_returned
    from public.book_movements
    where related_movement_id = v_issue.id
      and movement_type = 'return';

    if p_quantity > abs(v_issue.quantity_change) - v_returned then
      raise exception 'A devolução excede a quantidade ainda pendente da entrega. Disponível para devolução: %.',
        abs(v_issue.quantity_change) - v_returned
        using errcode = '23514';
    end if;

    v_student := v_issue.student_name;
  elsif p_related_issue_id is not null then
    raise exception 'Somente devoluções podem referenciar uma entrega.'
      using errcode = '23514';
  end if;

  v_delta := case when p_movement_type = 'issue' then -p_quantity else p_quantity end;
  v_result := v_item.current_quantity + v_delta;

  if v_result < 0 then
    raise exception 'Estoque insuficiente. Disponível: %.', v_item.current_quantity
      using errcode = '23514';
  end if;

  perform set_config('app.inventory_movement', 'on', true);
  update public.inventory_items
  set current_quantity = v_result,
      unit_value = case
        when p_movement_type = 'entry' and p_unit_value is not null then p_unit_value
        else unit_value
      end
  where id = v_item.id;
  perform set_config('app.inventory_movement', 'off', true);

  insert into public.book_movements (
    item_id, item_name, movement_type, quantity_change,
    previous_quantity, resulting_quantity, student_name, class_name,
    supplier, document_number, unit_value, movement_date,
    responsible_id, responsible_name, notes, related_movement_id
  ) values (
    v_item.id, v_item.name, p_movement_type, v_delta,
    v_item.current_quantity, v_result, v_student,
    nullif(btrim(p_class_name), ''), nullif(btrim(p_supplier), ''),
    nullif(btrim(p_document_number), ''), p_unit_value,
    coalesce(p_movement_date, current_date), v_profile.id, v_profile.name,
    nullif(btrim(p_notes), ''),
    case when p_movement_type = 'return' then v_issue.id else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all privileges on function public._record_book_movement(
  uuid, text, integer, text, text, date, text, text, numeric, text, uuid
) from public, anon, authenticated;

-- Mantém a assinatura consumida pelo frontend atual.
create or replace function public.record_book_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_student_name text default null,
  p_class_name text default null,
  p_movement_date date default current_date,
  p_supplier text default null,
  p_document_number text default null,
  p_unit_value numeric default null,
  p_notes text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public._record_book_movement(
    p_item_id, p_movement_type, p_quantity, p_student_name, p_class_name,
    p_movement_date, p_supplier, p_document_number, p_unit_value, p_notes, null
  );
$$;

-- API explícita para clientes que já conhecem a entrega original.
create or replace function public.record_book_return(
  p_item_id uuid,
  p_issue_id uuid,
  p_quantity integer,
  p_movement_date date default current_date,
  p_notes text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public._record_book_movement(
    p_item_id, 'return', p_quantity, null, null,
    p_movement_date, null, null, null, p_notes, p_issue_id
  );
$$;

-- A RPC legada deixa de manter um segundo livro-caixa. Ela preserva a assinatura
-- pública, mas delega ao histórico oficial em book_movements.
create or replace function public.record_inventory_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_student_name text default null,
  p_notes text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.record_book_movement(
    p_item_id, p_movement_type, p_quantity, p_student_name, null,
    current_date, null, null, null, p_notes
  );
$$;

-- Cadastro/edição e reconciliação do saldo passam a formar uma única transação.
-- Em criação, um saldo positivo produz exatamente uma entrada. Em edição, uma
-- mudança de saldo produz exatamente um ajuste compensatório.
create or replace function public.save_inventory_book(
  p_item_id uuid,
  p_internal_code text,
  p_name text,
  p_category text,
  p_collection text,
  p_course text,
  p_level text,
  p_volume text,
  p_edition text,
  p_language text,
  p_minimum_quantity integer,
  p_target_quantity integer,
  p_location text,
  p_unit_value numeric,
  p_notes text,
  p_active boolean
)
returns public.inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_result public.inventory_items%rowtype;
  v_target integer;
  v_delta integer;
  v_is_create boolean := p_item_id is null;
  v_requested_active boolean;
begin
  if coalesce(btrim(p_internal_code), '') = ''
     or coalesce(btrim(p_name), '') = ''
     or coalesce(btrim(p_collection), '') = ''
     or coalesce(btrim(p_level), '') = ''
     or coalesce(btrim(p_language), '') = ''
     or coalesce(btrim(p_edition), '') = '' then
    raise exception 'Preencha os campos obrigatórios do livro.' using errcode = '23514';
  end if;

  if p_minimum_quantity is null or p_minimum_quantity < 0 then
    raise exception 'A quantidade mínima deve ser um inteiro igual ou maior que zero.'
      using errcode = '23514';
  end if;

  if p_target_quantity is not null and p_target_quantity < 0 then
    raise exception 'O estoque atual deve ser um inteiro igual ou maior que zero.'
      using errcode = '23514';
  end if;

  if p_unit_value is not null and p_unit_value < 0 then
    raise exception 'O valor unitário não pode ser negativo.' using errcode = '23514';
  end if;

  if v_is_create then
    if not public.has_permission('inventory.create') then
      raise exception 'Cadastro de livro não autorizado.' using errcode = '42501';
    end if;

    v_target := coalesce(p_target_quantity, 0);
    v_requested_active := coalesce(p_active, true);

    if v_target > 0 and not public.has_permission('inventory.entry') then
      raise exception 'Permissão de entrada necessária para informar estoque inicial.'
        using errcode = '42501';
    end if;

    if not v_requested_active and not public.has_permission('inventory.inactivate') then
      raise exception 'Permissão de inativação necessária.' using errcode = '42501';
    end if;

    insert into public.inventory_items (
      item_type, internal_code, name, category, collection, course, level,
      volume, edition, language, current_quantity, minimum_quantity,
      location, unit_value, notes, active, created_by
    ) values (
      'book', upper(btrim(p_internal_code)), btrim(p_name),
      coalesce(nullif(btrim(p_category), ''), 'Material didático'),
      btrim(p_collection), nullif(btrim(p_course), ''), btrim(p_level),
      nullif(btrim(p_volume), ''), btrim(p_edition), btrim(p_language),
      0, p_minimum_quantity, nullif(btrim(p_location), ''), p_unit_value,
      coalesce(p_notes, ''), true, auth.uid()
    )
    returning * into v_item;

    if v_target > 0 then
      perform public._record_book_movement(
        v_item.id, 'entry', v_target, null, null, current_date,
        null, null, p_unit_value, 'Estoque inicial informado no cadastro.', null
      );
    end if;

    if not v_requested_active then
      update public.inventory_items set active = false where id = v_item.id;
    end if;
  else
    if not public.has_permission('inventory.edit') then
      raise exception 'Edição de livro não autorizada.' using errcode = '42501';
    end if;

    select * into v_item
    from public.inventory_items
    where id = p_item_id and item_type = 'book'
    for update;

    if not found then
      raise exception 'Livro não encontrado.' using errcode = 'P0002';
    end if;

    v_target := coalesce(p_target_quantity, v_item.current_quantity);
    v_requested_active := coalesce(p_active, v_item.active);

    if not v_item.active and v_requested_active then
      raise exception 'Livros inativos não podem ser reativados por esta operação.'
        using errcode = '42501';
    end if;

    if v_item.active and not v_requested_active
       and not public.has_permission('inventory.inactivate') then
      raise exception 'Permissão de inativação necessária.' using errcode = '42501';
    end if;

    v_delta := v_target - v_item.current_quantity;
    if v_delta <> 0 and not public.has_permission('inventory.adjust') then
      raise exception 'Permissão de ajuste necessária para alterar o saldo.'
        using errcode = '42501';
    end if;

    if not v_item.active and v_delta <> 0 then
      raise exception 'O saldo de um livro inativo não pode ser alterado.'
        using errcode = '23514';
    end if;

    update public.inventory_items
    set internal_code = upper(btrim(p_internal_code)),
        name = btrim(p_name),
        category = coalesce(nullif(btrim(p_category), ''), 'Material didático'),
        collection = btrim(p_collection),
        course = nullif(btrim(p_course), ''),
        level = btrim(p_level),
        volume = nullif(btrim(p_volume), ''),
        edition = btrim(p_edition),
        language = btrim(p_language),
        minimum_quantity = p_minimum_quantity,
        location = nullif(btrim(p_location), ''),
        unit_value = p_unit_value,
        notes = coalesce(p_notes, '')
    where id = v_item.id;

    if v_delta <> 0 then
      perform public._record_book_movement(
        v_item.id, 'adjustment', v_delta, null, null, current_date,
        null, null, null, 'Saldo atualizado no cadastro do livro.', null
      );
    end if;

    if v_item.active and not v_requested_active then
      update public.inventory_items set active = false where id = v_item.id;
    end if;
  end if;

  select * into v_result from public.inventory_items
  where id = coalesce(p_item_id, v_item.id);

  return v_result;
end;
$$;

-- Patrimônio: novos bens começam disponíveis e sem responsável; essas duas
-- dimensões só podem mudar por uma movimentação auditada.
create or replace function public.guard_asset_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status <> 'available' then
    raise exception 'O bem deve ser criado como Disponível; use uma movimentação para alterar o status.'
      using errcode = '23514';
  end if;

  if nullif(btrim(new.current_responsible), '') is not null then
    raise exception 'O responsável inicial deve ser atribuído por movimentação patrimonial.'
      using errcode = '23514';
  end if;

  new.current_responsible := null;
  return new;
end;
$$;

drop trigger if exists assets_guard_insert on public.assets;
create trigger assets_guard_insert
before insert on public.assets
for each row execute function public.guard_asset_insert();

create or replace function public.guard_asset_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement boolean := coalesce(current_setting('app.asset_movement', true), '') = 'on';
begin
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'A identidade e a data de criação do bem não podem ser alteradas.'
      using errcode = '42501';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'O autor original do bem não pode ser alterado.'
      using errcode = '42501';
  end if;

  if v_movement then
    if new.id is distinct from old.id
       or new.asset_code is distinct from old.asset_code
       or new.name is distinct from old.name
       or new.category is distinct from old.category
       or new.brand is distinct from old.brand
       or new.model is distinct from old.model
       or new.serial_number is distinct from old.serial_number
       or new.quantity is distinct from old.quantity
       or new.acquisition_date is distinct from old.acquisition_date
       or new.acquisition_value is distinct from old.acquisition_value
       or new.supplier is distinct from old.supplier
       or new.condition is distinct from old.condition
       or new.notes is distinct from old.notes
       or new.created_by is distinct from old.created_by then
      raise exception 'Uma movimentação só pode alterar sala, responsável e status.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.location is distinct from old.location
     or new.current_responsible is distinct from old.current_responsible then
    raise exception 'Status, sala e responsável só podem mudar por movimentação patrimonial.'
      using errcode = '42501';
  end if;

  if not public.has_permission('assets.edit') then
    raise exception 'Edição patrimonial não autorizada.' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Mantém a assinatura atual, mas ignora origem e responsável anterior enviados
-- pelo cliente: ambos são sempre derivados da linha bloqueada no banco.
create or replace function public.record_asset_movement(
  p_asset_id uuid,
  p_movement_type text,
  p_origin text default null,
  p_destination text default null,
  p_previous_responsible text default null,
  p_new_responsible text default null,
  p_movement_date date default current_date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.assets%rowtype;
  v_profile public.profiles%rowtype;
  v_permission text;
  v_status text;
  v_location text;
  v_responsible text;
  v_destination text := nullif(btrim(p_destination), '');
  v_requested_responsible text := nullif(btrim(p_new_responsible), '');
  v_id uuid;
begin
  if p_movement_type is null or p_movement_type not in (
    'transfer', 'assignment', 'return', 'maintenance_out',
    'maintenance_return', 'loan', 'retirement', 'adjustment'
  ) then
    raise exception 'Tipo de movimentação patrimonial inválido.' using errcode = '22023';
  end if;

  v_permission := case p_movement_type
    when 'assignment' then 'assets.assign'
    when 'return' then 'assets.return'
    when 'maintenance_out' then 'assets.maintenance'
    when 'maintenance_return' then 'assets.return'
    when 'retirement' then 'assets.retire'
    when 'adjustment' then 'assets.edit'
    else 'assets.move'
  end;

  if not public.has_permission(v_permission) then
    raise exception 'Movimentação patrimonial não autorizada.' using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid() and active = true;

  if not found then
    raise exception 'Perfil ativo não encontrado.' using errcode = '42501';
  end if;

  select * into v_asset
  from public.assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'Bem não encontrado.' using errcode = 'P0002';
  end if;

  if v_asset.status in ('retired', 'inactive') then
    raise exception 'Bens baixados ou inativos não podem ser movimentados.'
      using errcode = '23514';
  end if;

  if p_movement_date is not null and p_movement_date > current_date then
    raise exception 'A data da movimentação não pode estar no futuro.'
      using errcode = '23514';
  end if;

  v_status := v_asset.status;
  v_location := v_asset.location;
  v_responsible := v_asset.current_responsible;

  case p_movement_type
    when 'transfer' then
      if v_asset.status not in ('available', 'in_use') then
        raise exception 'Somente bens disponíveis ou em uso podem ser transferidos.'
          using errcode = '23514';
      end if;
      if v_destination is null then
        raise exception 'Informe a sala de destino.' using errcode = '23514';
      end if;
      if v_destination is not distinct from v_asset.location then
        raise exception 'A sala de destino deve ser diferente da sala atual.'
          using errcode = '23514';
      end if;
      v_location := v_destination;

    when 'assignment' then
      if v_asset.status not in ('available', 'in_use') then
        raise exception 'Este bem não pode receber uma atribuição no status atual.'
          using errcode = '23514';
      end if;
      if v_requested_responsible is null then
        raise exception 'Informe o novo responsável.' using errcode = '23514';
      end if;
      v_status := 'in_use';
      v_responsible := v_requested_responsible;
      v_location := coalesce(v_destination, v_asset.location);

    when 'return' then
      if v_asset.status not in ('in_use', 'loaned') then
        raise exception 'Somente bens em uso ou emprestados podem ser devolvidos.'
          using errcode = '23514';
      end if;
      v_status := 'available';
      v_responsible := null;
      v_location := coalesce(v_destination, v_asset.location);

    when 'maintenance_out' then
      if v_asset.status not in ('available', 'in_use') then
        raise exception 'Este bem não pode ser enviado para manutenção no status atual.'
          using errcode = '23514';
      end if;
      if v_destination is null then
        raise exception 'Informe o destino da manutenção.' using errcode = '23514';
      end if;
      v_status := 'maintenance';
      v_location := v_destination;
      v_responsible := null;

    when 'maintenance_return' then
      if v_asset.status <> 'maintenance' then
        raise exception 'Somente bens em manutenção podem registrar retorno da manutenção.'
          using errcode = '23514';
      end if;
      if v_destination is null then
        raise exception 'Informe a sala de retorno.' using errcode = '23514';
      end if;
      v_status := 'available';
      v_location := v_destination;
      v_responsible := null;

    when 'loan' then
      if v_asset.status <> 'available' then
        raise exception 'Somente bens disponíveis podem ser emprestados.'
          using errcode = '23514';
      end if;
      if v_requested_responsible is null then
        raise exception 'Informe quem receberá o empréstimo.' using errcode = '23514';
      end if;
      v_status := 'loaned';
      v_responsible := v_requested_responsible;
      v_location := coalesce(v_destination, v_asset.location);

    when 'retirement' then
      if coalesce(btrim(p_notes), '') = '' then
        raise exception 'Informe o motivo da baixa patrimonial.' using errcode = '23514';
      end if;
      v_status := 'retired';
      v_responsible := null;

    when 'adjustment' then
      if v_destination is not null
         and v_destination is distinct from v_asset.location
         and not public.has_permission('assets.move') then
        raise exception 'Permissão de movimentação necessária para corrigir a sala.'
          using errcode = '42501';
      end if;
      if v_requested_responsible is not null
         and v_requested_responsible is distinct from v_asset.current_responsible
         and not public.has_permission('assets.assign') then
        raise exception 'Permissão de atribuição necessária para corrigir o responsável.'
          using errcode = '42501';
      end if;
      v_location := coalesce(v_destination, v_asset.location);
      v_responsible := coalesce(v_requested_responsible, v_asset.current_responsible);
  end case;

  if v_status is not distinct from v_asset.status
     and v_location is not distinct from v_asset.location
     and v_responsible is not distinct from v_asset.current_responsible
     and coalesce(btrim(p_notes), '') = '' then
    raise exception 'A movimentação não produz nenhuma alteração no bem.'
      using errcode = '23514';
  end if;

  perform set_config('app.asset_movement', 'on', true);
  update public.assets
  set location = v_location,
      current_responsible = v_responsible,
      status = v_status
  where id = v_asset.id;
  perform set_config('app.asset_movement', 'off', true);

  insert into public.asset_movements (
    asset_id, asset_name, movement_type, origin, destination,
    previous_responsible, new_responsible, previous_status, resulting_status,
    performed_by, performed_by_name, movement_date, notes
  ) values (
    v_asset.id, v_asset.name, p_movement_type, v_asset.location, v_location,
    v_asset.current_responsible, v_responsible, v_asset.status, v_status,
    v_profile.id, v_profile.name, coalesce(p_movement_date, current_date),
    nullif(btrim(p_notes), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- As funções públicas são o único caminho de escrita no histórico. O núcleo
-- privado permanece inacessível aos clientes.
grant execute on function public.record_book_movement(
  uuid, text, integer, text, text, date, text, text, numeric, text
) to authenticated;
grant execute on function public.record_book_return(
  uuid, uuid, integer, date, text
) to authenticated;
grant execute on function public.record_inventory_movement(
  uuid, text, integer, text, text
) to authenticated;
grant execute on function public.save_inventory_book(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, text, numeric, text, boolean
) to authenticated;
grant execute on function public.record_asset_movement(
  uuid, text, text, text, text, text, date, text
) to authenticated;

revoke all privileges on function public.record_book_movement(
  uuid, text, integer, text, text, date, text, text, numeric, text
) from public, anon;
revoke all privileges on function public.record_book_return(
  uuid, uuid, integer, date, text
) from public, anon;
revoke all privileges on function public.record_inventory_movement(
  uuid, text, integer, text, text
) from public, anon;
revoke all privileges on function public.save_inventory_book(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, text, numeric, text, boolean
) from public, anon;
revoke all privileges on function public.record_asset_movement(
  uuid, text, text, text, text, text, date, text
) from public, anon;

-- Mantém o histórico legado disponível apenas para leitura. Novas chamadas da
-- RPC antiga já escrevem em book_movements, portanto não há dois saldos ativos.
revoke insert, update, delete on public.inventory_movements from authenticated;
revoke insert, update, delete on public.book_movements from authenticated;
revoke insert, update, delete on public.asset_movements from authenticated;
