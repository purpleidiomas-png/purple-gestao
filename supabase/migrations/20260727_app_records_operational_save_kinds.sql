-- Purple Gestão — corrige persistência dos módulos operacionais em app_records.
-- Não remove dados e não altera usuários. Apenas libera os tipos que o frontend já salva.

alter table public.app_records
  drop constraint if exists app_records_kind_check;

alter table public.app_records
  add constraint app_records_kind_check
  check (kind in (
    'report',
    'action',
    'case',
    'meeting',
    'audit',
    'settings',
    'notification_reads',
    'student',
    'class',
    'teacher',
    'financial_entry'
  ));

alter policy records_read on public.app_records using (
  public.has_sector_access(sector) and (
    (kind in ('student','class','teacher') and public.has_permission('reports.view')) or
    (kind = 'financial_entry' and (
      public.has_permission('financial.receipts.view') or
      public.has_permission('financial.payments.view') or
      public.has_permission('financial.receivables.view') or
      public.has_permission('financial.payables.view')
    )) or
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

alter policy records_update on public.app_records using (
  public.has_sector_access(sector) and (
    (kind in ('student','class','teacher') and public.has_permission('reports.edit')) or
    (kind = 'financial_entry' and public.has_permission('financial.transactions.edit')) or
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
    (kind in ('student','class','teacher') and public.has_permission('reports.delete')) or
    (kind = 'financial_entry' and public.has_permission('financial.transactions.delete')) or
    (kind = 'report' and public.has_permission('reports.delete')) or
    (kind = 'action' and public.has_permission('actions.delete')) or
    (kind = 'meeting' and public.has_permission('meetings.edit'))
  )
);
