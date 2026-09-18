-- Purple Gestão — Produção de Livros V2.
-- Incremental: centraliza o padrão gráfico e adiciona arquivamento seguro.
-- Não altera inventory_items, estoque, financeiro, Asaas ou autenticação.

begin;

alter table public.production_print_profiles
  add column if not exists is_default boolean not null default false;

alter table public.production_books
  add column if not exists print_profile_id uuid references public.production_print_profiles(id) on delete restrict,
  add column if not exists status text not null default 'ACTIVE';

-- O backfill deve acontecer somente quando a coluna nasce. Assim, reaplicar a
-- migration não reativa uma exceção que a Direção tenha desligado depois.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'production_books'
      and column_name = 'has_custom_spec'
  ) then
    alter table public.production_books
      add column has_custom_spec boolean not null default false;

    update public.production_books b
    set has_custom_spec = true
    where exists (
      select 1 from public.production_book_print_specs s where s.book_id = b.id
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'production_books_status_check'
      and conrelid = 'public.production_books'::regclass
  ) then
    alter table public.production_books
      add constraint production_books_status_check
      check (status in ('ACTIVE', 'INACTIVE'));
  end if;
end $$;

create unique index if not exists production_print_profiles_one_default_idx
  on public.production_print_profiles (is_default)
  where is_default;

create index if not exists production_books_profile_idx
  on public.production_books (print_profile_id);

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
  v_status text := coalesce(nullif(p_profile->>'status', ''), 'ACTIVE');
  v_is_default boolean;
begin
  if not public.is_direction() then
    raise exception 'Operação restrita à Direção.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_profile->>'name'), '') = '' then
    raise exception 'Informe o nome do padrão.' using errcode = '22023';
  end if;
  if p_profile ? 'is_default' then
    v_is_default := coalesce((p_profile->>'is_default')::boolean, false);
  elsif v_profile_id is not null then
    select is_default into v_is_default
    from public.production_print_profiles
    where id = v_profile_id;
    v_is_default := coalesce(v_is_default, false);
  else
    v_is_default := false;
  end if;
  if v_status not in ('ACTIVE', 'INACTIVE') then
    raise exception 'Status do padrão inválido.' using errcode = '22023';
  end if;
  if v_status = 'INACTIVE' then v_is_default := false; end if;

  if v_is_default then
    update public.production_print_profiles
    set is_default = false, updated_by = auth.uid()
    where is_default and (v_profile_id is null or id <> v_profile_id);
  end if;

  if v_profile_id is null then
    insert into public.production_print_profiles (
      name, description, status, is_default, default_spec, created_by, updated_by
    ) values (
      btrim(p_profile->>'name'), nullif(p_profile->>'description', ''),
      v_status, v_is_default, coalesce(p_profile->'default_spec', '{}'::jsonb),
      auth.uid(), auth.uid()
    ) returning * into v_profile;
  else
    update public.production_print_profiles set
      name = btrim(p_profile->>'name'),
      description = nullif(p_profile->>'description', ''),
      status = v_status,
      is_default = v_is_default,
      default_spec = coalesce(p_profile->'default_spec', '{}'::jsonb),
      updated_by = auth.uid()
    where id = v_profile_id
    returning * into v_profile;
    if not found then
      raise exception 'Padrão gráfico não encontrado.' using errcode = 'P0002';
    end if;
    delete from public.production_print_profile_ranges where profile_id = v_profile_id;
  end if;

  for v_range in select value from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb)) loop
    insert into public.production_print_profile_ranges (
      profile_id, min_pages, max_pages, suggested_inner_grammage,
      suggested_binding_type, suggested_spine, suggested_finish,
      additional_spec, created_by, updated_by
    ) values (
      v_profile.id, coalesce((v_range->>'min_pages')::integer, 0),
      nullif(v_range->>'max_pages', '')::integer,
      nullif(v_range->>'suggested_inner_grammage', '')::integer,
      nullif(v_range->>'suggested_binding_type', ''),
      nullif(v_range->>'suggested_spine', ''),
      nullif(v_range->>'suggested_finish', ''),
      coalesce(v_range->'additional_spec', '{}'::jsonb), auth.uid(), auth.uid()
    );
  end loop;
  return v_profile;
end;
$$;

create or replace function public.save_production_book_config(p_config jsonb)
returns public.production_books
language plpgsql
security definer
set search_path = public
as $$
declare
  v_book public.production_books;
  v_book_id uuid := nullif(p_config->>'id', '')::uuid;
  v_inventory_id uuid := nullif(p_config->>'inventory_item_id', '')::uuid;
  v_profile_id uuid := nullif(p_config->>'print_profile_id', '')::uuid;
  v_custom boolean := coalesce((p_config->>'has_custom_spec')::boolean, false);
  v_spec jsonb := coalesce(p_config->'specification', '{}'::jsonb);
begin
  if not public.is_direction() then
    raise exception 'Operação restrita à Direção.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.inventory_items
    where id = v_inventory_id and item_type = 'book'
  ) then
    raise exception 'Livro do estoque inválido.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.production_print_profiles
    where id = v_profile_id and status = 'ACTIVE'
  ) then
    raise exception 'Selecione um padrão gráfico ativo.' using errcode = '22023';
  end if;
  if coalesce((p_config->>'page_count')::integer, 0) <= 0 then
    raise exception 'A quantidade de páginas deve ser maior que zero.' using errcode = '22023';
  end if;

  if v_book_id is null then
    insert into public.production_books (
      inventory_item_id, page_count, print_profile_id, has_custom_spec,
      status, created_by, updated_by
    ) values (
      v_inventory_id, (p_config->>'page_count')::integer, v_profile_id,
      v_custom, 'ACTIVE', auth.uid(), auth.uid()
    ) returning * into v_book;
  else
    update public.production_books set
      page_count = (p_config->>'page_count')::integer,
      print_profile_id = v_profile_id,
      has_custom_spec = v_custom,
      status = 'ACTIVE',
      updated_by = auth.uid()
    where id = v_book_id and inventory_item_id = v_inventory_id
    returning * into v_book;
    if not found then
      raise exception 'Configuração do livro não encontrada.' using errcode = 'P0002';
    end if;
  end if;

  if v_custom then
    insert into public.production_book_print_specs (
      book_id, cover_paper, cover_grammage, cover_print, cover_finish,
      cover_lamination, cover_notes, inner_paper, inner_grammage,
      inner_print, inner_colors, inner_sides, inner_finish, binding_type,
      spine, orientation, binding_finish, bleed, technical_notes,
      printer_instructions, created_by, updated_by
    ) values (
      v_book.id, nullif(v_spec->>'cover_paper', ''), nullif(v_spec->>'cover_grammage', '')::integer,
      nullif(v_spec->>'cover_print', ''), nullif(v_spec->>'cover_finish', ''),
      nullif(v_spec->>'cover_lamination', ''), nullif(v_spec->>'cover_notes', ''),
      nullif(v_spec->>'inner_paper', ''), nullif(v_spec->>'inner_grammage', '')::integer,
      nullif(v_spec->>'inner_print', ''), nullif(v_spec->>'inner_colors', ''),
      nullif(v_spec->>'inner_sides', ''), nullif(v_spec->>'inner_finish', ''),
      nullif(v_spec->>'binding_type', ''), nullif(v_spec->>'spine', ''),
      nullif(v_spec->>'orientation', ''), nullif(v_spec->>'binding_finish', ''),
      nullif(v_spec->>'bleed', ''), nullif(v_spec->>'technical_notes', ''),
      nullif(v_spec->>'printer_instructions', ''), auth.uid(), auth.uid()
    )
    on conflict (book_id) do update set
      cover_paper = excluded.cover_paper,
      cover_grammage = excluded.cover_grammage,
      cover_print = excluded.cover_print,
      cover_finish = excluded.cover_finish,
      cover_lamination = excluded.cover_lamination,
      cover_notes = excluded.cover_notes,
      inner_paper = excluded.inner_paper,
      inner_grammage = excluded.inner_grammage,
      inner_print = excluded.inner_print,
      inner_colors = excluded.inner_colors,
      inner_sides = excluded.inner_sides,
      inner_finish = excluded.inner_finish,
      binding_type = excluded.binding_type,
      spine = excluded.spine,
      orientation = excluded.orientation,
      binding_finish = excluded.binding_finish,
      bleed = excluded.bleed,
      technical_notes = excluded.technical_notes,
      printer_instructions = excluded.printer_instructions,
      updated_by = auth.uid();
  end if;
  return v_book;
end;
$$;

create or replace function public.remove_production_book_config(p_book_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_used boolean;
begin
  if not public.is_direction() then
    raise exception 'Operação restrita à Direção.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.production_books where id = p_book_id) then
    raise exception 'Configuração do livro não encontrada.' using errcode = 'P0002';
  end if;
  select
    exists(select 1 from public.production_book_progressions where current_book_id = p_book_id or next_book_id = p_book_id)
    or exists(select 1 from public.production_book_order_classes where current_book_id = p_book_id or next_book_id = p_book_id)
    or exists(select 1 from public.production_book_order_students where current_book_id = p_book_id or next_book_id = p_book_id)
    or exists(select 1 from public.production_book_order_items where book_id = p_book_id)
    or exists(select 1 from public.production_book_order_spec_snapshots where book_id = p_book_id)
  into v_used;

  if v_used then
    update public.production_books
    set status = 'INACTIVE', updated_by = auth.uid()
    where id = p_book_id;
    return 'ARCHIVED';
  end if;
  delete from public.production_books where id = p_book_id;
  return 'DELETED';
end;
$$;

create or replace function public.remove_production_print_profile(p_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_direction() then
    raise exception 'Operação restrita à Direção.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.production_print_profiles where id = p_profile_id) then
    raise exception 'Padrão gráfico não encontrado.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.production_books where print_profile_id = p_profile_id) then
    update public.production_print_profiles
    set status = 'INACTIVE', is_default = false, updated_by = auth.uid()
    where id = p_profile_id;
    return 'ARCHIVED';
  end if;
  delete from public.production_print_profiles where id = p_profile_id;
  return 'DELETED';
end;
$$;

revoke execute on function public.save_production_book_config(jsonb) from public, anon;
revoke execute on function public.remove_production_book_config(uuid) from public, anon;
revoke execute on function public.remove_production_print_profile(uuid) from public, anon;
revoke execute on function public.save_production_print_profile(jsonb,jsonb) from public, anon;
grant execute on function public.save_production_book_config(jsonb) to authenticated;
grant execute on function public.remove_production_book_config(uuid) to authenticated;
grant execute on function public.remove_production_print_profile(uuid) to authenticated;
grant execute on function public.save_production_print_profile(jsonb,jsonb) to authenticated;

commit;
