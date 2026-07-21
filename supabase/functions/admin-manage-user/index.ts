import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const has = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const permissionKeys = new Set([
  'panel.view', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'pulse.view', 'pulse.answer', 'pulse.consolidated',
  'reports.view', 'reports.create', 'reports.edit', 'reports.delete', 'reports.approve', 'reports.request_adjustment', 'reports.export', 'indicators.view',
  'actions.view', 'actions.create', 'actions.edit', 'actions.delete', 'cases.view', 'meetings.view', 'meetings.edit',
  'mural.view', 'mural.create', 'mural.edit', 'mural.delete', 'users.view', 'users.edit', 'audit.view', 'audit.export', 'settings.view', 'settings.edit',
  'financial.receipts.view', 'financial.payments.view', 'financial.receivables.view', 'financial.payables.view', 'financial.bank_accounts.view', 'financial.balances.view',
  'financial.transactions.create', 'financial.transactions.edit', 'financial.transactions.delete', 'financial.export',
  'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.issue', 'inventory.entry', 'inventory.return', 'inventory.adjust', 'inventory.inactivate', 'inventory.export',
  'assets.view', 'assets.create', 'assets.edit', 'assets.move', 'assets.assign', 'assets.maintenance', 'assets.return', 'assets.retire', 'assets.export',
])
const isPermissionMap = (value: unknown): value is Record<string, boolean> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([key, enabled]) => permissionKeys.has(key) && typeof enabled === 'boolean')
}
const isEffectiveAdministrator = (profile: Record<string, unknown>) => {
  const permissions = profile.permissions
  return profile.role === 'direction'
    && profile.active === true
    && profile.sector === 'all'
    && profile.access_scope === 'all_sectors'
    && isPermissionMap(permissions)
    && permissions['users.edit'] === true
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) return json({ error: 'Configuração segura do servidor indisponível.' }, 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const callerDb = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  })
  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data: { user: caller }, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !caller) return json({ error: 'Sessão inválida.' }, 401)
  const { data: callerProfile, error: callerProfileError } = await callerDb.from('profiles').select('role, active, permissions').eq('id', caller.id).single()
  if (callerProfileError) return json({ error: 'Não foi possível validar as permissões da Direção.' }, 403)
  if (callerProfile?.role !== 'direction' || !callerProfile.active || callerProfile.permissions?.['users.edit'] !== true) return json({ error: 'A Direção não possui permissão para editar usuários.' }, 403)

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return json({ error: 'Payload inválido.' }, 400) }
  const userId = String(body.user_id || '')
  if (!userId) return json({ error: 'Identificador do usuário ausente.' }, 400)
  const { data: previous, error: previousError } = await callerDb.from('profiles').select('*').eq('id', userId).single()
  if (previousError || !previous) return json({ error: 'Usuário não encontrado.' }, 404)

  const changes: Record<string, unknown> = {}
  if (has(body, 'name')) { const value = String(body.name || '').trim(); if (!value) return json({ error: 'Informe o nome completo.' }, 400); if (value !== previous.name) changes.name = value }
  if (has(body, 'email')) { const value = String(body.email || '').trim().toLowerCase(); if (!value) return json({ error: 'Informe um e-mail válido.' }, 400); if (value !== previous.email) changes.email = value }
  if (has(body, 'role')) { const value = String(body.role || ''); if (!['direction', 'leader', 'viewer'].includes(value)) return json({ error: 'Perfil inválido.' }, 400); if (value !== previous.role) changes.role = value }
  if (has(body, 'sector')) { const value = String(body.sector || ''); if (!['all', 'retencao', 'pedagogico', 'financeiro'].includes(value)) return json({ error: 'Setor inválido.' }, 400); if (value !== previous.sector) changes.sector = value }
  if (has(body, 'access_scope')) { const value = String(body.access_scope || ''); if (!['own_sector', 'all_sectors'].includes(value)) return json({ error: 'Escopo de acesso inválido.' }, 400); if (value !== previous.access_scope) changes.access_scope = value }
  if (has(body, 'permissions')) {
    if (!isPermissionMap(body.permissions)) return json({ error: 'Permissões inválidas.' }, 400)
    changes.permissions = body.permissions
  }
  if (has(body, 'active')) {
    if (typeof body.active !== 'boolean') return json({ error: 'Status inválido.' }, 400)
    if (body.active !== previous.active) changes.active = body.active
  }
  if (has(body, 'job_title')) { const value = String(body.job_title || '').trim() || null; if (value !== previous.job_title) changes.job_title = value }
  if (has(body, 'avatar_url')) { const value = String(body.avatar_url || '').trim() || null; if (value !== previous.avatar_url) changes.avatar_url = value }

  const finalRole = String(changes.role ?? previous.role)
  const finalSector = String(changes.sector ?? previous.sector)
  const finalScope = String(changes.access_scope ?? previous.access_scope)
  const finalActive = Boolean(changes.active ?? previous.active)
  const finalPermissions = (changes.permissions ?? previous.permissions ?? {}) as Record<string, boolean>
  if (!isPermissionMap(finalPermissions)) return json({ error: 'As permissões atuais do usuário são inválidas.' }, 409)
  if (finalRole === 'direction' && (finalSector !== 'all' || finalScope !== 'all_sectors')) return json({ error: 'A Direção deve possuir acesso global.' }, 400)
  if (finalRole === 'leader' && (finalSector === 'all' || finalScope !== 'own_sector')) return json({ error: 'O líder deve permanecer restrito ao próprio setor.' }, 400)
  if (finalRole === 'viewer' && finalScope !== 'own_sector') return json({ error: 'O perfil Consulta deve permanecer restrito ao escopo configurado.' }, 400)
  const finalProfile = { ...previous, ...changes, role: finalRole, sector: finalSector, access_scope: finalScope, active: finalActive, permissions: finalPermissions }
  if (isEffectiveAdministrator(previous) && !isEffectiveAdministrator(finalProfile)) {
    const { data: profiles, error: administratorError } = await callerDb.from('profiles').select('id, role, active, sector, access_scope, permissions')
    if (administratorError) return json({ error: 'Não foi possível validar os administradores ativos.' }, 500)
    const otherEffectiveAdministrators = (profiles || []).filter(profile => profile.id !== userId && isEffectiveAdministrator(profile)).length
    if (!otherEffectiveAdministrators) return json({ error: 'O último administrador efetivo da Direção deve permanecer ativo, global e com permissão para gerenciar usuários.' }, 409)
  }

  const password = has(body, 'password') && body.password ? String(body.password) : undefined
  if (password && password.length < 8) return json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, 400)
  const authUpdate: { email?: string; email_confirm?: boolean; password?: string } = {}
  if (changes.email) Object.assign(authUpdate, { email: String(changes.email), email_confirm: true })
  if (password) authUpdate.password = password
  if (caller.id === userId && !isEffectiveAdministrator(finalProfile) && Object.keys(authUpdate).length) return json({ error: 'Altere primeiro o e-mail ou a senha e salve. A remoção do próprio acesso administrativo deve ser feita separadamente.' }, 409)
  let profile = previous
  if (Object.keys(changes).length) {
    const { data, error: profileError } = await callerDb.from('profiles').update(changes).eq('id', userId).select().single()
    if (profileError) return json({ error: `Não foi possível atualizar o perfil: ${profileError.message}`, code: profileError.code }, 400)
    profile = data
  }
  if (Object.keys(authUpdate).length) {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdate)
    if (authError) {
      if (Object.keys(changes).length) {
        const previousRecord = previous as Record<string, unknown>
        const rollback = Object.fromEntries(Object.keys(changes).map(key => [key, previousRecord[key]]))
        const { error: rollbackError } = await callerDb.from('profiles').update(rollback).eq('id', userId)
        if (rollbackError) console.error('profile_rollback_failed', rollbackError.message)
      }
      return json({ error: /already|registered|exists/i.test(authError.message) ? 'Este e-mail já está cadastrado no acesso de outro usuário.' : `Não foi possível atualizar a autenticação: ${authError.message}` }, 400)
    }
  }
  if (changes.name) {
    const { error: metadataError } = await admin.auth.admin.updateUserById(userId, { user_metadata: { name: changes.name } })
    if (metadataError) console.warn('user_metadata_sync_failed', metadataError.message)
  }
  return json({ profile })
})
