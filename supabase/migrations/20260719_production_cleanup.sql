begin;

-- Base demonstrativa confirmada em 17/07/2026. Históricos dependentes são
-- removidos antes dos cadastros para não depender de cascatas implícitas.
delete from public.asset_movements;
delete from public.assets;
delete from public.book_movements;
delete from public.inventory_movements;
delete from public.inventory_items;
delete from public.achievements;
delete from public.pulse_entries;
delete from public.announcements;
delete from public.tasks;
delete from public.app_records where kind <> 'settings';

update public.app_records
set data = data || jsonb_build_object(
  'version','1.0',
  'deploymentDate','2026-07-18',
  'databaseVersion','20260719',
  'cacheVersion','v30',
  'lastSync',now()::text
)
where kind='settings';

commit;
