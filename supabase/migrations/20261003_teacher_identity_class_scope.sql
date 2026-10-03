begin;

-- Repair the verified login-to-teacher mappings without changing class assignments.
do $$
declare
  link record;
begin
  for link in select * from (values
    ('4284a7c0-9c4c-447f-83e6-e58993e0cdc2','teach-1789508765179-2baa1e','ERICA ANDRADE'),
    ('512b0ff5-5854-4694-b678-80d2a6ae3d42','teach-1789672187882-1180ac','ANA LAURA'),
    ('3c75a8fc-eaf3-4349-b154-00a39bf77c98','teach-1789671992939-52c3c6','EMILENE CASSIA'),
    ('57166259-4dc8-4980-80d2-3c3392cef861','teach-1789502126960-c3bba7','MARIA EDUARDA'),
    ('9e103c04-6710-4012-9c85-425dd5fa87ef','teach-1789496699394-cb49b5','PEDRO AMORIM'),
    ('a15a61e3-cc50-40c1-a6f7-0f63c242568c','teach-1789756987476-af7f2f','PÉROLA ROCHA FARIA'),
    ('5aaf77ae-cbb2-42de-ac4b-aae740d1f406','teach-1789671634306-f04e24','DAYANA NASCIMENTO')
  ) as mappings(user_id,teacher_id,teacher_name)
  loop
    if exists(select 1 from public.profiles where id=link.user_id::uuid and role='teacher')
      and exists(select 1 from public.app_records where id=link.teacher_id and kind='teacher' and data->>'name'=link.teacher_name)
    then
      update public.app_records
      set data=data||jsonb_build_object('userId',link.user_id,'user_id',link.user_id)
      where id=link.teacher_id and kind='teacher';
      update public.app_records
      set data=jsonb_set(data,'{userTeacherLinks}',coalesce(data->'userTeacherLinks','{}'::jsonb)||jsonb_build_object(link.user_id,link.teacher_id))
      where kind='settings';
    end if;
  end loop;
end $$;

create or replace function public.current_teacher_identity_ids()
returns text[]
language sql stable security definer
set search_path=public
as $$
  select coalesce(array_agg(distinct identity.id) filter(where identity.id is not null and identity.id<>''),array[]::text[])
  from public.app_records t
  join public.profiles p on p.id=auth.uid() and p.active=true and p.role='teacher'
  cross join lateral unnest(array[t.id,t.data->>'id',t.data->>'supabaseId',t.data->>'legacyId',p.id::text]) identity(id)
  where t.kind='teacher'
    and (t.data->>'userId'=p.id::text or t.data->>'user_id'=p.id::text
      or t.data->>'profileId'=p.id::text or t.data->>'profile_id'=p.id::text);
$$;

create or replace function public.teacher_owns_class(class_data jsonb)
returns boolean
language sql stable security definer
set search_path=public
as $$
  select exists(
    select 1 from unnest(array[class_data->>'teacherId',class_data->>'teacher_id',
      class_data->>'teacherSupabaseId',class_data->>'teacherLegacyId',
      class_data#>>'{data,teacherId}',class_data#>>'{data,teacher_id}']) assignment(id)
    where assignment.id=any(public.current_teacher_identity_ids())
  );
$$;

revoke all on function public.current_teacher_identity_ids() from public;
revoke all on function public.teacher_owns_class(jsonb) from public;
grant execute on function public.current_teacher_identity_ids() to authenticated;
grant execute on function public.teacher_owns_class(jsonb) to authenticated;

-- Restrictive policy also applies when an older permissive policy grants reports access.
drop policy if exists teacher_class_scope on public.app_records;
create policy teacher_class_scope on public.app_records
as restrictive for all to authenticated
using (
  kind<>'class'
  or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher')
  or public.teacher_owns_class(data)
)
with check (
  kind<>'class'
  or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher')
  or public.teacher_owns_class(data)
);

drop policy if exists teacher_own_classes_read on public.app_records;
create policy teacher_own_classes_read on public.app_records for select to authenticated
using (kind='class' and public.has_permission('classes.view') and public.teacher_owns_class(data));

create or replace function public.teacher_owns_student(student_id text,student_data jsonb)
returns boolean
language sql stable security definer
set search_path=public
as $$
  select exists(
    select 1 from public.app_records c
    where c.kind='class' and public.teacher_owns_class(c.data)
      and (c.id=student_data->>'classId' or c.id=student_data->>'class_id'
        or coalesce(student_data->'classIds','[]'::jsonb) ? c.id
        or coalesce(c.data->'studentIds','[]'::jsonb) ? student_id)
  );
$$;
revoke all on function public.teacher_owns_student(text,jsonb) from public;
grant execute on function public.teacher_owns_student(text,jsonb) to authenticated;

drop policy if exists teacher_student_scope on public.app_records;
create policy teacher_student_scope on public.app_records
as restrictive for select to authenticated
using (kind<>'student'
  or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher')
  or public.teacher_owns_student(id,data));

drop policy if exists teacher_own_students_read on public.app_records;
create policy teacher_own_students_read on public.app_records for select to authenticated
using (kind='student' and public.has_permission('classes.view') and public.teacher_owns_student(id,data));

commit;
