-- Purple Gestão — fonte canônica para follow-up do aluno.
-- PREPARADA NA FASE 1. NÃO EXECUTAR AUTOMATICAMENTE.

create table if not exists public.student_followups (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  source_module text not null check (source_module in ('MANUAL','WHATSAPP','TWR','FINANCIAL','CASE','OTHER')),
  source_ref text,
  contact_at timestamptz not null,
  employee_name text,
  subject text not null,
  result text,
  next_contact_date date,
  done boolean not null default true,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_followups_student_idx
  on public.student_followups(student_id, contact_at desc);

drop trigger if exists student_followups_touch_updated_at on public.student_followups;
create trigger student_followups_touch_updated_at
before update on public.student_followups
for each row execute function public.touch_updated_at();

insert into public.student_followups (
  student_id, source_module, source_ref, contact_at, employee_name,
  subject, result, next_contact_date, done, notes, payload, created_by, updated_by
)
select
  s.id,
  case upper(coalesce(entry.value->>'type',''))
    when 'TWR' then 'TWR'
    when 'WHATSAPP' then 'WHATSAPP'
    when 'FINANCIAL' then 'FINANCIAL'
    when 'CASE' then 'CASE'
    else 'MANUAL'
  end,
  nullif(entry.value->>'id',''),
  coalesce(
    nullif(entry.value->>'at','')::timestamptz,
    (coalesce(nullif(entry.value->>'contactDate',''), current_date::text) || 'T' || coalesce(nullif(entry.value->>'contactTime',''),'00:00'))::timestamptz
  ),
  nullif(entry.value->>'employee',''),
  coalesce(nullif(entry.value->>'subject',''),'FOLLOW-UP MIGRADO'),
  nullif(entry.value->>'result',''),
  nullif(entry.value->>'nextDate','')::date,
  coalesce((entry.value->>'done')::boolean, true),
  nullif(entry.value->>'notes',''),
  entry.value,
  null,
  null
from public.students s
cross join lateral jsonb_array_elements(coalesce(s.data->'followUpEntries','[]'::jsonb)) entry(value)
where not exists (
  select 1
  from public.student_followups f
  where f.student_id = s.id
    and f.source_ref is not distinct from nullif(entry.value->>'id','')
    and f.contact_at = coalesce(
      nullif(entry.value->>'at','')::timestamptz,
      (coalesce(nullif(entry.value->>'contactDate',''), current_date::text) || 'T' || coalesce(nullif(entry.value->>'contactTime',''),'00:00'))::timestamptz
    )
    and f.subject = coalesce(nullif(entry.value->>'subject',''),'FOLLOW-UP MIGRADO')
);
