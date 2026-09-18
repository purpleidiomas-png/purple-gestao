# Purple Gestão — Source of Truth

Data de referência: 2026-08-28

Status do baseline técnico antes desta fase:

- `node --test tests/*.test.js`
- 16/16 PASS na Fase 0

Princípio desta fase:

- cada entidade operacional deve convergir para uma fonte canônica;
- fallback pode existir, mas precisa ser explícito, rastreável e temporário;
- produção não pode trocar silenciosamente para dado demonstrativo.

## 1. Resumo executivo

Hoje o Purple Gestão está em estado híbrido controlado:

- diretórios acadêmicos (`students`, `classes`, `teachers`) fazem dual-write em tabela tipada + `app_records`;
- financeiro mistura `financial_charges` / `financial_payments` com `app_records(kind='financial_entry')`;
- TWR e Abertura de Turmas vivem em `settings.twr`;
- follow-up do aluno vive embutido no JSON do aluno (`followUpEntries` + `timeline`);
- casos integrados já têm fonte tipada (`integrated_cases` + `integrated_case_sector_details`);
- inventário, patrimônio, diário operacional e book production já têm backbone tipado mais claro.

Conclusão arquitetural:

- `app_records` deve permanecer para dados operacionais genéricos e auditoria leve;
- não deve continuar como fonte paralela permanente para diretórios acadêmicos e financeiro;
- TWR, Abertura de Turmas e Follow-up precisam sair do `settings`/JSON de aluno para estruturas tipadas.

## 2. Ambientes e comportamento esperado

| Ambiente | Fonte principal | Fallback permitido | Observação |
|---|---|---|---|
| Produção | Supabase Auth + tabelas/RPCs | Não para demo/local | Falha deve bloquear ou degradar com aviso explícito |
| Desenvolvimento | Supabase local/remoto de dev | Limitado e explícito | Pode usar recovery e diagnóstico |
| Diagnóstico | `defaultDB()` + login local | Sim | Somente host local/file e ação consciente |
| Teste | fixtures/mocks controlados | Sim | Determinístico |

## 3. Entidades operacionais

### STUDENTS

- Fonte atual:
  - `public.students`
  - `public.app_records(kind='student')`
  - `State.db.students`
- Fonte canônica proposta:
  - `public.students`
- Fallback atual:
  - fallback para `app_records` quando `students` não existe ou falha com `typedTableMissing`
  - `defaultDB()` em diagnóstico/teste
- Escritas existentes:
  - `saveStudentRecord()` → `saveDirectoryRecord('student','students',...)`
  - depois `saveTypedAppRecord('student', ...)`
- Leituras existentes:
  - `Storage.load()` lê `app_records` e `students`, depois faz `mergeRecords(...)`
- Dependências:
  - financeiro do aluno
  - TWR
  - class opening
  - WhatsApp/follow-up
  - book production
  - casos integrados indiretamente
- Dados legados:
  - `legacyId` no JSON
  - `followUpEntries`, `timeline`, dados financeiros e responsáveis dentro do JSON
- Risco de migração:
  - médio/alto, porque o JSON do aluno acumula subdomínios demais

### CLASSES

- Fonte atual:
  - `public.classes`
  - `public.app_records(kind='class')`
  - `State.db.classes`
- Fonte canônica proposta:
  - `public.classes`
- Fallback atual:
  - `app_records`
  - `defaultDB()`
- Escritas existentes:
  - `saveClassRecord()` → tabela tipada + `app_records`
- Leituras existentes:
  - merge entre `app_records` e `classes`
- Dependências:
  - students
  - TWR
  - class opening
  - book production
- Dados legados:
  - `scheduleBlocks`, `recessPeriods`, `bookId` e agregados operacionais no JSON
- Risco:
  - médio

### TEACHERS

- Fonte atual:
  - `public.teachers`
  - `public.app_records(kind='teacher')`
  - `State.db.teachers`
- Fonte canônica proposta:
  - `public.teachers`
- Fallback atual:
  - `app_records`
  - `defaultDB()`
- Escritas existentes:
  - `saveTeacherRecord()` → tabela tipada + `app_records`
- Leituras existentes:
  - merge entre `app_records` e `teachers`
- Dependências:
  - classes
  - TWR
  - class opening
- Dados legados:
  - `history`, `feedbacks`, `occurrences`, `score` no JSON
- Risco:
  - médio

### USERS / PROFILES

- Fonte atual:
  - `public.profiles`
  - Supabase Auth (`auth.users`)
- Fonte canônica proposta:
  - autenticação: `auth.users`
  - autorização/perfil: `public.profiles`
- Fallback atual:
  - `defaultDB().users` em diagnóstico
  - `legacySafePermissions()` quando migração granular não existe
- Escritas existentes:
  - login atualiza `last_login_at` por RPC
  - edição administrativa via perfil/RPC/edge
- Leituras existentes:
  - login/restauração de sessão
  - `Storage.load()` busca `profiles`
- Dependências:
  - tudo
- Dados legados:
  - modo “legacy-safe-fallback” no frontend
- Risco:
  - alto em produção se recovery/login local não ficar estritamente isolado

### FINANCIAL

- Fonte atual:
  - `public.financial_charges`
  - `public.financial_payments`
  - `public.app_records(kind='financial_entry')`
  - campos financeiros dentro do `student.data`
  - `State.db.financialEntries`
- Fonte canônica proposta:
  - cobrança/parcela: `public.financial_charges`
  - pagamento/fato financeiro: `public.financial_payments`
  - razão/espelho derivado: `public.financial_ledger_entries`
  - preferências do aluno: temporariamente em `students.data`, idealmente tabela própria no futuro
- Fallback atual:
  - `app_records(kind='financial_entry')`
  - modo diagnóstico
- Escritas existentes:
  - cobranças Asaas: Edge Functions + persistência local
  - manuais/históricas: `Storage.save(State.db)` / `saveFinancialRecord`
- Leituras existentes:
  - `Storage.load()` lê `financial_charges` + `financial_payments`, mistura com `app_records`
- Dependências:
  - students
  - Asaas
  - indicadores
  - retenção/casos
- Dados legados:
  - `financial_entry`
  - cálculos de `fullValue`, `punctualValue`, `discountValue`, `installment*`, `origin`
- Risco:
  - alto

### FOLLOW-UP

- Fonte atual:
  - `students.data.followUpEntries`
  - `students.data.timeline`
  - eventos produzidos por WhatsApp/TWR/manual
- Fonte canônica proposta:
  - nova tabela `student_followups`
- Fallback atual:
  - embutido no aluno
- Escritas existentes:
  - WhatsApp `saveServiceFollowUp()`
  - TWR `completeTwrAttendance()`
  - inserções diretas em `student.timeline`
- Leituras existentes:
  - tela de aluno e fluxos derivados
- Dependências:
  - students
  - TWR
  - WhatsApp
  - retenção
- Dados legados:
  - múltiplos formatos de datas/campos
- Risco:
  - alto por duplicidade semântica

### INVENTORY

- Fonte atual:
  - `public.inventory_items`
  - `public.book_movements`
- Fonte canônica proposta:
  - manter tipada atual
- Fallback atual:
  - indisponibilidade controlada quando migrations faltam
- Escritas existentes:
  - RPCs de inventário
- Leituras existentes:
  - consultas diretas + módulo book production
- Dependências:
  - book production
  - class opening
- Dados legados:
  - baixos
- Risco:
  - baixo

### BOOK PRODUCTION

- Fonte atual:
  - `production_*` tables
  - snapshots/referências para `app_records(id)` em students/classes nos pedidos
- Fonte canônica proposta:
  - manter `production_*` tipado
  - trocar referência textual a `app_records(id)` por vínculo estável com diretórios canônicos
- Fallback atual:
  - tolerância apenas para tabela opcional `production_book_order_recipients`
  - fallback legado apenas para pedido STOCK via RPC antiga
- Escritas existentes:
  - RPCs `create_production_book_order(_v3)`, `advance_production_book_order_status`, `save_production_*`
- Leituras existentes:
  - `modules/book-production.js` carrega `production_*`
- Dependências:
  - inventory
  - students/classes
  - profiles
- Dados legados:
  - pedidos V1 referenciando `app_records`
- Risco:
  - médio

### TWR

- Fonte atual:
  - `State.db.settings.twr`
  - `defaultDB()` / dados acadêmicos derivados
- Fonte canônica proposta:
  - tabelas tipadas próprias de TWR
- Fallback atual:
  - `settings.twr`
  - dados acadêmicos atuais
- Escritas existentes:
  - `Storage.save(State.db)` em `settings`
- Leituras existentes:
  - renderização da tela TWR
- Dependências:
  - teachers
  - classes
  - students
  - follow-up
- Dados legados:
  - jornadas, atividades, drafts, histórico tudo dentro de settings JSON
- Risco:
  - alto

### CLASS OPENING

- Fonte atual:
  - `settings.twr.classOpening`
- Fonte canônica proposta:
  - tabelas tipadas próprias, ligadas opcionalmente a `classes`
- Fallback atual:
  - `settings`
- Escritas existentes:
  - `Storage.save(State.db)`
- Leituras existentes:
  - tela de Abertura de Turmas
- Dependências:
  - TWR
  - classes
  - inventory/books
- Dados legados:
  - checklist, histórico, exceções e status no JSON
- Risco:
  - alto

### INTEGRATED CASES

- Fonte atual:
  - `public.integrated_cases`
  - `public.integrated_case_sector_details`
  - RPCs `list_integrated_cases` / `save_integrated_case`
- Fonte canônica proposta:
  - manter tipada atual
- Fallback atual:
  - leitura legacy `app_records(kind='case')` apenas direção quando migration pendente
- Escritas existentes:
  - exclusivamente RPC segura
- Leituras existentes:
  - RPC segura
- Dependências:
  - profiles
  - RLS
- Dados legados:
  - `app_records(kind='case')`
- Risco:
  - baixo/médio

### AUDIT

- Fonte atual:
  - `app_records(kind='audit')`
  - `permission_audit`
  - `financial_charge_audit`
  - produção de livros com histórico próprio
- Fonte canônica proposta:
  - manter audit distribuído por domínio
  - `app_records(kind='audit')` apenas para eventos gerais de UI/sessão
- Fallback atual:
  - evento local sem persistência quando remoto indisponível
- Escritas existentes:
  - `logAudit()`
  - trigger/function de permissão
  - auditoria financeira
- Leituras existentes:
  - tela Audit
- Risco:
  - médio

## 4. App Records

Tipos observados em contrato/migrações/código:

- `report`
- `action`
- `case`
- `meeting`
- `audit`
- `settings`
- `notification_reads`
- `student`
- `class`
- `teacher`
- `financial_entry`

Classificação recomendada:

| Kind | Situação | Classificação |
|---|---|---|
| report | dado operacional genérico | MANTER |
| action | dado operacional genérico | MANTER |
| case | legado preservado, já substituído por tipado | LEGADO A DESATIVAR |
| meeting | dado operacional genérico | MANTER |
| audit | auditoria leve de frontend/sessão | MANTER |
| settings | configuração global e provisórios | MANTER agora / reduzir escopo |
| notification_reads | preferência por usuário | MANTER |
| student | duplicado com tabela tipada | MIGRAR PARA TABELA TIPADA |
| class | duplicado com tabela tipada | MIGRAR PARA TABELA TIPADA |
| teacher | duplicado com tabela tipada | MIGRAR PARA TABELA TIPADA |
| financial_entry | duplicado com tipado financeiro | MIGRAR PARA TABELA TIPADA |

## 5. DefaultDB / Seeds / Diagnóstico

Situação atual:

- `defaultDB()` mistura seed operacional, configuração base e modo diagnóstico;
- `auth/bootstrap.js` e `app.js` têm caminhos de recovery/local login;
- `canUseDiagnosticFallback()` já limita fallback automático a host local/file;
- `restorePersistedSession()` ainda reidrata `defaultDB()` quando há snapshot local.

Decisão arquitetural:

- Produção: nunca cair para `defaultDB()`
- Desenvolvimento: permitido somente com banner explícito e `environment=development`
- Diagnóstico: permitido somente com `environment=diagnostic`
- Teste: fixtures determinísticas, sem depender de host real

## 6. Auth / Recovery Mode

Fluxo atual:

- login → Supabase Auth
- restauração → `Storage.load()`
- perfil → `profiles`
- permissões → `normalizeAccessProfile()` + `effectiveProfilePermissions()`
- UI → `can(permission)`
- backend → RLS e RPCs

Problema central:

- o app ainda carrega um caminho de login local de diagnóstico no bundle principal;
- isso é aceitável localmente, mas precisa ser explicitamente bloqueado em produção por ambiente, não só por host.

Decisão:

- recovery mode em produção deve ser somente leitura diagnóstica / erro controlado;
- login local deve existir apenas em `development`/`diagnostic`;
- sessão persistida local não pode substituir sessão remota inválida em produção.

## 7. Divergências arquiteturais críticas

1. Diretórios acadêmicos ainda fazem dual-write.
2. Financeiro ainda tem duas fontes para a mesma cobrança/parcela.
3. Follow-up do aluno não tem tabela própria.
4. TWR e Class Opening vivem em `settings`.
5. UI usa permissões de TWR/Class Opening que não estão materializadas de forma equivalente no backend.
6. Book Production ainda referencia `app_records(id)` para students/classes.

## 8. Recomendação final de convergência

Ordem de fonte canônica:

1. `profiles` + Auth
2. `students`, `classes`, `teachers`
3. `financial_charges` / `financial_payments` / `financial_ledger_entries`
4. `student_followups`
5. `twr_*`
6. `class_opening_*`
7. `production_*` desacoplado de `app_records`
8. `app_records` reduzido aos usos genéricos
