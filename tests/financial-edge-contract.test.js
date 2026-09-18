const assert=require('node:assert');
const fs=require('node:fs');

const create=fs.readFileSync('supabase/functions/asaas-create-charge/index.ts','utf8');
const manage=fs.readFileSync('supabase/functions/asaas-manage-charge/index.ts','utf8');
const shared=fs.readFileSync('supabase/functions/_shared/asaas.ts','utf8');
const webhook=fs.readFileSync('supabase/functions/asaas-webhook/index.ts','utf8');
const app=fs.readFileSync('app.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260819_student_financial_center.sql','utf8');
const phase2Migration=fs.readFileSync('supabase/migrations/20260820_financial_asaas_phase2_sync.sql','utf8');

assert.match(create,/value,\s*dueDate/,'Asaas deve receber o valor integral e o vencimento.');
assert.match(create,/discount:\s*\{\s*value:\s*discountValue,\s*dueDateLimitDays:\s*0,\s*type:\s*'FIXED'/,'Desconto fixo deve expirar no vencimento pelo mecanismo nativo do Asaas.');
assert.match(create,/idempotencyKey/,'Criação deve aceitar chave de idempotência persistente.');
assert.match(create,/UNDEFINED.*PIX.*BOLETO/s,'Criação deve aceitar cobrança única PIX + boleto por billingType UNDEFINED.');
assert.match(create,/fetchPaymentArtifacts/,'Criação deve tentar buscar artefatos de PIX e boleto depois do pagamento Asaas.');
assert.match(create,/sync_status:\s*'SYNCING'/,'Criação deve marcar sincronização em andamento antes de chamar o Asaas.');
assert.match(create,/sync_status:\s*'SYNC_ERROR'/,'Falha externa deve ficar como erro de sincronização, sem virar cancelamento.');
assert.match(manage,/method:\s*'PUT'/,'Edição deve atualizar a cobrança Asaas existente.');
assert.match(manage,/method:\s*'DELETE'/,'Cancelamento deve remover apenas cobrança Asaas elegível.');
assert.match(manage,/\['PAID', 'REFUNDED', 'CANCELED'\]/,'Fatos pagos e encerrados devem ser protegidos.');
assert.match(manage,/fetchPaymentArtifacts/,'Edição deve renovar QR PIX e linha digitável após alteração remota.');
assert.match(shared,/PAYMENT_RECEIVED[\s\S]*RECEIVED_IN_CASH/,'Mapeamento deve reconhecer somente recebimento final como pago.');
assert(!/RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH/.test(shared),'CONFIRMED não pode baixar como pago.');
assert.match(webhook,/isFinalReceivedPayment/,'Webhook deve separar confirmação de recebimento final.');
assert.match(webhook,/PAYMENT_CONFIRMED/,'Webhook deve preservar confirmação intermediária para auditoria.');
assert.match(webhook,/externalReference_mismatch/,'Webhook deve validar externalReference antes de conciliar.');
assert.match(webhook,/onConflict:\s*'external_payment_id'/,'Webhook deve ser idempotente no registro de pagamentos.');
assert.match(app,/Origem: MIGRATION[^<]*· sem integração externa/,'Fluxo histórico deve declarar que não integra com o Asaas.');
assert.match(app,/await Storage\.save\(State\.db\);await logAudit\('Importou pagamentos históricos'/,'Histórico deve usar persistência local auditada.');
assert.match(migration,/intentionally no financial backfill/,'Migration não deve presumir classificação de valores antigos.');
assert.match(phase2Migration,/billing_type in \('UNDEFINED','PIX','BOLETO'\)/,'Migration deve liberar billingType UNDEFINED para uma cobrança com escolha de método.');
assert.match(phase2Migration,/sync_status in \('NOT_SYNCED','SYNCING','SYNCED','SYNC_ERROR'\)/,'Migration deve modelar estado de sincronização.');
assert.match(phase2Migration,/asaas_webhook_events_external_event_unique/,'Migration deve reforçar idempotência por evento externo.');
assert.match(phase2Migration,/financial_ledger_entries/,'Migration deve preparar razão/auditoria financeira sem recalcular saldo simplista.');

console.log('financial edge contract test ok');
