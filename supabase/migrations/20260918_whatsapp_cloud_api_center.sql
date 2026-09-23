-- Purple Gestão — Central WhatsApp oficial via Meta Cloud API.
-- Prepara persistência, idempotência de webhook, vínculos aluno/responsável e auditoria.

create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  display_name text,
  student_id uuid null,
  student_record_id text null,
  responsible_name text,
  link_status text not null default 'unidentified' check (link_status in ('unidentified','matched','manual','ignored')),
  linked_by uuid references public.profiles(id),
  linked_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  status text not null default 'new' check (status in ('new','in_progress','resolved')),
  assigned_to uuid references public.profiles(id),
  last_message_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  service_window_until timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  meta_message_id text unique,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text',
  body text,
  status text not null default 'received' check (status in ('queued','sending','sent','delivered','read','received','failed')),
  sent_by uuid references public.profiles(id),
  meta_timestamp timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_audit_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_contacts_student_record_idx on public.whatsapp_contacts(student_record_id);
create index if not exists whatsapp_conversations_activity_idx on public.whatsapp_conversations(last_message_at desc nulls last);
create index if not exists whatsapp_conversations_assigned_idx on public.whatsapp_conversations(assigned_to,status);
create index if not exists whatsapp_messages_conversation_idx on public.whatsapp_messages(conversation_id,created_at);

drop trigger if exists whatsapp_contacts_touch_updated_at on public.whatsapp_contacts;
create trigger whatsapp_contacts_touch_updated_at before update on public.whatsapp_contacts
for each row execute function public.touch_updated_at();

drop trigger if exists whatsapp_conversations_touch_updated_at on public.whatsapp_conversations;
create trigger whatsapp_conversations_touch_updated_at before update on public.whatsapp_conversations
for each row execute function public.touch_updated_at();

drop trigger if exists whatsapp_messages_touch_updated_at on public.whatsapp_messages;
create trigger whatsapp_messages_touch_updated_at before update on public.whatsapp_messages
for each row execute function public.touch_updated_at();

alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_audit_events enable row level security;

drop policy if exists whatsapp_contacts_select on public.whatsapp_contacts;
create policy whatsapp_contacts_select on public.whatsapp_contacts for select
using (public.is_direction() or public.has_permission('whatsapp.view'));

drop policy if exists whatsapp_conversations_select on public.whatsapp_conversations;
create policy whatsapp_conversations_select on public.whatsapp_conversations for select
using (public.is_direction() or public.has_permission('whatsapp.view'));

drop policy if exists whatsapp_messages_select on public.whatsapp_messages;
create policy whatsapp_messages_select on public.whatsapp_messages for select
using (public.is_direction() or public.has_permission('whatsapp.view'));

drop policy if exists whatsapp_contacts_update on public.whatsapp_contacts;
create policy whatsapp_contacts_update on public.whatsapp_contacts for update
using (public.is_direction() or public.has_permission('whatsapp.manage'))
with check (public.is_direction() or public.has_permission('whatsapp.manage'));

drop policy if exists whatsapp_conversations_update on public.whatsapp_conversations;
create policy whatsapp_conversations_update on public.whatsapp_conversations for update
using (public.is_direction() or public.has_permission('whatsapp.reply'))
with check (public.is_direction() or public.has_permission('whatsapp.reply'));

drop policy if exists whatsapp_messages_insert on public.whatsapp_messages;
create policy whatsapp_messages_insert on public.whatsapp_messages for insert
with check (public.is_direction() or public.has_permission('whatsapp.reply'));

drop policy if exists whatsapp_audit_select on public.whatsapp_audit_events;
create policy whatsapp_audit_select on public.whatsapp_audit_events for select
using (public.is_direction() or public.has_permission('audit.view'));

grant select, update on public.whatsapp_contacts to authenticated;
grant select, update on public.whatsapp_conversations to authenticated;
grant select, insert, update on public.whatsapp_messages to authenticated;
grant select, insert on public.whatsapp_audit_events to authenticated;

do $$
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'whatsapp_conversations') then
    alter publication supabase_realtime add table public.whatsapp_conversations;
  end if;
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'whatsapp_messages') then
    alter publication supabase_realtime add table public.whatsapp_messages;
  end if;
end $$;
