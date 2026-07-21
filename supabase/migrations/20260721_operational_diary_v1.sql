-- Purple Gestão — Diário Operacional v1
-- Estrutura única reutilizável por setor, unidade e data, com integração ao Purple Intelligence.

create table if not exists public.operational_diary_entries (
  id uuid primary key default gen_random_uuid(),
  sector text not null check (sector in ('financeiro','comercial','pedagogico','retencao','direcao')),
  unit_name text not null,
  entry_date date not null,
  responsible_user_id uuid references public.profiles(id),
  responsible_name text,
  metrics jsonb not null default '{}'::jsonb,
  observation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sector, unit_name, entry_date)
);

create index if not exists operational_diary_entries_sector_date_idx
  on public.operational_diary_entries(sector, entry_date desc);

create index if not exists operational_diary_entries_unit_date_idx
  on public.operational_diary_entries(unit_name, entry_date desc);

drop trigger if exists operational_diary_entries_touch_updated_at on public.operational_diary_entries;
create trigger operational_diary_entries_touch_updated_at
before update on public.operational_diary_entries
for each row execute function public.touch_updated_at();

create or replace function public.hydrate_operational_diary_responsible()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles%rowtype;
begin
  if new.unit_name is null or btrim(new.unit_name) = '' then
    new.unit_name := 'Purple Idiomas';
  end if;

  if auth.uid() is not null then
    new.responsible_user_id := auth.uid();
    select *
    into profile_row
    from public.profiles
    where id = auth.uid()
    limit 1;

    if found then
      new.responsible_name := coalesce(profile_row.name, new.responsible_name);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists operational_diary_entries_hydrate_responsible on public.operational_diary_entries;
create trigger operational_diary_entries_hydrate_responsible
before insert or update on public.operational_diary_entries
for each row execute function public.hydrate_operational_diary_responsible();

alter table public.operational_diary_entries enable row level security;

drop policy if exists operational_diary_entries_read on public.operational_diary_entries;
create policy operational_diary_entries_read on public.operational_diary_entries
for select using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.active, true) = true
      and (
        coalesce(p.role, '') = 'direction'
        or coalesce(p.access_scope, 'own_sector') = 'all_sectors'
        or coalesce(p.sector, '') = operational_diary_entries.sector
      )
      and (
        coalesce(p.role, '') in ('direction','leader','viewer')
        or coalesce((p.permissions ->> 'reports.view')::boolean, false) = true
      )
  )
);

drop policy if exists operational_diary_entries_insert on public.operational_diary_entries;
create policy operational_diary_entries_insert on public.operational_diary_entries
for insert with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.active, true) = true
      and (
        coalesce(p.role, '') = 'direction'
        or coalesce(p.access_scope, 'own_sector') = 'all_sectors'
        or coalesce(p.sector, '') = operational_diary_entries.sector
      )
      and (
        coalesce(p.role, '') in ('direction','leader')
        or coalesce((p.permissions ->> 'reports.create')::boolean, false) = true
      )
  )
);

drop policy if exists operational_diary_entries_update on public.operational_diary_entries;
create policy operational_diary_entries_update on public.operational_diary_entries
for update using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.active, true) = true
      and (
        coalesce(p.role, '') = 'direction'
        or coalesce(p.access_scope, 'own_sector') = 'all_sectors'
        or coalesce(p.sector, '') = operational_diary_entries.sector
      )
      and (
        coalesce(p.role, '') in ('direction','leader')
        or coalesce((p.permissions ->> 'reports.edit')::boolean, false) = true
      )
  )
) with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.active, true) = true
      and (
        coalesce(p.role, '') = 'direction'
        or coalesce(p.access_scope, 'own_sector') = 'all_sectors'
        or coalesce(p.sector, '') = operational_diary_entries.sector
      )
      and (
        coalesce(p.role, '') in ('direction','leader')
        or coalesce((p.permissions ->> 'reports.edit')::boolean, false) = true
      )
  )
);

grant select, insert, update on public.operational_diary_entries to authenticated;
revoke delete on public.operational_diary_entries from authenticated;
revoke all on public.operational_diary_entries from anon;

alter table public.intelligence_snapshots
  drop constraint if exists intelligence_snapshots_sector_check;

alter table public.intelligence_snapshots
  add constraint intelligence_snapshots_sector_check
  check (sector in ('retencao','pedagogico','financeiro','comercial','direcao')) not valid;

alter table public.intelligence_snapshots
  validate constraint intelligence_snapshots_sector_check;

drop policy if exists intelligence_snapshots_read on public.intelligence_snapshots;
create policy intelligence_snapshots_read on public.intelligence_snapshots
for select using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.active, true) = true
      and (
        coalesce(p.role, '') = 'direction'
        or coalesce(p.access_scope, 'own_sector') = 'all_sectors'
        or coalesce(p.sector, '') = intelligence_snapshots.sector
      )
      and (
        coalesce(p.role, '') in ('direction','leader','viewer')
        or coalesce((p.permissions ->> 'indicators.view')::boolean, false) = true
      )
  )
);

create or replace function public.build_operational_diary_derived_metrics(
  p_sector text,
  p_metrics jsonb
)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '{}'::jsonb;
  get_numeric numeric;
begin
  if p_sector = 'financeiro' then
    result := result || jsonb_build_object(
      'saldoCalculado',
      round(
        public.intelligence_metric_number(p_metrics, 'saldoInicial')
        + public.intelligence_metric_number(p_metrics, 'recebido')
        - public.intelligence_metric_number(p_metrics, 'pago'),
        2
      )
    );
    result := result || jsonb_build_object(
      'divergenciaFinanceira',
      round(
        public.intelligence_metric_number(p_metrics, 'saldoFinal')
        - (
          public.intelligence_metric_number(p_metrics, 'saldoInicial')
          + public.intelligence_metric_number(p_metrics, 'recebido')
          - public.intelligence_metric_number(p_metrics, 'pago')
        ),
        2
      )
    );
  elsif p_sector = 'comercial' then
    result := result || jsonb_build_object(
      'taxaContato',
      round(
        public.intelligence_metric_number(p_metrics, 'contatosRealizados')
        / greatest(public.intelligence_metric_number(p_metrics, 'leadsRecebidos'), 1)
        * 100,
        2
      ),
      'taxaConversao',
      round(
        public.intelligence_metric_number(p_metrics, 'matriculas')
        / greatest(public.intelligence_metric_number(p_metrics, 'leadsRecebidos'), 1)
        * 100,
        2
      )
    );
  elsif p_sector = 'pedagogico' then
    result := result || jsonb_build_object(
      'taxaFaltasAlunos',
      round(
        public.intelligence_metric_number(p_metrics, 'faltasAlunos')
        / greatest(public.intelligence_metric_number(p_metrics, 'aulasRealizadas'), 1)
        * 100,
        2
      )
    );
  elsif p_sector = 'retencao' then
    result := result || jsonb_build_object(
      'taxaRecuperacao',
      round(
        public.intelligence_metric_number(p_metrics, 'recuperacoes')
        / greatest(public.intelligence_metric_number(p_metrics, 'alunosRisco'), 1)
        * 100,
        2
      )
    );
  elsif p_sector = 'direcao' then
    get_numeric := public.intelligence_metric_number(p_metrics, 'acoesConcluidas')
      + public.intelligence_metric_number(p_metrics, 'pendenciasCriticas');
    result := result || jsonb_build_object(
      'taxaConclusao',
      round(
        public.intelligence_metric_number(p_metrics, 'acoesConcluidas')
        / greatest(get_numeric, 1)
        * 100,
        2
      )
    );
  end if;

  return result;
end;
$$;

create or replace function public.build_operational_diary_goal_status(
  p_sector text,
  p_metrics jsonb,
  p_derived jsonb
)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '{}'::jsonb;
  v_current numeric;
  v_target numeric;
  v_status text;
begin
  if p_sector = 'financeiro' then
    v_current := abs(public.intelligence_metric_number(p_derived, 'divergenciaFinanceira'));
    v_target := 0;
    v_status := case when v_current <= v_target then 'good' else 'critical' end;
    result := result || jsonb_build_object(
      'divergenciaFinanceira',
      jsonb_build_object('label','Divergência financeira','current',v_current,'target',v_target,'direction','at_most','unit','money','status',v_status)
    );

    v_current := public.intelligence_metric_number(p_metrics, 'saldoFinal');
    v_target := 0;
    v_status := case when v_current >= v_target then 'good' else 'critical' end;
    result := result || jsonb_build_object(
      'saldoFinal',
      jsonb_build_object('label','Saldo final','current',v_current,'target',v_target,'direction','at_least','unit','money','status',v_status)
    );
  elsif p_sector = 'comercial' then
    v_current := public.intelligence_metric_number(p_derived, 'taxaConversao');
    v_target := 10;
    v_status := case when v_current >= v_target then 'good' when v_current >= v_target * 0.8 then 'warning' else 'critical' end;
    result := result || jsonb_build_object(
      'taxaConversao',
      jsonb_build_object('label','Taxa de conversão','current',v_current,'target',v_target,'direction','at_least','unit','percent','status',v_status)
    );
  elsif p_sector = 'pedagogico' then
    v_current := public.intelligence_metric_number(p_metrics, 'faltasProfessores');
    v_target := 1;
    v_status := case when v_current <= v_target then 'good' when v_current <= v_target + 1 then 'warning' else 'critical' end;
    result := result || jsonb_build_object(
      'faltasProfessores',
      jsonb_build_object('label','Faltas de professores','current',v_current,'target',v_target,'direction','at_most','unit','number','status',v_status)
    );
  elsif p_sector = 'retencao' then
    v_current := public.intelligence_metric_number(p_metrics, 'cancelamentos');
    v_target := 2;
    v_status := case when v_current <= v_target then 'good' when v_current <= v_target + 1 then 'warning' else 'critical' end;
    result := result || jsonb_build_object(
      'cancelamentos',
      jsonb_build_object('label','Cancelamentos','current',v_current,'target',v_target,'direction','at_most','unit','number','status',v_status)
    );
  elsif p_sector = 'direcao' then
    v_current := public.intelligence_metric_number(p_metrics, 'pendenciasCriticas');
    v_target := 3;
    v_status := case when v_current <= v_target then 'good' when v_current <= v_target + 1 then 'warning' else 'critical' end;
    result := result || jsonb_build_object(
      'pendenciasCriticas',
      jsonb_build_object('label','Pendências críticas','current',v_current,'target',v_target,'direction','at_most','unit','number','status',v_status)
    );
  end if;

  return result;
end;
$$;

create or replace function public.rebuild_intelligence_snapshot_from_operational_diary(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_row public.operational_diary_entries%rowtype;
  derived_payload jsonb;
begin
  select *
  into entry_row
  from public.operational_diary_entries
  where id = p_entry_id
  limit 1;

  if not found then
    delete from public.intelligence_snapshots
    where source_kind = 'operational_diary'
      and source_id = p_entry_id::text;
    return;
  end if;

  derived_payload := public.build_operational_diary_derived_metrics(
    entry_row.sector,
    coalesce(entry_row.metrics, '{}'::jsonb)
  );

  insert into public.intelligence_snapshots (
    source_kind,
    source_id,
    sector,
    frequency,
    status,
    period_start,
    period_end,
    presentation_date,
    source_owner_id,
    source_owner_name,
    metrics,
    derived_metrics,
    goal_status,
    quality,
    context,
    source_updated_at,
    calculation_version
  ) values (
    'operational_diary',
    entry_row.id::text,
    entry_row.sector,
    'diario',
    'completed',
    entry_row.entry_date,
    entry_row.entry_date,
    entry_row.entry_date,
    entry_row.responsible_user_id,
    entry_row.responsible_name,
    coalesce(entry_row.metrics, '{}'::jsonb),
    derived_payload,
    public.build_operational_diary_goal_status(
      entry_row.sector,
      coalesce(entry_row.metrics, '{}'::jsonb),
      derived_payload
    ),
    jsonb_build_object(
      'source_state', 'daily_operational',
      'unit_name', entry_row.unit_name,
      'calculation_version', 'purple-intelligence-v1'
    ),
    jsonb_build_object(
      'period_label', 'Diário • ' || to_char(entry_row.entry_date, 'DD/MM/YYYY'),
      'owner_name', coalesce(entry_row.responsible_name, ''),
      'summary', coalesce(entry_row.observation, ''),
      'decisions', '',
      'reasons', '[]'::jsonb,
      'unit_name', entry_row.unit_name
    ),
    coalesce(entry_row.updated_at, entry_row.created_at, now()),
    'purple-intelligence-v1'
  )
  on conflict (source_kind, source_id) do update
  set sector = excluded.sector,
      frequency = excluded.frequency,
      status = excluded.status,
      period_start = excluded.period_start,
      period_end = excluded.period_end,
      presentation_date = excluded.presentation_date,
      source_owner_id = excluded.source_owner_id,
      source_owner_name = excluded.source_owner_name,
      metrics = excluded.metrics,
      derived_metrics = excluded.derived_metrics,
      goal_status = excluded.goal_status,
      quality = excluded.quality,
      context = excluded.context,
      source_updated_at = excluded.source_updated_at,
      calculation_version = excluded.calculation_version,
      updated_at = now();
end;
$$;

create or replace function public.rebuild_all_operational_diary_intelligence_snapshots()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  diary_row record;
begin
  for diary_row in
    select id
    from public.operational_diary_entries
  loop
    perform public.rebuild_intelligence_snapshot_from_operational_diary(diary_row.id);
  end loop;
end;
$$;

create or replace function public.sync_operational_diary_intelligence_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.intelligence_snapshots
    where source_kind = 'operational_diary'
      and source_id = old.id::text;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and new.metrics is not distinct from old.metrics
     and new.observation is not distinct from old.observation
     and new.entry_date is not distinct from old.entry_date
     and new.unit_name is not distinct from old.unit_name
     and new.sector is not distinct from old.sector then
    return new;
  end if;

  perform public.rebuild_intelligence_snapshot_from_operational_diary(new.id);
  return new;
end;
$$;

drop trigger if exists operational_diary_entries_sync_intelligence on public.operational_diary_entries;
create trigger operational_diary_entries_sync_intelligence
after insert or update or delete on public.operational_diary_entries
for each row execute function public.sync_operational_diary_intelligence_snapshots();

select public.rebuild_all_operational_diary_intelligence_snapshots();
