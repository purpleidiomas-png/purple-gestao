-- Team TWR permission must work for staff outside the pedagogical sector.
-- Keep the existing sector policy for every other record and all writes.
begin;

drop policy if exists twr_team_cross_sector_read on public.app_records;
create policy twr_team_cross_sector_read
on public.app_records
for select
to authenticated
using (
  kind in ('teacher', 'twr_workspace')
  and (
    public.has_permission('teachers.view')
    or public.has_permission('twr.manage')
    or public.has_permission('twr.approve')
    or public.has_permission('class_opening.manage')
    or public.has_permission('lesson_plans.review')
    or public.has_permission('lesson_plans.publish')
    or public.has_permission('lesson_plans.cycles.manage')
  )
);

commit;
