-- Purple Gestão — permite criar a configuração inicial quando ela ainda não existe.
-- Não remove nem altera registros existentes.

alter policy records_insert on public.app_records with check (
  owner_id = auth.uid() and public.has_sector_access(sector) and (
    (kind in ('student','class','teacher') and public.has_permission('reports.create')) or
    (kind = 'financial_entry' and public.has_permission('financial.transactions.create')) or
    (kind = 'report' and public.has_permission('reports.create')) or
    (kind = 'action' and public.has_permission('actions.create')) or
    (kind = 'case' and public.has_permission('cases.view')) or
    (kind = 'meeting' and public.has_permission('meetings.edit')) or
    (kind = 'audit' and public.has_permission('audit.view')) or
    (kind = 'settings' and public.has_permission('settings.edit')) or
    (kind = 'notification_reads')
  )
);
