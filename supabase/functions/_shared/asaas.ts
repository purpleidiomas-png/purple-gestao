import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token, x-asaas-access-token',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

export const createAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !serviceRoleKey) throw new Error('SUPABASE_SERVER_CONFIG_MISSING')
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
}

export const createCallerClient = (authorization: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  if (!supabaseUrl || !anonKey) throw new Error('SUPABASE_PUBLIC_CONFIG_MISSING')
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  })
}

export async function requireFinancialOperator(authorization: string) {
  const admin = createAdminClient()
  const callerDb = createCallerClient(authorization)
  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data: { user }, error: userError } = await admin.auth.getUser(token)
  if (userError || !user) return { ok: false as const, status: 401, body: { error: 'Sessão inválida.' } }
  const { data: profile, error: profileError } = await callerDb
    .from('profiles')
    .select('id, name, email, role, sector, active, permissions')
    .eq('id', user.id)
    .single()
  if (profileError || !profile?.active) return { ok: false as const, status: 403, body: { error: 'Acesso não autorizado.' } }
  const canOperate = profile.role === 'direction'
    || profile.permissions?.['financial.transactions.create'] === true
    || profile.permissions?.['financial.transactions.edit'] === true
  if (!canOperate) return { ok: false as const, status: 403, body: { error: 'Permissão financeira insuficiente.' } }
  return { ok: true as const, admin, callerDb, user, profile }
}

export const normalizeDigits = (value: string | null | undefined) => String(value || '').replace(/\D+/g, '')

export const asaasBaseUrl = () => Deno.env.get('ASAAS_API_URL') || 'https://api-sandbox.asaas.com/v3'

export const asaasHeaders = () => {
  const apiKey = Deno.env.get('ASAAS_API_KEY')
  if (!apiKey) throw new Error('ASAAS_API_KEY_MISSING')
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    access_token: apiKey,
  }
}

export async function asaasRequest(path: string, init: RequestInit = {}) {
  const target = path.startsWith('http') ? path : `${asaasBaseUrl()}${path}`
  const response = await fetch(target, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...asaasHeaders(),
    },
  })
  const raw = await response.text()
  let data: unknown = null
  try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'errors' in data
      ? JSON.stringify((data as Record<string, unknown>).errors)
      : raw || response.statusText
    throw new Error(`ASAAS_HTTP_${response.status}:${message}`)
  }
  return data
}

export async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export const mapFinancialStatus = (value: string | null | undefined) => {
  const status = String(value || '').toUpperCase()
  if (['PAYMENT_RECEIVED', 'RECEIVED', 'PAYMENT_RECEIVED_IN_CASH', 'RECEIVED_IN_CASH'].includes(status)) return 'PAID'
  if (['OVERDUE'].includes(status)) return 'OVERDUE'
  if (['PAYMENT_REFUNDED', 'REFUNDED', 'PAYMENT_REFUND_REQUESTED', 'REFUND_REQUESTED', 'PAYMENT_CHARGEBACK_REQUESTED', 'CHARGEBACK_REQUESTED'].includes(status)) return 'REFUNDED'
  if (['PAYMENT_DELETED', 'DELETED', 'CANCELED', 'CANCELLED'].includes(status)) return 'CANCELED'
  return 'PENDING'
}

export const isFinalReceivedPayment = (eventType: string | null | undefined, paymentStatus: string | null | undefined) => {
  const event = String(eventType || '').toUpperCase()
  const status = String(paymentStatus || '').toUpperCase()
  return ['PAYMENT_RECEIVED', 'PAYMENT_RECEIVED_IN_CASH'].includes(event)
    || ['RECEIVED', 'RECEIVED_IN_CASH'].includes(status)
}

export const normalizeAsaasBillingType = (value: string | null | undefined) => {
  const billingType = String(value || 'UNDEFINED').trim().toUpperCase()
  return ['UNDEFINED', 'PIX', 'BOLETO'].includes(billingType) ? billingType : ''
}

export async function fetchPaymentArtifacts(paymentId: string) {
  const pix = await asaasRequest(`/payments/${paymentId}/pixQrCode`).catch(() => null) as Record<string, unknown> | null
  let boleto = await asaasRequest(`/payments/${paymentId}/identificationField`).catch(() => null) as Record<string, unknown> | null
  if (!boleto) boleto = await asaasRequest(`/lean/payments/${paymentId}/identificationField`).catch(() => null) as Record<string, unknown> | null
  return {
    pixPayload: pix,
    boletoPayload: boleto,
    pixCopyPaste: String((pix?.payload || '') as string) || null,
    pixQrCode: String((pix?.encodedImage || pix?.qrCode || '') as string) || null,
    pixQrExpiresAt: String((pix?.expirationDate || '') as string) || null,
    digitableLine: String((boleto?.identificationField || boleto?.digitableLine || '') as string) || null,
    boletoBarCode: String((boleto?.barCode || '') as string) || null,
    boletoNossoNumero: String((boleto?.nossoNumero || '') as string) || null,
  }
}

export function buildCustomerPayload(student: Record<string, unknown>) {
  const data = (student.data && typeof student.data === 'object' ? student.data : {}) as Record<string, unknown>
  const responsibleName = String(data.financialResponsibleName || data.responsibleName || student.name || '').trim()
  const name = responsibleName || String(student.name || '').trim()
  const cpfCnpj = normalizeDigits(String(data.financialResponsibleDocument || data.responsibleDocument || data.document || ''))
  const email = String(data.financialResponsibleEmail || data.responsibleEmail || student.email || '').trim().toLowerCase() || undefined
  const phone = normalizeDigits(String(data.financialResponsiblePhone || data.responsiblePhone || student.phone || '')) || undefined
  const mobilePhone = normalizeDigits(String(data.financialResponsibleWhatsapp || data.responsibleWhatsapp || data.whatsapp || '')) || undefined
  return {
    name,
    cpfCnpj: cpfCnpj || undefined,
    email,
    phone,
    mobilePhone,
  }
}

export const chargeTypeLabel = (value: string) => ({
  MENSALIDADE: 'Mensalidade',
  MATERIAL_DIDATICO: 'Material didático',
  MATRICULA: 'Matrícula',
  REPOSICAO: 'Reposição',
  OUTRO: 'Outro',
}[value] || value)
