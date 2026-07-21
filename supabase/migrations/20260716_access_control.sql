-- Purple Gestão — controle de acesso granular, não destrutivo.

alter table public.profiles
  add column if not exists access_scope text not null default 'own_sector'
    check (access_scope in ('own_sector','all_sectors')),
  add column if not exists permissions jsonb not null default '{}'::jsonb;

create table if not exists public.permission_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  affected_user_id uuid not null references public.profiles(id),
  old_role text,
  new_role text,
  old_sector text,
  new_sector text,
  old_scope text,
  new_scope text,
  old_permissions jsonb not null default '{}'::jsonb,
  new_permissions jsonb not null default '{}'::jsonb,
  added_permissions text[] not null default '{}',
  removed_permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.permission_audit enable row level security;

create or replace function public.default_permissions(p_role text, p_sector text)
returns jsonb language plpgsql immutable as $$
declare p jsonb;
begin
  if p_role = 'direction' then
    return '{"panel.view":true,"reports.view":true,"reports.create":true,"reports.edit":true,"reports.delete":true,"reports.approve":true,"reports.request_adjustment":true,"reports.export":true,"indicators.view":true,"tasks.view":true,"tasks.create":true,"tasks.edit":true,"tasks.delete":true,"pulse.view":true,"pulse.answer":true,"pulse.consolidated":true,"mural.view":true,"mural.create":true,"mural.edit":true,"mural.delete":true,"meetings.view":true,"meetings.edit":true,"cases.view":true,"actions.view":true,"actions.create":true,"actions.edit":true,"actions.delete":true,"users.view":true,"users.edit":true,"audit.view":true,"audit.export":true,"settings.view":true,"settings.edit":true,"financial.receipts.view":true,"financial.payments.view":true,"financial.receivables.view":true,"financial.payables.view":true,"financial.bank_accounts.view":true,"financial.balances.view":true,"financial.transactions.create":true,"financial.transactions.edit":true,"financial.transactions.delete":true,"financial.export":true}'::jsonb;
  elsif p_role = 'leader' then
    p := '{"panel.view":true,"reports.view":true,"reports.create":true,"reports.edit":true,"indicators.view":true,"tasks.view":true,"tasks.create":true,"tasks.edit":true,"tasks.delete":true,"pulse.view":true,"pulse.answer":true,"mural.view":true,"meetings.view":true,"cases.view":true,"actions.view":true,"actions.create":true,"actions.edit":true,"settings.view":false}'::jsonb;
    if p_sector = 'financeiro' then
      p := p || '{"reports.export":true,"financial.receipts.view":true,"financial.payments.view":true,"financial.receivables.view":true,"financial.payables.view":true,"financial.bank_accounts.view":true,"financial.balances.view":true,"financial.transactions.create":true,"financial.transactions.edit":true,"financial.transactions.delete":true,"financial.export":true}'::jsonb;
    end if;
    return p;
  end if;
  return '{"panel.view":true,"reports.view":true,"indicators.view":true,"tasks.view":true,"mural.view":true,"meetings.view":true}'::jsonb;
end;
$$;

update public.profiles
set access_scope = case when role = 'direction' then 'all_sectors' else 'own_sector' end,
    permissions = public.default_permissions(role, sector)
where permissions = '{}'::jsonb;

create or replace function public.has_permission(permission_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
      and coalesce((permissions ->> permission_key)::boolean, false)
  );
$$;

create or replace function public.has_sector_access(record_sector text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and (
      (role = 'direction' and access_scope = 'all_sectors')
      or (access_scope = 'all_sectors' and record_sector in ('all','retencao','pedagogico','financeiro'))
      or record_sector = sector
      or record_sector = 'all'
    )
  );
$$;

create or replace function public.audit_profile_permissions()
returns trigger language plpgsql security definer set search_path = public as $$
declare old_keys text[]; new_keys text[];
begin
  if old.role is distinct from new.role or old.sector is distinct from new.sector
     or old.access_scope is distinct from new.access_scope or old.permissions is distinct from new.permissions then
    select coalesce(array_agg(key order by key),'{}') into old_keys from jsonb_each_text(old.permissions) where value = 'true';
    select coalesce(array_agg(key order by key),'{}') into new_keys from jsonb_each_text(new.permissions) where value = 'true';
    insert into public.permission_audit(actor_id,affected_user_id,old_role,new_role,old_sector,new_sector,old_scope,new_scope,old_permissions,new_permissions,added_permissions,removed_permissions)
    values(auth.uid(),new.id,old.role,new.role,old.sector,new.sector,old.access_scope,new.access_scope,old.permissions,new.permissions,array(select unnest(new_keys) except select unnest(old_keys)),array(select unnest(old_keys) except select unnest(new_keys)));
  end if;
  return new;
end;
$$;

create or replace trigger profiles_permission_audit after update on public.profiles
for each row execute function public.audit_profile_permissions();

create policy permission_audit_read on public.permission_audit for select using (public.is_direction() and public.has_permission('audit.view'));

alter policy records_read on public.app_records using (
  public.has_sector_access(sector) and (
    (kind = 'report' and public.has_permission('reports.view')) or
    (kind = 'action' and public.has_permission('actions.view')) or
    (kind = 'case' and public.has_permission('cases.view')) or
    (kind = 'meeting' and public.has_permission('meetings.view')) or
    (kind = 'audit') or
    (kind = 'settings' and public.has_permission('settings.view')) or
    (kind = 'notification_reads' and owner_id = auth.uid())
  )
);

alter policy records_insert on public.app_records with check (
  owner_id = auth.uid() and public.has_sector_access(sector) and (
    (kind = 'report' and public.has_permission('reports.create')) or
    (kind = 'action' and public.has_permission('actions.create')) or
    (kind = 'case' and public.has_permission('cases.view')) or
    (kind = 'meeting' and public.has_permission('meetings.edit')) or
    (kind = 'audit' and public.has_permission('audit.view')) or
    (kind = 'notification_reads')
  )
);

alter policy records_update on public.app_records using (
  public.has_sector_access(sector) and (
    (kind = 'report' and public.has_permission('reports.edit')) or
    (kind = 'action' and public.has_permission('actions.edit')) or
    (kind = 'case' and public.has_permission('cases.view')) or
    (kind = 'meeting' and public.has_permission('meetings.edit')) or
    (kind = 'settings' and public.has_permission('settings.edit')) or
    (kind = 'notification_reads' and owner_id = auth.uid())
  )
) with check (public.has_sector_access(sector));

alter policy records_delete on public.app_records using (
  public.has_sector_access(sector) and (
    (kind = 'report' and public.has_permission('reports.delete')) or
    (kind = 'action' and public.has_permission('actions.delete')) or
    (kind = 'meeting' and public.has_permission('meetings.edit'))
  )
);

alter policy tasks_select on public.tasks using (public.has_permission('tasks.view') and (user_id = auth.uid() or (public.is_direction() and public.has_permission('users.view'))));
alter policy tasks_insert on public.tasks with check (user_id = auth.uid() and public.has_permission('tasks.create'));
alter policy tasks_update on public.tasks using (user_id = auth.uid() and public.has_permission('tasks.edit')) with check (user_id = auth.uid());
alter policy tasks_delete on public.tasks using (user_id = auth.uid() and public.has_permission('tasks.delete'));

alter policy pulse_select on public.pulse_entries using ((user_id = auth.uid() and public.has_permission('pulse.view')) or public.has_permission('pulse.consolidated'));
alter policy pulse_insert on public.pulse_entries with check (user_id = auth.uid() and public.has_permission('pulse.answer'));

alter policy announcements_select on public.announcements using (
  public.has_permission('mural.view') and (valid_until is null or valid_until >= current_date)
  and public.has_sector_access(sector)
  and (audience = 'all' or (audience = 'leaders' and not public.is_viewer()) or (audience = 'direction' and public.is_direction()))
);
alter policy announcements_insert on public.announcements with check (created_by = auth.uid() and public.has_permission('mural.create'));
alter policy announcements_update on public.announcements using (public.has_permission('mural.edit')) with check (public.has_permission('mural.edit'));
alter policy announcements_delete on public.announcements using (public.has_permission('mural.delete'));

alter policy profiles_direction_update on public.profiles using (public.is_direction() and public.has_permission('users.edit')) with check (public.is_direction() and public.has_permission('users.edit'));

grant select on public.permission_audit to authenticated;
revoke insert, update, delete on public.permission_audit from authenticated;
revoke all on public.permission_audit from anon;
grant update (access_scope, permissions) on public.profiles to authenticated;
