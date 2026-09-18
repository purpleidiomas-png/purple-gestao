import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
)

const RAPID_TEXT = [
  'Real-life Connection',
  'Active Learning',
  'Personalized Practice',
  'Interactive Engagement',
  'Dynamic Feedback',
].join(', ')

type LessonPayload = {
  action?: string
  stageKey?: string
  course?: Record<string, unknown>
  unit?: Record<string, unknown>
  lesson?: Record<string, unknown>
  plan?: Record<string, unknown>
  user?: Record<string, unknown>
}

type AuthContext = {
  id: string
  email?: string
  role?: string
  permissions?: Record<string, boolean>
}

async function authorize(request: Request): Promise<AuthContext | Response> {
  const authorization = request.headers.get('Authorization') || ''
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Autenticação obrigatória.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseKey) return json({ error: 'Supabase não configurado para autenticação.' }, 503)

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: authData, error: authError } = await supabase.auth.getUser(authorization.replace('Bearer ', ''))
  if (authError || !authData.user) return json({ error: 'Sessão inválida.' }, 401)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,role,permissions,active')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileError) return json({ error: 'Não foi possível validar permissões.' }, 500)
  if (!profile?.active) return json({ error: 'Usuário inativo.' }, 403)

  const permissions = (profile.permissions || {}) as Record<string, boolean>
  const role = String(profile.role || '')
  if (permissions['lesson_plans.ai'] !== true && role !== 'direction') {
    return json({ error: 'Permissão lesson_plans.ai obrigatória.' }, 403)
  }
  if (!['teacher', 'leader', 'direction'].includes(role)) {
    return json({ error: 'Perfil não autorizado para Lesson Plans.' }, 403)
  }
  return { id: profile.id, email: profile.email, role, permissions }
}

function buildPrompt(payload: LessonPayload) {
  const action = String(payload.action || 'general')
  const stageKey = String(payload.stageKey || '')
  const course = payload.course || {}
  const unit = payload.unit || {}
  const lesson = payload.lesson || {}
  const plan = payload.plan || {}

  return `
Você é o Assistente Purple do módulo Lesson Plans da Purple Idiomas.

Contexto obrigatório:
- Método R.A.P.I.D.: ${RAPID_TEXT}
- Lesson Flow: Presentation, Practice, Review, Production, Closing
- Nunca gere uma aula genérica.
- Sempre responda de forma curta, prática e aplicável.
- Explique em uma frase como a sugestão fortalece o Método R.A.P.I.D.
- Nunca publique automaticamente. O resultado nasce como rascunho gerado por IA.

Curso: ${JSON.stringify(course)}
Mapa da unidade: ${JSON.stringify(unit)}
Aula: ${JSON.stringify(lesson)}
Planejamento atual: ${JSON.stringify(plan)}
Ação pedida: ${action}
Etapa-alvo: ${stageKey || 'não especificada'}

Responda SOMENTE em JSON válido com este formato:
{
  "title": "título curto",
  "rationale": "explicação curta mencionando o princípio R.A.P.I.D. fortalecido",
  "preview": "texto curto pronto para leitura humana",
  "kind": "stage_patch",
  "stageKey": "${stageKey || 'production'}",
  "fields": {
    "objective": "objetivo curto",
    "activity": "atividade curta",
    "instructions": "instruções curtas",
    "observations": "observação curta",
    "duration": 15,
    "interaction": "Pair work",
    "pages": "SB 10-11",
    "resources": ["recurso 1", "recurso 2"],
    "rapid": ["realLife", "active"]
  }
}
`
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const auth = await authorize(request)
  if (auth instanceof Response) return auth

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return json({ error: 'Assistente Purple ainda não configurado.' }, 503)

  let payload: LessonPayload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Payload inválido.' }, 400)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: buildPrompt(payload),
        text: {
          format: {
            type: 'json_schema',
            name: 'lesson_plan_suggestion',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'rationale', 'preview', 'kind', 'stageKey', 'fields'],
              properties: {
                title: { type: 'string' },
                rationale: { type: 'string' },
                preview: { type: 'string' },
                kind: { type: 'string', enum: ['stage_patch'] },
                stageKey: { type: 'string' },
                fields: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['objective', 'activity', 'instructions', 'observations', 'duration', 'interaction', 'pages', 'resources', 'rapid'],
                  properties: {
                    objective: { type: 'string' },
                    activity: { type: 'string' },
                    instructions: { type: 'string' },
                    observations: { type: 'string' },
                    duration: { type: 'number' },
                    interaction: { type: 'string' },
                    pages: { type: 'string' },
                    resources: { type: 'array', items: { type: 'string' } },
                    rapid: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      }),
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      return json({ error: `OpenAI indisponível: ${errorText}` }, 502)
    }

    const body = await response.json()
    const output = body?.output?.[0]?.content?.[0]?.text
    if (!output) return json({ error: 'A IA não retornou conteúdo utilizável.' }, 502)

    try {
      return json(JSON.parse(output))
    } catch {
      return json({ error: 'A IA retornou uma resposta inválida.' }, 502)
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return json({ error: 'Tempo limite excedido ao chamar o Assistente Purple.' }, 504)
    }
    return json({ error: `Falha ao gerar sugestão: ${error instanceof Error ? error.message : String(error)}` }, 500)
  }
})
