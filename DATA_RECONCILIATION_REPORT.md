# DATA RECONCILIATION REPORT — FASE 1.5

Data da inspeção: 2026-08-28  
Modo: produção read-only

## Regra de leitura deste relatório

Este relatório separa:

- `CONFIRMADO`: medido no banco real por SELECT;
- `NÃO VALIDADO`: exigiria privilégio não disponível;
- `NÃO ENCONTRADO NO ESCOPO TESTADO`: objeto não apareceu no schema cache exposto aos perfis autenticados usados.

Nenhum dado pessoal foi incluído.

## Perfis reais usados na inspeção

- `pedagogico@purple.com.br` — autenticou com sucesso
- `retencao@purple.com.br` — autenticou com sucesso

Não autenticaram com a credencial disponível:

- `direcao@purple.com.br`
- `financeiro@purple.com.br`
- `consulta@purple.com.br`

Por isso, contagens globais que dependeriam de visão de Direção ficaram parcialmente não validadas.

## Contagens reais confirmadas

### Profiles

- `profiles` visíveis por sessão: `1` por perfil testado

### App Records — visibilidade real por perfil

Perfil `pedagogico`:

- total visível: `479`
- `audit`: `305`
- `case`: `1`
- `class`: `5`
- `notification_reads`: `1`
- `settings`: `1`
- `student`: `159`
- `teacher`: `7`

Perfil `retencao`:

- total visível: `496`
- `action`: `2`
- `audit`: `318`
- `case`: `1`
- `class`: `5`
- `notification_reads`: `1`
- `report`: `2`
- `settings`: `1`
- `student`: `159`
- `teacher`: `7`

Contagens específicas confirmadas no perfil `retencao`:

| kind | contagem visível |
|---|---:|
| `student` | 159 |
| `class` | 5 |
| `teacher` | 7 |
| `financial_entry` | 0 |
| `report` | 2 |
| `action` | 2 |
| `meeting` | 0 |
| `audit` | 318 |
| `settings` | 1 |
| `notification_reads` | 1 |
| `case` | 1 |

### Tabelas tipadas e operacionais

| Entidade | Resultado real observado |
|---|---|
| `students` | TABLE_NOT_FOUND administrativamente |
| `classes` | TABLE_NOT_FOUND administrativamente |
| `teachers` | TABLE_NOT_FOUND administrativamente |
| `financial_charges` | 8 linhas administrativamente |
| `financial_payments` | 0 linhas administrativamente |
| `financial_ledger_entries` | TABLE_NOT_FOUND administrativamente |
| `integrated_cases` | TABLE_NOT_FOUND administrativamente |
| `inventory_items` | 0 linhas visíveis |
| `production_books` | 0 linhas visíveis |
| `production_book_orders` | 2 linhas administrativamente |

Atualização administrativa confirmada:

- `production_books`: `15`
- `production_book_order_items`: `12`
- `production_book_order_recipients`: `TABLE_NOT_FOUND`

## Reconciliação acadêmica

### Students

| Campo | Resultado |
|---|---|
| Canônico tipado | `TABLE_NOT_FOUND` |
| Legado (`app_records.kind='student'`) | `159` confirmados |
| Só no tipado | `0` |
| Só no legado | `159` |
| Em ambos e iguais | `0` |
| Em ambos com divergência | `0` |
| Duplicados | `0` grupos de identificador duplicado no legado visível |
| Sem identificador confiável | `0` no legado visível |
| Ação recomendada | migration acadêmica bloqueada; tabela base não existe |

### Classes

| Campo | Resultado |
|---|---|
| Canônico tipado | `TABLE_NOT_FOUND` |
| Legado (`app_records.kind='class'`) | `5` confirmados |
| Só no tipado | `0` |
| Só no legado | `5` |
| Em ambos e iguais | `0` |
| Em ambos com divergência | `0` |
| Duplicados | não identificados no recorte visível |
| Sem identificador confiável | não identificados no recorte visível |
| Ação recomendada | bloquear migration acadêmica até comprovar tabela `classes` real |

### Teachers

| Campo | Resultado |
|---|---|
| Canônico tipado | `TABLE_NOT_FOUND` |
| Legado (`app_records.kind='teacher'`) | `7` confirmados |
| Só no tipado | `0` |
| Só no legado | `7` |
| Em ambos e iguais | `0` |
| Em ambos com divergência | `0` |
| Duplicados | não identificados no recorte visível |
| Sem identificador confiável | não identificados no recorte visível |
| Ação recomendada | bloquear migration acadêmica até comprovar tabela `teachers` real |

## Reconciliação financeira

Resultado administrativo real:

- `financial_charges`: `8`
- `financial_payments`: `0`
- `app_records(kind='financial_entry')`: `8`
- `financial_ledger_entries`: `TABLE_NOT_FOUND`
- status em `financial_charges`:
  - `PENDING`: `6`
  - `CANCELED`: `2`

Com isso, não foi possível confirmar em produção:

- match entre canônico e legado;
- presença de `asaas_id`, divergência de valor, vencimento, status, desconto ou competência.

Classificação:

- reconciliação financeira global: `NÃO VALIDADA`
- risco para migration financeira: `ALTO`, porque a ausência de linhas visíveis não prova ausência global

Ação recomendada:

- não executar migration financeira em produção sem leitura administrativa agregada de `financial_charges`, `financial_payments` e `financial_ledger_entries`.

## Follow-up

Inspeção feita sobre `app_records(kind='student')` visíveis:

- alunos legados visíveis: `159`
- alunos com `followUpEntries`: `0`
- alunos com `timeline`: `23`
- total de entradas em `timeline` encontradas nesse recorte: `23`
- total de entradas em `followUpEntries`: `0`
- entradas sem data: `0` em `followUpEntries` porque não houve nenhuma
- entradas sem autor: `0` em `followUpEntries` porque não houve nenhuma
- entradas sem vínculo técnico com aluno: `0` em `followUpEntries` porque não houve nenhuma

Conclusão:

- o conteúdo de follow-up real visível hoje está concentrado em `timeline`, não em `followUpEntries`;
- isso foi reforçado administrativamente: `23` alunos com `timeline` e `0` com `followUpEntries`;
- a migration preparada de `student_followups` faz backfill apenas de `students.data.followUpEntries`;
- portanto, no estado real observado, a migration 4 não reconcilia o conteúdo histórico visível em `timeline`.

Ação recomendada:

- ajustar o plano de backfill para cobrir `timeline` e classificar entradas ambíguas em revisão manual.

## Settings / TWR / Class Opening

Registro visível:

- `app_records(id='settings-default', kind='settings')`

Chaves de topo observadas:

- `biweeklyDeadline`
- `cacheVersion`
- `classHolidays`
- `criticalGroups`
- `databaseVersion`
- `delinquencyAlert`
- `deploymentDate`
- `lastSync`
- `lockApproved`
- `monthlyDeadline`
- `notifications`
- `rematriculationTarget`
- `reportDay`
- `requireApproval`
- `retentionRisk`
- `schoolName`
- `version`
- `weeklyDeadline`

Achado confirmado:

- `settings.twr`: não encontrado no registro de settings visível
- `settings.twr.classOpening`: não encontrado no registro de settings visível
- `rows_with_twr`: `0`
- `rows_with_class_opening`: `0`

Conclusão:

- não há evidência, no recorte real visível, de payload TWR/Class Opening dentro de `settings-default`;
- isso não prova inexistência global absoluta, mas impede validar backfill a partir desse caminho com as credenciais disponíveis.

## Book Production

Objetos principais V1/V2 visíveis no schema exposto:

- `production_books`
- `production_book_print_specs`
- `production_print_profiles`
- `production_print_profile_ranges`
- `production_book_progressions`
- `production_book_orders`
- `production_book_order_classes`
- `production_book_order_students`
- `production_book_order_items`
- `production_book_order_spec_snapshots`
- `production_book_order_status_history`

Objeto V3 não visível:

- `production_book_order_recipients`

Conclusão técnica estrita:

- a ausência de `production_book_order_recipients` e de `create_production_book_order_v3` foi confirmada;
- `production_books`: `15`
- `production_book_orders`: `2`
- `production_book_order_items`: `12`
- porém, pelo código atual, isso não explica sozinho um erro de loading do módulo, porque:
  - `production_book_order_recipients` é tratado como tabela opcional;
  - a falta do RPC V3 tem fallback específico apenas na criação de pedido, não no carregamento inicial.

Status final sobre a causa do loading:

- `CAUSA CONFIRMADA`: `NÃO`
- fatos confirmados:
  - V3 não está materializado/exposto;
  - tabelas principais de leitura do módulo existem no schema exposto;
  - o loading não pode ser atribuído tecnicamente apenas à ausência da V3.

## Ações recomendadas por entidade

| Entidade | Canônico | Legado | Match | Divergente | Órfão | Ambíguo | Ação recomendada |
|---|---:|---:|---:|---:|---:|---:|---|
| Students | não validado | 159 | não validado | não validado | não validado | não validado | bloquear migration 2 e 4 até introspecção administrativa |
| Classes | não validado | 5 | não validado | não validado | não validado | não validado | bloquear migration 2 |
| Teachers | não validado | 7 | não validado | não validado | não validado | não validado | bloquear migration 2 e 5 |
| Financeiro | não validado | 0 legado visível | não validado | não validado | não validado | não validado | não migrar sem leitura administrativa agregada |
| Follow-up | não validado | timeline em 23 alunos | 0 | potencial | potencial | alto | revisar backfill para incluir timeline |
| TWR | não validado | 0 visível em settings | 0 | 0 | 0 | médio | confirmar payload real antes de migrar |
| Class Opening | não validado | 0 visível em settings | 0 | 0 | 0 | médio | confirmar payload real antes de migrar |
