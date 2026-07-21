-- Purple Gestão — liberação segura de funções por perfil.
-- Não altera usuários, senhas, dados operacionais ou políticas existentes.
-- Apenas amplia permissões padrão para perfis já cadastrados.

create or replace function public.default_permissions(p_role text, p_sector text)
returns jsonb language plpgsql immutable as $$
declare p jsonb;
begin
  if p_role = 'direction' then
    return '{
      "panel.view":true,"reports.view":true,"reports.create":true,"reports.edit":true,"reports.delete":true,"reports.approve":true,"reports.request_adjustment":true,"reports.export":true,"indicators.view":true,
      "tasks.view":true,"tasks.create":true,"tasks.edit":true,"tasks.delete":true,"pulse.view":true,"pulse.answer":true,"pulse.consolidated":true,
      "mural.view":true,"mural.create":true,"mural.edit":true,"mural.delete":true,"whatsapp.view":true,"whatsapp.reply":true,"whatsapp.manage":true,
      "meetings.view":true,"meetings.edit":true,"cases.view":true,"actions.view":true,"actions.create":true,"actions.edit":true,"actions.delete":true,
      "users.view":true,"users.edit":true,"audit.view":true,"audit.export":true,"settings.view":true,"settings.edit":true,
      "financial.receipts.view":true,"financial.payments.view":true,"financial.receivables.view":true,"financial.payables.view":true,"financial.bank_accounts.view":true,"financial.balances.view":true,
      "financial.transactions.create":true,"financial.transactions.edit":true,"financial.transactions.delete":true,"financial.export":true,
      "inventory.view":true,"inventory.create":true,"inventory.edit":true,"inventory.issue":true,"inventory.entry":true,"inventory.return":true,"inventory.adjust":true,"inventory.inactivate":true,"inventory.export":true,
      "assets.view":true,"assets.create":true,"assets.edit":true,"assets.move":true,"assets.assign":true,"assets.maintenance":true,"assets.return":true,"assets.retire":true,"assets.export":true
    }'::jsonb;
  elsif p_role = 'leader' then
    p := '{
      "panel.view":true,"reports.view":true,"reports.create":true,"reports.edit":true,"reports.export":true,"indicators.view":true,
      "tasks.view":true,"tasks.create":true,"tasks.edit":true,"tasks.delete":true,"pulse.view":true,"pulse.answer":true,
      "mural.view":true,"meetings.view":true,"cases.view":true,"actions.view":true,"actions.create":true,"actions.edit":true,
      "settings.view":true,"whatsapp.view":true,"whatsapp.reply":true,
      "inventory.view":true,"inventory.issue":true,"inventory.return":true
    }'::jsonb;
    if p_sector = 'financeiro' then
      p := p || '{
        "financial.receipts.view":true,"financial.payments.view":true,"financial.receivables.view":true,"financial.payables.view":true,"financial.bank_accounts.view":true,"financial.balances.view":true,
        "financial.transactions.create":true,"financial.transactions.edit":true,"financial.transactions.delete":true,"financial.export":true,
        "inventory.create":true,"inventory.edit":true,"inventory.entry":true,"inventory.adjust":true,"inventory.inactivate":true,"inventory.export":true,
        "assets.view":true,"assets.export":true
      }'::jsonb;
    end if;
    return p;
  end if;
  return '{
    "panel.view":true,"reports.view":true,"indicators.view":true,"tasks.view":true,
    "mural.view":true,"meetings.view":true,"settings.view":true,
    "whatsapp.view":true,"inventory.view":true,"assets.view":true
  }'::jsonb;
end;
$$;

alter table public.profiles disable trigger profiles_permission_audit;

update public.profiles
set access_scope = case when role = 'direction' then 'all_sectors' else access_scope end,
    permissions = permissions || public.default_permissions(role, sector)
where role in ('direction','leader','viewer');

alter table public.profiles enable trigger profiles_permission_audit;
