-- Storage seguro para capas, PDFs de livros e recursos do Lesson Plans.
-- A aplicação tenta usar este bucket para upload; se as políticas não estiverem aplicadas,
-- a UI mantém fallback por URL segura e exibe o erro real ao usuário.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-plan-assets',
  'lesson-plan-assets',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists lesson_plan_assets_select_authenticated on storage.objects;
drop policy if exists lesson_plan_assets_insert_authenticated on storage.objects;
drop policy if exists lesson_plan_assets_update_authenticated on storage.objects;

create policy lesson_plan_assets_select_authenticated
on storage.objects
for select
to authenticated
using (bucket_id = 'lesson-plan-assets');

create policy lesson_plan_assets_insert_authenticated
on storage.objects
for insert
to authenticated
with check (bucket_id = 'lesson-plan-assets');

create policy lesson_plan_assets_update_authenticated
on storage.objects
for update
to authenticated
using (bucket_id = 'lesson-plan-assets')
with check (bucket_id = 'lesson-plan-assets');
