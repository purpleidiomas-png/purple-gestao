-- Purple Gestão — separação entre Estoque de Livros e Patrimônio.
-- Migração incremental e não destrutiva.
-- Dependência obrigatória: 20260716_access_control.sql e 20260717_inventory.sql.

alter table public.inventory_items
  add column if not exists collection text,
  add column if not exists volume text,
  add column if not exists edition text,
  add column if not exists language text,
  add column if not exists unit_value numeric(12,2) check (unit_value is null or unit_value >= 0);

create table if not exists public.book_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  item_name text not null,
  movement_type text not null check (movement_type in ('entry','issue','return','adjustment')),
  quantity_change integer not null check (quantity_change <> 0),
  previous_quantity integer not null check (previous_quantity >= 0),
  resulting_quantity integer not null check (resulting_quantity >= 0),
  student_name text,
  class_name text,
  supplier text,
  document_number text,
  unit_value numeric(12,2) check (unit_value is null or unit_value >= 0),
  movement_date date not null default current_date,
  responsible_id uuid not null references public.profiles(id),
  responsible_name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists book_movements_item_created_idx on public.book_movements(item_id, created_at desc);
create index if not exists book_movements_date_idx on public.book_movements(movement_date desc);

-- Preserva e incorpora o histórico produzido pela primeira versão do módulo.
insert into public.book_movements (
  id,item_id,item_name,movement_type,quantity_change,previous_quantity,resulting_quantity,
  student_name,responsible_id,responsible_name,notes,movement_date,created_at
)
select id,item_id,item_name,movement_type,quantity_change,previous_quantity,resulting_quantity,
       student_name,responsible_id,responsible_name,notes,created_at::date,created_at
from public.inventory_movements
on conflict (id) do nothing;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique,
  name text not null,
  category text not null,
  brand text,
  model text,
  serial_number text unique,
  quantity integer not null default 1 check (quantity > 0),
  location text,
  current_responsible text,
  acquisition_date date,
  acquisition_value numeric(14,2) check (acquisition_value is null or acquisition_value >= 0),
  supplier text,
  condition text not null default 'good' check (condition in ('new','excellent','good','fair','poor')),
  status text not null default 'available' check (status in ('available','in_use','maintenance','loaned','inactive','retired')),
  notes text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_movements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete restrict,
  asset_name text not null,
  movement_type text not null check (movement_type in ('transfer','assignment','return','maintenance_out','maintenance_return','loan','retirement','adjustment')),
  origin text,
  destination text,
  previous_responsible text,
  new_responsible text,
  previous_status text not null,
  resulting_status text not null,
  performed_by uuid not null references public.profiles(id),
  performed_by_name text not null,
  movement_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists assets_category_status_idx on public.assets(category,status);
create index if not exists assets_location_idx on public.assets(location);
create index if not exists asset_movements_asset_date_idx on public.asset_movements(asset_id,movement_date desc);

alter table public.book_movements enable row level security;
alter table public.assets enable row level security;
alter table public.asset_movements enable row level security;

alter table public.profiles disable trigger profiles_permission_audit;
update public.profiles
set permissions = permissions || case when role='direction' then
  '{"inventory.view":true,"inventory.create":true,"inventory.edit":true,"inventory.issue":true,"inventory.entry":true,"inventory.return":true,"inventory.adjust":true,"inventory.inactivate":true,"inventory.export":true,"assets.view":true,"assets.create":true,"assets.edit":true,"assets.move":true,"assets.assign":true,"assets.maintenance":true,"assets.return":true,"assets.retire":true,"assets.export":true}'::jsonb
else
  '{"inventory.return":false,"inventory.inactivate":false,"inventory.export":false,"assets.view":false,"assets.create":false,"assets.edit":false,"assets.move":false,"assets.assign":false,"assets.maintenance":false,"assets.return":false,"assets.retire":false,"assets.export":false}'::jsonb
end;
alter table public.profiles enable trigger profiles_permission_audit;

create policy book_movements_v2_select on public.book_movements for select
using (public.has_permission('inventory.view'));

create policy assets_select on public.assets for select
using (public.has_permission('assets.view'));

create policy assets_insert on public.assets for insert
with check (created_by=auth.uid() and public.has_permission('assets.create'));

create policy assets_update on public.assets for update
using (public.has_permission('assets.edit'))
with check (public.has_permission('assets.edit'));

create policy asset_movements_select on public.asset_movements for select
using (public.has_permission('assets.view'));

create or replace function public.guard_inventory_item_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.current_quantity is distinct from old.current_quantity
     and coalesce(current_setting('app.inventory_movement',true),'') <> 'on' then
    raise exception 'A quantidade só pode ser alterada por movimentação de livros.' using errcode='42501';
  end if;
  if coalesce(current_setting('app.inventory_movement',true),'')='on' then return new; end if;
  if public.has_permission('inventory.edit') then return new; end if;
  if public.has_permission('inventory.inactivate') and old.active=true and new.active=false
     and new.current_quantity is not distinct from old.current_quantity then return new; end if;
  raise exception 'Alteração de livro não autorizada.' using errcode='42501';
end;
$$;

create or replace function public.guard_asset_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (new.status is distinct from old.status or new.location is distinct from old.location
      or new.current_responsible is distinct from old.current_responsible)
     and coalesce(current_setting('app.asset_movement',true),'') <> 'on' then
    raise exception 'Status, sala e responsável só podem mudar por movimentação patrimonial.' using errcode='42501';
  end if;
  return new;
end;
$$;

create trigger assets_guard_update before update on public.assets
for each row execute function public.guard_asset_update();

create trigger assets_touch_updated_at before update on public.assets
for each row execute function public.touch_updated_at();

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
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_item public.inventory_items%rowtype;
  v_profile public.profiles%rowtype;
  v_permission text;
  v_delta integer;
  v_result integer;
  v_id uuid;
begin
  if p_movement_type not in ('entry','issue','return','adjustment') then raise exception 'Tipo de movimentação inválido.'; end if;
  v_permission:=case p_movement_type when 'entry' then 'inventory.entry' when 'issue' then 'inventory.issue' when 'return' then 'inventory.return' else 'inventory.adjust' end;
  if not public.has_permission(v_permission) then raise exception 'Operação de livros não autorizada.' using errcode='42501'; end if;
  select * into v_profile from public.profiles where id=auth.uid() and active=true;
  if not found then raise exception 'Perfil ativo não encontrado.' using errcode='42501'; end if;
  select * into v_item from public.inventory_items where id=p_item_id and item_type='book' and active=true for update;
  if not found then raise exception 'Livro não encontrado ou inativo.'; end if;
  if p_movement_type in ('entry','issue','return') and p_quantity<=0 then raise exception 'A quantidade deve ser maior que zero.'; end if;
  if p_movement_type='adjustment' and p_quantity=0 then raise exception 'O ajuste deve alterar o saldo.'; end if;
  if p_movement_type in ('issue','return') and coalesce(trim(p_student_name),'')='' then raise exception 'Informe o aluno.'; end if;
  v_delta:=case when p_movement_type='issue' then -p_quantity else p_quantity end;
  v_result:=v_item.current_quantity+v_delta;
  if v_result<0 then raise exception 'Estoque insuficiente. Disponível: %.',v_item.current_quantity; end if;
  perform set_config('app.inventory_movement','on',true);
  update public.inventory_items set current_quantity=v_result,
    unit_value=case when p_movement_type='entry' and p_unit_value is not null then p_unit_value else unit_value end
  where id=v_item.id;
  insert into public.book_movements(item_id,item_name,movement_type,quantity_change,previous_quantity,resulting_quantity,student_name,class_name,supplier,document_number,unit_value,movement_date,responsible_id,responsible_name,notes)
  values(v_item.id,v_item.name,p_movement_type,v_delta,v_item.current_quantity,v_result,nullif(trim(p_student_name),''),nullif(trim(p_class_name),''),nullif(trim(p_supplier),''),nullif(trim(p_document_number),''),p_unit_value,coalesce(p_movement_date,current_date),v_profile.id,v_profile.name,nullif(trim(p_notes),'')) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.inactivate_inventory_item(p_item_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_permission('inventory.inactivate') then raise exception 'Operação não autorizada.' using errcode='42501'; end if;
  update public.inventory_items set active=false where id=p_item_id and item_type='book';
  if not found then raise exception 'Livro não encontrado.'; end if;
end;
$$;

create or replace function public.delete_unmoved_book(p_item_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_permission('inventory.inactivate') then raise exception 'Operação não autorizada.' using errcode='42501'; end if;
  if exists(select 1 from public.book_movements where item_id=p_item_id)
     or exists(select 1 from public.inventory_movements where item_id=p_item_id) then
    raise exception 'Livros com movimentações não podem ser excluídos; utilize Inativo.';
  end if;
  delete from public.inventory_items where id=p_item_id and item_type='book';
  if not found then raise exception 'Livro não encontrado.'; end if;
end;
$$;

create or replace function public.record_asset_movement(
  p_asset_id uuid,
  p_movement_type text,
  p_origin text default null,
  p_destination text default null,
  p_previous_responsible text default null,
  p_new_responsible text default null,
  p_movement_date date default current_date,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_asset public.assets%rowtype;
  v_profile public.profiles%rowtype;
  v_permission text;
  v_status text;
  v_id uuid;
begin
  if p_movement_type not in ('transfer','assignment','return','maintenance_out','maintenance_return','loan','retirement','adjustment') then raise exception 'Tipo inválido.'; end if;
  v_permission:=case p_movement_type when 'assignment' then 'assets.assign' when 'maintenance_out' then 'assets.maintenance' when 'maintenance_return' then 'assets.return' when 'retirement' then 'assets.retire' else 'assets.move' end;
  if not public.has_permission(v_permission) then raise exception 'Movimentação patrimonial não autorizada.' using errcode='42501'; end if;
  select * into v_profile from public.profiles where id=auth.uid() and active=true;
  if not found then raise exception 'Perfil ativo não encontrado.' using errcode='42501'; end if;
  select * into v_asset from public.assets where id=p_asset_id for update;
  if not found then raise exception 'Bem não encontrado.'; end if;
  v_status:=case p_movement_type when 'assignment' then 'in_use' when 'return' then 'available' when 'maintenance_out' then 'maintenance' when 'maintenance_return' then 'available' when 'loan' then 'loaned' when 'retirement' then 'retired' else v_asset.status end;
  perform set_config('app.asset_movement','on',true);
  update public.assets set
    location=case when p_destination is not null then p_destination else location end,
    current_responsible=case when p_movement_type='return' then null when p_new_responsible is not null then p_new_responsible else current_responsible end,
    status=v_status
  where id=v_asset.id;
  insert into public.asset_movements(asset_id,asset_name,movement_type,origin,destination,previous_responsible,new_responsible,previous_status,resulting_status,performed_by,performed_by_name,movement_date,notes)
  values(v_asset.id,v_asset.name,p_movement_type,coalesce(p_origin,v_asset.location),p_destination,coalesce(p_previous_responsible,v_asset.current_responsible),p_new_responsible,v_asset.status,v_status,v_profile.id,v_profile.name,coalesce(p_movement_date,current_date),nullif(trim(p_notes),'')) returning id into v_id;
  return v_id;
end;
$$;

grant select on public.book_movements,public.assets,public.asset_movements to authenticated;
grant insert,update on public.assets to authenticated;
revoke insert,update,delete on public.book_movements,public.asset_movements from authenticated;
revoke delete on public.assets from authenticated;
revoke all on public.book_movements,public.assets,public.asset_movements from anon;
grant execute on function public.record_book_movement(uuid,text,integer,text,text,date,text,text,numeric,text) to authenticated;
grant execute on function public.inactivate_inventory_item(uuid) to authenticated;
grant execute on function public.delete_unmoved_book(uuid) to authenticated;
grant execute on function public.record_asset_movement(uuid,text,text,text,text,text,date,text) to authenticated;
