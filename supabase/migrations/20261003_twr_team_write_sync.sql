begin;

-- Staff who already manage TWR may save the pedagogical workspace across sectors.
-- Keep the original owner when updating the singleton, including an UPSERT.
drop policy if exists twr_team_workspace_insert on public.app_records;
create policy twr_team_workspace_insert on public.app_records
for insert to authenticated
with check (
  kind='twr_workspace' and id='twr-workspace' and sector='pedagogico'
  and exists(select 1 from public.profiles where id=auth.uid() and active=true and role<>'teacher')
  and (public.is_direction() or public.has_permission('twr.manage'))
);

drop policy if exists twr_team_workspace_update on public.app_records;
create policy twr_team_workspace_update on public.app_records
for update to authenticated
using (
  kind='twr_workspace' and id='twr-workspace'
  and exists(select 1 from public.profiles where id=auth.uid() and active=true and role<>'teacher')
  and (public.is_direction() or public.has_permission('twr.manage'))
)
with check (
  kind='twr_workspace' and id='twr-workspace' and sector='pedagogico'
  and exists(select 1 from public.profiles where id=auth.uid() and active=true and role<>'teacher')
  and (public.is_direction() or public.has_permission('twr.manage'))
);

-- Legacy teacher permissions must not allow an own-only projection to overwrite the team.
drop policy if exists twr_teacher_readonly_insert on public.app_records;
create policy twr_teacher_readonly_insert on public.app_records as restrictive
for insert to authenticated
with check (kind<>'twr_workspace' or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher'));
drop policy if exists twr_teacher_readonly_update on public.app_records;
create policy twr_teacher_readonly_update on public.app_records as restrictive
for update to authenticated
using (kind<>'twr_workspace' or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher'))
with check (kind<>'twr_workspace' or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher'));
drop policy if exists twr_teacher_readonly_delete on public.app_records;
create policy twr_teacher_readonly_delete on public.app_records as restrictive
for delete to authenticated
using (kind<>'twr_workspace' or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher'));

commit;
