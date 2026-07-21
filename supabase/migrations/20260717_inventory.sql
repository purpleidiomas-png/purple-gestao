-- Purple Gestão — Estoque genérico de itens físicos.
-- Migração aditiva e não destrutiva. Livros são o primeiro tipo de item.

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null default 'book',
  internal_code text unique,
  name text not null,
  category text not null default 'Livro didático',
  course text,
  level text,
  current_quantity integer not null default 0 check (current_quantity >= 0),
  minimum_quantity integer not null default 0 check (minimum_quantity >= 0),
  location text,
  notes text not null default '',
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  item_name text not null,
  movement_type text not null check (movement_type in ('entry','issue','adjustment')),
  quantity_change integer not null check (quantity_change <> 0),
  previous_quantity integer not null check (previous_quantity >= 0),
  resulting_quantity integer not null check (resulting_quantity >= 0),
  student_name text,
  responsible_id uuid not null references public.profiles(id),
  responsible_name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_items_active_type_idx on public.inventory_items(active, item_type);
create index if not exists inventory_items_course_category_idx on public.inventory_items(course, category);
create index if not exists inventory_movements_item_created_idx on public.inventory_movements(item_id, created_at desc);
create index if not exists inventory_movements_created_idx on public.inventory_movements(created_at desc);

create or replace function public.guard_inventory_item_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.current_quantity is distinct from old.current_quantity
     and coalesce(current_setting('app.inventory_movement', true), '') <> 'on' then
    raise exception 'A quantidade só pode ser alterada por uma movimentação de estoque.' using errcode = '42501';
  end if;
  if public.has_permission('inventory.edit') then return new; end if;
  if public.has_permission('inventory.delete') and old.active = true and new.active = false
     and new.item_type is not distinct from old.item_type and new.internal_code is not distinct from old.internal_code
     and new.name is not distinct from old.name and new.category is not distinct from old.category
     and new.course is not distinct from old.course and new.level is not distinct from old.level
     and new.current_quantity is not distinct from old.current_quantity and new.minimum_quantity is not distinct from old.minimum_quantity
     and new.location is not distinct from old.location and new.notes is not distinct from old.notes
     and new.created_by is not distinct from old.created_by then return new; end if;
  if coalesce(current_setting('app.inventory_movement', true), '') = 'on'
     and new.current_quantity is distinct from old.current_quantity
     and new.item_type is not distinct from old.item_type and new.internal_code is not distinct from old.internal_code
     and new.name is not distinct from old.name and new.category is not distinct from old.category
     and new.course is not distinct from old.course and new.level is not distinct from old.level
     and new.minimum_quantity is not distinct from old.minimum_quantity and new.location is not distinct from old.location
     and new.notes is not distinct from old.notes and new.active is not distinct from old.active
     and new.created_by is not distinct from old.created_by then return new; end if;
  raise exception 'Alteração de item de estoque não autorizada.' using errcode = '42501';
end;
$$;

create or replace function public.guard_inventory_item_insert()
returns trigger language plpgsql as $$
begin
  if new.current_quantity <> 0 then
    raise exception 'O estoque inicial deve ser registrado como entrada.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger inventory_items_guard_insert before insert on public.inventory_items
for each row execute function public.guard_inventory_item_insert();

create trigger inventory_items_guard_update before update on public.inventory_items
for each row execute function public.guard_inventory_item_update();

create trigger inventory_items_touch_updated_at before update on public.inventory_items
for each row execute function public.touch_updated_at();

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

-- Atribuição inicial de permissões para perfis existentes. O gatilho de auditoria
-- depende de auth.uid(), indisponível durante a execução administrativa da migração.
alter table public.profiles disable trigger profiles_permission_audit;
update public.profiles
set permissions = permissions || case
  when role = 'direction' then '{"inventory.view":true,"inventory.create":true,"inventory.edit":true,"inventory.delete":true,"inventory.entry":true,"inventory.issue":true,"inventory.adjust":true}'::jsonb
  when role = 'viewer' then '{"inventory.view":true,"inventory.create":false,"inventory.edit":false,"inventory.delete":false,"inventory.entry":false,"inventory.issue":false,"inventory.adjust":false}'::jsonb
  else '{"inventory.view":false,"inventory.create":false,"inventory.edit":false,"inventory.delete":false,"inventory.entry":false,"inventory.issue":false,"inventory.adjust":false}'::jsonb
end;
alter table public.profiles enable trigger profiles_permission_audit;

create policy inventory_items_select on public.inventory_items for select
using (public.has_permission('inventory.view'));

create policy inventory_items_insert on public.inventory_items for insert
with check (created_by = auth.uid() and public.has_permission('inventory.create'));

create policy inventory_items_update on public.inventory_items for update
using (public.has_permission('inventory.edit') or public.has_permission('inventory.delete'))
with check (public.has_permission('inventory.edit') or public.has_permission('inventory.delete'));

create policy inventory_movements_select on public.inventory_movements for select
using (public.has_permission('inventory.view'));

create or replace function public.record_inventory_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_student_name text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_profile public.profiles%rowtype;
  v_delta integer;
  v_result integer;
  v_id uuid;
  v_permission text;
begin
  if p_movement_type not in ('entry','issue','adjustment') then
    raise exception 'Tipo de movimentação inválido.';
  end if;

  v_permission := case p_movement_type
    when 'entry' then 'inventory.entry'
    when 'issue' then 'inventory.issue'
    else 'inventory.adjust'
  end;

  if not public.has_permission(v_permission) then
    raise exception 'Operação de estoque não autorizada.' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = auth.uid() and active = true;
  if not found then raise exception 'Perfil ativo não encontrado.' using errcode = '42501'; end if;

  select * into v_item from public.inventory_items where id = p_item_id and active = true for update;
  if not found then raise exception 'Item de estoque não encontrado ou inativo.'; end if;

  if p_movement_type in ('entry','issue') and p_quantity <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;
  if p_movement_type = 'adjustment' and p_quantity = 0 then
    raise exception 'O ajuste deve alterar a quantidade.';
  end if;
  if p_movement_type = 'issue' and coalesce(trim(p_student_name),'') = '' then
    raise exception 'Informe o aluno que recebeu o item.';
  end if;

  v_delta := case when p_movement_type = 'issue' then -p_quantity else p_quantity end;
  v_result := v_item.current_quantity + v_delta;
  if v_result < 0 then raise exception 'Estoque insuficiente. Quantidade disponível: %.', v_item.current_quantity; end if;

  perform set_config('app.inventory_movement', 'on', true);
  update public.inventory_items set current_quantity = v_result where id = v_item.id;

  insert into public.inventory_movements(
    item_id,item_name,movement_type,quantity_change,previous_quantity,resulting_quantity,
    student_name,responsible_id,responsible_name,notes
  ) values (
    v_item.id,v_item.name,p_movement_type,v_delta,v_item.current_quantity,v_result,
    nullif(trim(p_student_name),''),v_profile.id,v_profile.name,nullif(trim(p_notes),'')
  ) returning id into v_id;

  return v_id;
end;
$$;

grant select, insert, update on public.inventory_items to authenticated;
grant select on public.inventory_movements to authenticated;
grant execute on function public.record_inventory_movement(uuid,text,integer,text,text) to authenticated;
revoke delete on public.inventory_items from authenticated;
revoke insert, update, delete on public.inventory_movements from authenticated;
revoke all on public.inventory_items, public.inventory_movements from anon;
