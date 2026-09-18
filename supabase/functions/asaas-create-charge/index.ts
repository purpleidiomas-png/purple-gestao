import { corsHeaders, json, requireFinancialOperator, asaasRequest, buildCustomerPayload, mapFinancialStatus, chargeTypeLabel, fetchPaymentArtifacts, normalizeAsaasBillingType } from '../_shared/asaas.ts'

type ChargePayload = {
  studentId?: string
  chargeType?: string
  value?: number
  dueDate?: string
  billingType?: string
  description?: string
  competence?: string
  fullValue?: number
  punctualValue?: number
  installmentNumber?: number
  installmentTotal?: number
  installmentGroupId?: string
  idempotencyKey?: string
}

const allowedChargeTypes = new Set(['MENSALIDADE', 'MATERIAL_DIDATICO', 'MATRICULA', 'REPOSICAO', 'OUTRO'])
const allowedBillingTypes = new Set(['UNDEFINED', 'PIX', 'BOLETO'])

const financialChargeResponse = (charge: Record<string, unknown>, studentId: string, studentName: string) => ({
  id: charge.id,
  supabaseId: charge.id,
  studentId,
  studentName,
  chargeType: charge.charge_type,
  billingType: charge.billing_type,
  status: charge.status,
  syncStatus: charge.sync_status,
  syncError: charge.sync_error,
  value: charge.value,
  fullValue: charge.full_value,
  punctualValue: charge.punctual_value,
  discountValue: charge.discount_value,
  installmentNumber: charge.installment_number,
  installmentTotal: charge.installment_total,
  installmentGroupId: charge.installment_group_id,
  competence: charge.competence,
  dueDate: charge.due_date,
  description: charge.description,
  invoiceUrl: charge.invoice_url,
  bankSlipUrl: charge.bank_slip_url,
  digitableLine: charge.digitable_line,
  boletoBarCode: charge.boleto_bar_code,
  boletoNossoNumero: charge.boleto_nosso_numero,
  pixCopyPaste: charge.pix_copy_paste,
  pixQrCode: charge.pix_qr_code,
  pixQrExpiresAt: charge.pix_qr_expires_at,
  externalChargeId: charge.external_charge_id,
  asaasPaymentId: charge.asaas_payment_id || charge.external_charge_id,
  externalReference: charge.external_reference,
})

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Sessão ausente.' }, 401)

  const auth = await requireFinancialOperator(authorization)
  if (!auth.ok) return json(auth.body, auth.status)

  let body: ChargePayload
  try { body = await request.json() } catch { return json({ error: 'Payload inválido.' }, 400) }

  const studentId = String(body.studentId || '').trim()
  const chargeType = String(body.chargeType || '').trim().toUpperCase()
  const billingType = normalizeAsaasBillingType(body.billingType)
  const dueDate = String(body.dueDate || '').trim()
  const value = Number(body.fullValue || body.value || 0)
  const punctualValue = Number(body.punctualValue ?? value)
  const discountValue = Math.max(0, Number((value - punctualValue).toFixed(2)))
  const installmentNumber = Number(body.installmentNumber || 1)
  const installmentTotal = Number(body.installmentTotal || 1)
  const installmentGroupId = String(body.installmentGroupId || '').trim() || null
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  const competence = String(body.competence || '').trim() || null
  const customDescription = String(body.description || '').trim()

  if (!studentId) return json({ error: 'Aluno obrigatório.' }, 400)
  if (!allowedChargeTypes.has(chargeType)) return json({ error: 'Tipo de cobrança inválido.' }, 400)
  if (!allowedBillingTypes.has(billingType)) return json({ error: 'Forma de cobrança inválida.' }, 400)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return json({ error: 'Vencimento inválido.' }, 400)
  if (!Number.isFinite(value) || value <= 0) return json({ error: 'Valor inválido.' }, 400)
  if (!Number.isFinite(punctualValue) || punctualValue < 0 || punctualValue > value) return json({ error: 'Valor com desconto inválido.' }, 400)
  if (!Number.isInteger(installmentNumber) || !Number.isInteger(installmentTotal) || installmentNumber < 1 || installmentTotal > 24 || installmentNumber > installmentTotal) return json({ error: 'Posição da parcela inválida.' }, 400)

  const { admin, profile, user } = auth

  const { data: studentRecord, error: studentError } = await admin
    .from('app_records')
    .select('id, kind, data, owner_id, created_at, updated_at')
    .eq('id', studentId)
    .eq('kind', 'student')
    .single()
  if (studentError || !studentRecord) return json({ error: 'Aluno não encontrado.' }, 404)

  const studentData = (
    studentRecord.data && typeof studentRecord.data === 'object'
      ? studentRecord.data
      : {}
  ) as Record<string, unknown>
  const studentName = String(studentData.name || '').trim()
  const studentEmail = String(studentData.email || '').trim().toLowerCase()
  const studentPhone = String(studentData.phone || studentData.whatsapp || '').trim()
  if (!studentName) return json({ error: 'Aluno sem nome válido para gerar cobrança.' }, 400)

  const student = {
    ...studentRecord,
    name: studentName,
    email: studentEmail || null,
    phone: studentPhone || null,
    whatsapp: String(studentData.whatsapp || '').trim() || null,
  }

  const duplicateQuery = admin
    .from('financial_charges')
    .select('*')
  const duplicateCheck = idempotencyKey
    ? await duplicateQuery.eq('external_reference', idempotencyKey).maybeSingle()
    : await duplicateQuery.eq('student_id', studentId).eq('charge_type', chargeType).eq('billing_type', billingType).eq('due_date', dueDate).eq('value', value).in('status', ['PENDING', 'OVERDUE', 'PAID']).limit(1).maybeSingle()
  if (duplicateCheck.data?.id) return json({
    charge: financialChargeResponse(duplicateCheck.data as Record<string, unknown>, studentId, student.name),
    duplicate: true,
    idempotent: Boolean(idempotencyKey),
  })

  let asaasCustomer = await admin
    .from('asaas_customers')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()
  if (asaasCustomer.error) return json({ error: 'Não foi possível consultar o customer financeiro.' }, 500)

  if (!asaasCustomer.data) {
    const customerPayload = buildCustomerPayload(student as Record<string, unknown>)
    if (!customerPayload.name) return json({ error: 'Não foi possível gerar o customer sem nome válido.' }, 400)
    const created = await asaasRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerPayload),
    }) as Record<string, unknown>
    const customerInsert = {
      student_id: studentId,
      external_customer_id: String(created.id || ''),
      name: customerPayload.name,
      cpf_cnpj: customerPayload.cpfCnpj || null,
      email: customerPayload.email || null,
      phone: customerPayload.phone || null,
      mobile_phone: customerPayload.mobilePhone || null,
      data: created,
    }
    const inserted = await admin.from('asaas_customers').insert(customerInsert).select('*').single()
    if (inserted.error || !inserted.data) return json({ error: 'Customer criado no Asaas, mas não foi possível persisti-lo.' }, 500)
    asaasCustomer = { data: inserted.data, error: null, count: null, status: 200, statusText: 'OK' }
  }

  const chargeSeed = await admin
    .from('financial_charges')
    .insert({
      student_id: studentId,
      asaas_customer_id: asaasCustomer.data.id,
      provider: 'ASAAS',
      external_reference: idempotencyKey || `pg-fin-${crypto.randomUUID()}`,
      charge_type: chargeType,
      billing_type: billingType,
      status: 'PENDING',
      description: customDescription || `${chargeTypeLabel(chargeType)} • ${student.name}`,
      competence,
      due_date: dueDate,
      value,
      full_value: value,
      punctual_value: punctualValue,
      discount_value: discountValue,
      discount_due_date: dueDate,
      installment_number: installmentNumber,
      installment_total: installmentTotal,
      installment_group_id: installmentGroupId,
      origin: 'ASAAS',
      sync_status: 'SYNCING',
      sync_error: null,
      student_name: student.name,
      responsible_name: asaasCustomer.data.name,
      created_by: user.id,
      created_by_name: profile.name,
      data: {
        createdByName: profile.name,
      },
    })
    .select('*')
    .single()
  if (chargeSeed.error || !chargeSeed.data) return json({ error: 'Não foi possível registrar a cobrança interna.' }, 500)

  try {
    const asaasPayment = await asaasRequest('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: asaasCustomer.data.external_customer_id,
        billingType,
        value,
        dueDate,
        description: customDescription || `${chargeTypeLabel(chargeType)} • ${student.name}`,
        externalReference: chargeSeed.data.external_reference,
        ...(discountValue > 0 ? { discount: { value: discountValue, dueDateLimitDays: 0, type: 'FIXED' } } : {}),
      }),
    }) as Record<string, unknown>

    const artifacts = asaasPayment.id
      ? await fetchPaymentArtifacts(String(asaasPayment.id))
      : { pixPayload: null, boletoPayload: null, pixCopyPaste: null, pixQrCode: null, pixQrExpiresAt: null, digitableLine: null, boletoBarCode: null, boletoNossoNumero: null }

    const updated = await admin
      .from('financial_charges')
      .update({
        external_charge_id: String(asaasPayment.id || ''),
        asaas_payment_id: String(asaasPayment.id || ''),
        status: mapFinancialStatus(String(asaasPayment.status || 'PENDING')),
        sync_status: 'SYNCED',
        sync_error: null,
        invoice_url: String(asaasPayment.invoiceUrl || '') || null,
        bank_slip_url: String(asaasPayment.bankSlipUrl || '') || null,
        digitable_line: artifacts.digitableLine || String(asaasPayment.nossoNumero || '') || null,
        boleto_bar_code: artifacts.boletoBarCode,
        boleto_nosso_numero: artifacts.boletoNossoNumero || String(asaasPayment.nossoNumero || '') || null,
        pix_copy_paste: artifacts.pixCopyPaste,
        pix_qr_code: artifacts.pixQrCode,
        pix_qr_expires_at: artifacts.pixQrExpiresAt,
        data: {
          ...(chargeSeed.data.data || {}),
          asaasPayment,
          pixPayload: artifacts.pixPayload,
          boletoPayload: artifacts.boletoPayload,
        },
      })
      .eq('id', chargeSeed.data.id)
      .select('*')
      .single()
    if (updated.error || !updated.data) return json({ error: 'Cobrança criada no Asaas, mas falhou a atualização local.' }, 500)

    return json({
      charge: financialChargeResponse(updated.data as Record<string, unknown>, studentId, student.name),
    })
  } catch (error) {
    await admin
      .from('financial_charges')
      .update({
        sync_status: 'SYNC_ERROR',
        sync_error: String(error instanceof Error ? error.message : error).slice(0, 2000),
        data: {
          ...(chargeSeed.data.data || {}),
          createError: String(error instanceof Error ? error.message : error),
        },
      })
      .eq('id', chargeSeed.data.id)
    return json({ error: 'Não foi possível criar a cobrança no Asaas.' }, 502)
  }
})
