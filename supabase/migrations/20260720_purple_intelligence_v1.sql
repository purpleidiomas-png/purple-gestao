-- Purple Gestão — Purple Intelligence v1
-- Consolida relatórios em snapshots próprios para dashboards, indicadores, gráficos e metas.

create table if not exists public.intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('report','operational_diary','action_plan','manual')),
  source_id text not null,
  sector text not null check (sector in ('retencao','pedagogico','financeiro')),
  frequency text not null check (frequency in ('diario','semanal','quinzenal','mensal')),
  status text not null,
  period_start date,
  period_end date,
  presentation_date date,
  source_owner_id uuid references public.profiles(id),
  source_owner_name text,
  metrics jsonb not null default '{}'::jsonb,
  derived_metrics jsonb not null default '{}'::jsonb,
  goal_status jsonb not null default '{}'::jsonb,
  quality jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  calculation_version text not null default 'purple-intelligence-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_kind, source_id)
);

create index if not exists intelligence_snapshots_sector_frequency_idx
  on public.intelligence_snapshots(sector, frequency, period_end desc);

create index if not exists intelligence_snapshots_status_idx
  on public.intelligence_snapshots(status);

drop trigger if exists intelligence_snapshots_touch_updated_at on public.intelligence_snapshots;
create trigger intelligence_snapshots_touch_updated_at
before update on public.intelligence_snapshots
for each row execute function public.touch_updated_at();

alter table public.intelligence_snapshots enable row level security;

drop policy if exists intelligence_snapshots_read on public.intelligence_snapshots;
create policy intelligence_snapshots_read on public.intelligence_snapshots
for select using (
  public.has_permission('indicators.view')
  and public.has_sector_access(sector)
);

grant select on public.intelligence_snapshots to authenticated;
revoke insert, update, delete on public.intelligence_snapshots from authenticated;
revoke all on public.intelligence_snapshots from anon;

create or replace function public.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if p_value is null or btrim(p_value) = '' then
    return null;
  end if;
  return p_value::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.intelligence_metric_number(p_metrics jsonb, p_key text)
returns numeric
language sql
immutable
as $$
  select coalesce(nullif(p_metrics ->> p_key, '')::numeric, 0);
$$;

create or replace function public.build_intelligence_derived_metrics(p_sector text, p_frequency text, p_metrics jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '{}'::jsonb;
  v_previsto numeric := public.intelligence_metric_number(p_metrics, 'receitaPrevista');
  v_realizado numeric := public.intelligence_metric_number(p_metrics, 'receitaRealizada');
  v_recebida numeric := public.intelligence_metric_number(p_metrics, 'receitaRecebida');
begin
  if p_sector = 'retencao' then
    result := result || jsonb_build_object(
      'rematriculacaoTaxa',
      round(
        public.intelligence_metric_number(p_metrics, 'rematriculasConcluidas')
        / greatest(public.intelligence_metric_number(p_metrics, 'rematriculasPrevistas'), 1)
        * 100, 2
      )
    );
    if p_frequency = 'quinzenal' then
      result := result || jsonb_build_object(
        'recuperacaoTaxa',
        round(
          public.intelligence_metric_number(p_metrics, 'alunosRecuperados')
          / greatest(public.intelligence_metric_number(p_metrics, 'alunosRisco'), 1)
          * 100, 2
        )
      );
    end if;
  elsif p_sector = 'pedagogico' then
    result := result || jsonb_build_object(
      'taxaExecucao',
      round(
        public.intelligence_metric_number(p_metrics, 'aulasRealizadas')
        / greatest(
          public.intelligence_metric_number(p_metrics, 'aulasRealizadas')
          + public.intelligence_metric_number(p_metrics, 'aulasCanceladas'),
          1
        )
        * 100, 2
      )
    );
  elsif p_sector = 'financeiro' then
    if p_frequency = 'semanal' then
      result := result || jsonb_build_object(
        'saldoCalculado',
        round(
          public.intelligence_metric_number(p_metrics, 'saldoInicial')
          + public.intelligence_metric_number(p_metrics, 'entradas')
          - public.intelligence_metric_number(p_metrics, 'saidas'),
          2
        )
      );
    end if;
    if p_frequency = 'quinzenal' then
      result := result || jsonb_build_object(
        'diferencaReceita', round(v_realizado - v_previsto, 2),
        'eficienciaRecebimento', round(v_realizado / greatest(v_previsto, 1) * 100, 2)
      );
    end if;
    if p_frequency = 'mensal' then
      result := result || jsonb_build_object(
        'margemSimples',
        round(
          public.intelligence_metric_number(p_metrics, 'resultadoLiquido')
          / greatest(v_recebida, 1)
          * 100, 2
        )
      );
    end if;
  end if;
  return result;
end;
$$;

create or replace function public.build_intelligence_goal_status(
  p_sector text,
  p_frequency text,
  p_metrics jsonb,
  p_derived jsonb,
  p_settings jsonb
)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '{}'::jsonb;
  v_rem_target numeric := coalesce(nullif(p_settings ->> 'rematriculationTarget', '')::numeric, 85);
  v_risk_target numeric := coalesce(nullif(p_settings ->> 'retentionRisk', '')::numeric, 25);
  v_critical_target numeric := coalesce(nullif(p_settings ->> 'criticalGroups', '')::numeric, 5);
  v_delinquency_target numeric := coalesce(nullif(p_settings ->> 'delinquencyAlert', '')::numeric, 6000);
  v_current numeric;
  v_target numeric;
  v_status text;
begin
  if p_sector = 'retencao' then
    v_current := public.intelligence_metric_number(p_derived, 'rematriculacaoTaxa');
    v_target := v_rem_target;
    v_status := case
      when v_current >= v_target then 'good'
      when v_current >= v_target * 0.9 then 'warning'
      else 'critical'
    end;
    result := result || jsonb_build_object(
      'rematriculacaoTaxa',
      jsonb_build_object('label','Taxa de rematrícula','current',v_current,'target',v_target,'direction','at_least','unit','percent','status',v_status)
    );

    v_current := public.intelligence_metric_number(p_metrics, 'alunosRisco');
    v_target := v_risk_target;
    v_status := case
      when v_current <= v_target then 'good'
      when v_current <= v_target * 1.1 then 'warning'
      else 'critical'
    end;
    result := result || jsonb_build_object(
      'alunosRisco',
      jsonb_build_object('label','Alunos em risco','current',v_current,'target',v_target,'direction','at_most','unit','number','status',v_status)
    );
  elsif p_sector = 'pedagogico' then
    v_current := public.intelligence_metric_number(p_metrics, 'turmasCriticas');
    v_target := v_critical_target;
    v_status := case
      when v_current <= v_target then 'good'
      when v_current <= v_target * 1.1 then 'warning'
      else 'critical'
    end;
    result := result || jsonb_build_object(
      'turmasCriticas',
      jsonb_build_object('label','Turmas críticas','current',v_current,'target',v_target,'direction','at_most','unit','number','status',v_status)
    );

    v_current := public.intelligence_metric_number(p_derived, 'taxaExecucao');
    v_target := 95;
    v_status := case
      when v_current >= v_target then 'good'
      when v_current >= v_target * 0.9 then 'warning'
      else 'critical'
    end;
    result := result || jsonb_build_object(
      'taxaExecucao',
      jsonb_build_object('label','Taxa de execução','current',v_current,'target',v_target,'direction','at_least','unit','percent','status',v_status)
    );
  elsif p_sector = 'financeiro' then
    v_current := public.intelligence_metric_number(p_metrics, 'inadimplencia');
    v_target := v_delinquency_target;
    v_status := case
      when v_current <= v_target then 'good'
      when v_current <= v_target * 1.1 then 'warning'
      else 'critical'
    end;
    result := result || jsonb_build_object(
      'inadimplencia',
      jsonb_build_object('label','Inadimplência','current',v_current,'target',v_target,'direction','at_most','unit','money','status',v_status)
    );

    v_current := greatest(
      public.intelligence_metric_number(p_metrics, 'receitaRealizada'),
      public.intelligence_metric_number(p_metrics, 'receitaRecebida')
    );
    v_target := greatest(public.intelligence_metric_number(p_metrics, 'receitaPrevista'), 1);
    v_status := case
      when v_current >= v_target then 'good'
      when v_current >= v_target * 0.9 then 'warning'
      else 'critical'
    end;
    result := result || jsonb_build_object(
      'receitaRealizada',
      jsonb_build_object('label','Receita realizada','current',v_current,'target',v_target,'direction','at_least','unit','money','status',v_status)
    );
  end if;

  return result;
end;
$$;

create or replace function public.rebuild_intelligence_snapshot_from_report(p_report_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.app_records%rowtype;
  settings_payload jsonb := '{}'::jsonb;
  payload jsonb;
  metrics_payload jsonb;
  derived_payload jsonb;
begin
  select *
  into report_row
  from public.app_records
  where id = p_report_id
    and kind = 'report'
  limit 1;

  if not found then
    delete from public.intelligence_snapshots
    where source_kind = 'report'
      and source_id = p_report_id;
    return;
  end if;

  payload := coalesce(report_row.data, '{}'::jsonb);
  metrics_payload := coalesce(payload -> 'metrics', '{}'::jsonb);

  select coalesce(data, '{}'::jsonb)
  into settings_payload
  from public.app_records
  where kind = 'settings'
  order by updated_at desc
  limit 1;
  settings_payload := coalesce(settings_payload, '{}'::jsonb);

  derived_payload := public.build_intelligence_derived_metrics(
    payload ->> 'sector',
    payload ->> 'frequency',
    metrics_payload
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
    'report',
    report_row.id,
    payload ->> 'sector',
    coalesce(payload ->> 'frequency', 'quinzenal'),
    coalesce(payload ->> 'status', 'draft'),
    nullif(payload ->> 'start', '')::date,
    nullif(payload ->> 'end', '')::date,
    nullif(payload ->> 'presentation', '')::date,
    public.try_uuid(payload ->> 'ownerId'),
    payload ->> 'owner',
    metrics_payload,
    derived_payload,
    public.build_intelligence_goal_status(
      payload ->> 'sector',
      payload ->> 'frequency',
      metrics_payload,
      derived_payload,
      settings_payload
    ),
    jsonb_build_object(
      'source_state',
      case
        when coalesce(payload ->> 'status', 'draft') = 'approved' then 'approved'
        when coalesce(payload ->> 'status', 'draft') in ('sent','review') then 'preliminary'
        when coalesce(payload ->> 'status', 'draft') = 'adjust' then 'adjustment_requested'
        else coalesce(payload ->> 'status', 'draft')
      end,
      'calculation_version', 'purple-intelligence-v1'
    ),
    jsonb_build_object(
      'period_label', coalesce(payload ->> 'period', ''),
      'owner_name', coalesce(payload ->> 'owner', ''),
      'summary', coalesce(payload ->> 'summary', ''),
      'decisions', coalesce(payload ->> 'decisions', ''),
      'reasons', coalesce(payload -> 'reasons', '[]'::jsonb)
    ),
    coalesce(
      nullif(payload ->> 'updatedAt', '')::timestamptz,
      nullif(payload ->> 'approvedAt', '')::timestamptz,
      nullif(payload ->> 'createdAt', '')::timestamptz,
      report_row.updated_at
    ),
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

create or replace function public.rebuild_all_report_intelligence_snapshots()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row record;
begin
  for report_row in
    select id
    from public.app_records
    where kind = 'report'
  loop
    perform public.rebuild_intelligence_snapshot_from_report(report_row.id);
  end loop;
end;
$$;

create or replace function public.sync_intelligence_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.kind = 'report' then
      delete from public.intelligence_snapshots
      where source_kind = 'report'
        and source_id = old.id;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.kind = 'report'
       and new.data is not distinct from old.data
       and new.sector is not distinct from old.sector then
      return new;
    end if;
    if new.kind = 'settings'
       and new.data is not distinct from old.data then
      return new;
    end if;
  end if;

  if new.kind = 'report' then
    perform public.rebuild_intelligence_snapshot_from_report(new.id);
  elsif new.kind = 'settings' then
    perform public.rebuild_all_report_intelligence_snapshots();
  end if;

  return new;
end;
$$;

drop trigger if exists app_records_sync_intelligence_snapshots on public.app_records;
create trigger app_records_sync_intelligence_snapshots
after insert or update or delete on public.app_records
for each row execute function public.sync_intelligence_snapshots();

select public.rebuild_all_report_intelligence_snapshots();
