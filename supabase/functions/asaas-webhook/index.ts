import { corsHeaders, json, createAdminClient, mapFinancialStatus, sha256, isFinalReceivedPayment } from '../_shared/asaas.ts'

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
  const receivedToken = request.headers.get('asaas-access-token') || request.headers.get('x-asaas-access-token')
  if (!expectedToken || !receivedToken || receivedToken !== expectedToken) return json({ error: 'Webhook não autorizado.' }, 401)

  const rawBody = await request.text()
  let payload: Record<string, unknown>
  try { payload = rawBody ? JSON.parse(rawBody) : {} } catch { return json({ error: 'Payload inválido.' }, 400) }

  const checksum = await sha256(rawBody || JSON.stringify(payload))
  const eventType = String(payload.event || 'UNKNOWN')
  const externalEventId = String(payload.id || payload.eventId || '')
  const payment = ((payload.payment && typeof payload.payment === 'object') ? payload.payment : {}) as Record<string, unknown>
  const externalChargeId = String(payment.id || payload.id || '')
  const externalPaymentId = String(payment.id || '')
  const externalReference = String(payment.externalReference || '')

  const admin = createAdminClient()
  const existing = await admin
    .from('asaas_webhook_events')
    .select('id, processed')
    .eq('provider', 'ASAAS')
    .eq('payload_checksum', checksum)
    .maybeSingle()
  if (existing.data?.id) return json({ ok: true, duplicate: true })
  if (externalEventId) {
    const existingEventId = await admin
      .from('asaas_webhook_events')
      .select('id, processed')
      .eq('provider', 'ASAAS')
      .eq('external_event_id', externalEventId)
      .maybeSingle()
    if (existingEventId.data?.id) return json({ ok: true, duplicate: true })
  }

  const insertedEvent = await admin
    .from('asaas_webhook_events')
    .insert({
      provider: 'ASAAS',
      event_type: eventType,
      external_event_id: externalEventId,
      external_charge_id: externalChargeId || null,
      external_payment_id: externalPaymentId || null,
      payload_checksum: checksum,
      payload,
      processed: false,
    })
    .select('*')
    .single()
  if (insertedEvent.error || !insertedEvent.data) return json({ error: 'Não foi possível registrar o evento.' }, 500)

  const chargeLookup = await admin
    .from('financial_charges')
    .select('*')
    .eq('external_charge_id', externalChargeId)
    .maybeSingle()

  if (!chargeLookup.data) {
    await admin
      .from('asaas_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        payload: { ...payload, unmatched: true },
      })
      .eq('id', insertedEvent.data.id)
    return json({ ok: true, unmatched: true })
  }

  const charge = chargeLookup.data
  if (externalReference && charge.external_reference && externalReference !== charge.external_reference) {
    await admin
      .from('asaas_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        payload: { ...payload, rejected: true, reason: 'externalReference_mismatch', expectedExternalReference: charge.external_reference },
      })
      .eq('id', insertedEvent.data.id)
    return json({ ok: true, rejected: true, reason: 'externalReference_mismatch' })
  }

  const mappedStatus = mapFinancialStatus(String(payment.status || eventType))
  const finalReceived = isFinalReceivedPayment(eventType, String(payment.status || ''))
  const paidAt = String(payment.paymentDate || payment.clientPaymentDate || '') || null
  const paidAmount = Number(payment.netValue || payment.value || charge.paid_amount || 0)
  const feeValue = Number(payment.asaasFee || payment.fee || 0) || null
  const netValue = Number(payment.netValue || payment.value || 0) || null
  const nextStatus = finalReceived ? 'PAID' : mappedStatus
  const now = new Date().toISOString()

  const chargeUpdate = await admin
    .from('financial_charges')
    .update({
      status: nextStatus,
      paid_at: finalReceived ? paidAt : charge.paid_at,
      received_at: finalReceived ? now : charge.received_at,
      confirmed_at: eventType === 'PAYMENT_CONFIRMED' ? now : charge.confirmed_at,
      paid_amount: finalReceived ? Number(payment.value || charge.value || 0) : charge.paid_amount,
      fee_value: feeValue,
      net_value: netValue,
      received_value: finalReceived ? paidAmount : charge.received_value,
      invoice_url: String(payment.invoiceUrl || charge.invoice_url || '') || null,
      bank_slip_url: String(payment.bankSlipUrl || charge.bank_slip_url || '') || null,
      sync_status: 'SYNCED',
      sync_error: null,
      data: {
        ...(charge.data || {}),
        lastWebhookEvent: eventType,
        lastWebhookAt: new Date().toISOString(),
        payment,
      },
    })
    .eq('id', charge.id)
    .select('id, student_id, billing_type, value, status')
    .single()
  if (chargeUpdate.error) return json({ error: 'Não foi possível atualizar a cobrança.' }, 500)

  if (finalReceived) {
    const paymentUpsert = await admin
      .from('financial_payments')
      .upsert({
        charge_id: charge.id,
        student_id: charge.student_id,
        provider: 'ASAAS',
        external_payment_id: externalPaymentId || externalChargeId,
        status: 'PAID',
        billing_type: charge.billing_type,
        value: Number(payment.value || charge.value || 0),
        net_value: netValue,
        fee_value: feeValue,
        paid_at: paidAt,
        received_at: now,
        data: payment,
      }, { onConflict: 'external_payment_id' })
    if (paymentUpsert.error) return json({ error: 'Não foi possível registrar o pagamento.' }, 500)

    await admin
      .from('financial_ledger_entries')
      .upsert({
        provider: 'ASAAS',
        external_event_id: externalEventId || checksum,
        charge_id: charge.id,
        payment_id: null,
        student_id: charge.student_id,
        entry_type: 'RECEIVABLE_RECEIVED',
        amount: Number(payment.value || charge.value || 0),
        net_value: netValue,
        fee_value: feeValue,
        occurred_at: paidAt || now,
        data: payment,
      }, { onConflict: 'provider,external_event_id' })
      .then(() => null)
      .catch(() => null)
  }

  await admin
    .from('asaas_webhook_events')
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
    })
    .eq('id', insertedEvent.data.id)

  return json({ ok: true })
})
