-- Purple Gestão — ROLLBACK da Produção de Livros V2.
--
-- ATENÇÃO:
-- NÃO executar depois que houver dados reais dependentes da V2 sem auditoria.
-- Este rollback remove vínculos livro/padrão, marcações de exceção, status de
-- arquivamento e a indicação de padrão principal. Pedidos e snapshots não são
-- apagados, mas configurações criadas exclusivamente pela V2 podem perder sua
-- associação ao padrão gráfico.

begin;

drop function if exists public.save_production_book_config(jsonb);
drop function if exists public.remove_production_book_config(uuid);
drop function if exists public.remove_production_print_profile(uuid);

-- Restaura a implementação V1 da RPC existente.
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
    if not found then
      raise exception 'Padrão gráfico não encontrado.' using errcode = 'P0002';
    end if;
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

revoke execute on function public.save_production_print_profile(jsonb,jsonb) from public, anon;
grant execute on function public.save_production_print_profile(jsonb,jsonb) to authenticated;

drop index if exists public.production_books_profile_idx;
drop index if exists public.production_print_profiles_one_default_idx;

alter table public.production_books
  drop constraint if exists production_books_status_check,
  drop column if exists print_profile_id,
  drop column if exists has_custom_spec,
  drop column if exists status;

alter table public.production_print_profiles
  drop column if exists is_default;

commit;
