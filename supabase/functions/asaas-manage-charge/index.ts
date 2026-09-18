import { asaasRequest, corsHeaders, json, requireFinancialOperator, fetchPaymentArtifacts, mapFinancialStatus, normalizeAsaasBillingType } from '../_shared/asaas.ts'

type ManagePayload = {
  action?: 'update' | 'cancel'
  chargeId?: string
  fullValue?: number
  punctualValue?: number
  dueDate?: string
  billingType?: string
  description?: string
  chargeType?: string
  competence?: string
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Sessão ausente.' }, 401)
  const auth = await requireFinancialOperator(authorization)
  if (!auth.ok) return json(auth.body, auth.status)
  let body: ManagePayload
  try { body = await request.json() } catch { return json({ error: 'Payload inválido.' }, 400) }
  const action = body.action
  const chargeId = String(body.chargeId || '')
  if (!['update', 'cancel'].includes(String(action)) || !chargeId) return json({ error: 'Operação inválida.' }, 400)

  const { admin, profile, user } = auth
  const canEdit = profile.role === 'direction' || profile.permissions?.['financial.transactions.edit'] === true
  const canCancel = profile.role === 'direction' || profile.permissions?.['financial.transactions.delete'] === true
  if (action === 'update' && !canEdit) return json({ error: 'Permissão de edição financeira insuficiente.' }, 403)
  if (action === 'cancel' && !canCancel) return json({ error: 'Permissão de cancelamento financeiro insuficiente.' }, 403)
  const lookup = await admin.from('financial_charges').select('*').eq('id', chargeId).single()
  if (lookup.error || !lookup.data) return json({ error: 'Cobrança não encontrada.' }, 404)
  const charge = lookup.data
  if (!charge.external_charge_id || charge.provider !== 'ASAAS') return json({ error: 'Registro sem cobrança Asaas vinculada.' }, 409)
  if (['PAID', 'REFUNDED', 'CANCELED'].includes(String(charge.status))) return json({ error: 'O estado atual não permite esta operação.' }, 409)

  if (action === 'cancel') {
    const remote = await asaasRequest(`/payments/${charge.external_charge_id}`, { method: 'DELETE' }) as Record<string, unknown>
    if (remote.deleted !== true) return json({ error: 'O Asaas não confirmou o cancelamento.' }, 502)
    const now = new Date().toISOString()
    const updated = await admin.from('financial_charges').update({
      status: 'CANCELED', archived_at: now, canceled_at: now, canceled_by: user.id, canceled_by_name: profile.name,
      sync_status: 'SYNCED',
      sync_error: null,
      data: { ...(charge.data || {}), cancelResponse: remote },
    }).eq('id', charge.id).select('*').single()
    if (updated.error) return json({ error: 'Cancelada no Asaas, mas a sincronização local falhou.', reconciliationRequired: true }, 500)
    await admin.from('financial_charge_audit').insert({ charge_id: charge.id, action: 'CANCEL', actor_id: user.id, actor_name: profile.name, provider: 'ASAAS', external_charge_id: charge.external_charge_id, before_data: charge, after_data: updated.data })
    return json({ charge: updated.data })
  }

  const fullValue = Number(body.fullValue ?? charge.full_value ?? charge.value)
  const punctualValue = Number(body.punctualValue ?? charge.punctual_value ?? fullValue)
  const discountValue = Math.max(0, Number((fullValue - punctualValue).toFixed(2)))
  const dueDate = String(body.dueDate || charge.due_date)
  const billingType = normalizeAsaasBillingType(body.billingType || charge.billing_type)
  if (!(fullValue > 0) || punctualValue < 0 || punctualValue > fullValue || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !['UNDEFINED', 'PIX', 'BOLETO'].includes(billingType)) return json({ error: 'Dados financeiros inválidos.' }, 400)
  const remotePayload = {
    billingType, value: fullValue, dueDate,
    description: String(body.description || charge.description),
    externalReference: charge.external_reference,
    ...(discountValue > 0 ? { discount: { value: discountValue, dueDateLimitDays: 0, type: 'FIXED' } } : {}),
  }
  const remote = await asaasRequest(`/payments/${charge.external_charge_id}`, { method: 'PUT', body: JSON.stringify(remotePayload) }) as Record<string, unknown>
  const artifacts = await fetchPaymentArtifacts(String(charge.external_charge_id))
  const updated = await admin.from('financial_charges').update({
    value: fullValue, full_value: fullValue, punctual_value: punctualValue, discount_value: discountValue, discount_due_date: dueDate,
    due_date: dueDate, billing_type: billingType, description: remotePayload.description,
    charge_type: String(body.chargeType || charge.charge_type), competence: String(body.competence || dueDate.slice(0, 7)),
    status: mapFinancialStatus(String(remote.status || charge.status || 'PENDING')),
    invoice_url: String(remote.invoiceUrl || charge.invoice_url || '') || null,
    bank_slip_url: String(remote.bankSlipUrl || charge.bank_slip_url || '') || null,
    digitable_line: artifacts.digitableLine || charge.digitable_line || null,
    boleto_bar_code: artifacts.boletoBarCode || charge.boleto_bar_code || null,
    boleto_nosso_numero: artifacts.boletoNossoNumero || String(remote.nossoNumero || charge.boleto_nosso_numero || '') || null,
    pix_copy_paste: artifacts.pixCopyPaste || charge.pix_copy_paste || null,
    pix_qr_code: artifacts.pixQrCode || charge.pix_qr_code || null,
    pix_qr_expires_at: artifacts.pixQrExpiresAt || charge.pix_qr_expires_at || null,
    sync_status: 'SYNCED',
    sync_error: null,
    updated_by: user.id, updated_by_name: profile.name,
    data: { ...(charge.data || {}), lastUpdateResponse: remote, pixPayload: artifacts.pixPayload, boletoPayload: artifacts.boletoPayload },
  }).eq('id', charge.id).select('*').single()
  if (updated.error) return json({ error: 'Atualizada no Asaas, mas a sincronização local falhou.', reconciliationRequired: true }, 500)
  await admin.from('financial_charge_audit').insert({ charge_id: charge.id, action: 'UPDATE', actor_id: user.id, actor_name: profile.name, provider: 'ASAAS', external_charge_id: charge.external_charge_id, before_data: charge, after_data: updated.data })
  return json({ charge: updated.data })
})
