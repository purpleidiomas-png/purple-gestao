-- Libera o tipo usado pelo módulo Lesson Plans no app_records.
-- Necessário para persistir capas, PDFs, recursos e mapas da Biblioteca.

alter table public.app_records
drop constraint if exists app_records_kind_check;

alter table public.app_records
add constraint app_records_kind_check
check (
  kind = any (array[
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
    'financial_entry',
    'lesson_plans_workspace'
  ]::text[])
);
