# Purple Gestão — Transition Architecture

Data de referência: 2026-08-28

## Decisão-base

A Fase 1.5B passa a ser a fonte de verdade do estado atual de produção.

Hoje:

- `app_records(kind='student')` = fonte acadêmica real
- `app_records(kind='class')` = fonte acadêmica real
- `app_records(kind='teacher')` = fonte acadêmica real
- `app_records(kind='financial_entry')` = legado financeiro real coexistindo com `financial_charges`
- `app_records(kind='case')` = caso integrado real ainda não tipado

Portanto, `app_records` não é fallback acadêmico nesta fase. É canônico.

## Estados da transição

### ESTADO A — Produção atual

- acadêmico canônico em `app_records`
- financeiro híbrido: `financial_charges` + `app_records(kind='financial_entry')`
- follow-up embutido no payload legado do aluno
- casos integrados ainda legados
- TWR e Class Opening sem persistência tipada real

### ESTADO B — Tabelas novas criadas

- novas tabelas tipadas existem
- `app_records` continua canônico
- frontend continua lendo do legado acadêmico
- nenhuma escrita permanente em dual-write cego

### ESTADO C — Backfill + validação

- tabelas novas recebem cópia determinística
- `legacy_record_id` preserva rastreabilidade
- contagens obrigatórias:
  - 159 students origem → 159 destino
  - 5 classes origem → 5 destino
  - 7 teachers origem → 7 destino
- divergências param o processo

### ESTADO D — Cutover controlado

- leitura/escrita do acadêmico passa para tabelas tipadas
- `app_records` acadêmico fica legado read-only
- gravação passa por operação transacional única

### ESTADO E — Remoção futura do legado

- só após janela de estabilidade
- exige backup, rollback e reconciliação verde

## Estratégia de gravação de transição

Não adotar dual-write cego no frontend.

Escolha recomendada:

1. Estado A/B/C: frontend continua escrevendo apenas no legado acadêmico.
2. Backfill roda separadamente e de forma auditável.
3. No cutover, substituir a gravação por RPC transacional única no banco.
4. Após estabilização, bloquear escrita acadêmica em `app_records`.

Motivo:

- evita “salvou em `students` e falhou em `app_records`”
- evita “salvou em `app_records` e falhou em `students`”
- centraliza consistência no banco no momento do cutover, não antes

## Relacionamentos seguros hoje

Confirmado no payload real:

- `class.teacherId`: 5/5 e com correspondência real a professor legado
- `student.classId`: 23/159 e com correspondência real a turma legado
- `student.teacherId`: 0/159

Decisão:

- `classes.teacher_id` pode existir como FK opcional segura
- `students.class_id` pode existir como FK opcional segura
- não criar `students.teacher_id` como FK canônica nesta fase

## Contrato de identidade

Toda tabela nova desta fase deve possuir:

- `id uuid primary key`
- `legacy_record_id text unique`
- `data jsonb not null default '{}'::jsonb`
- `created_at`
- `updated_at`

`legacy_record_id` é obrigatório para reconciliação e rollback lógico.

## RLS-alvo desta fase

Princípio:

- banco e frontend compartilham o mesmo contrato
- evitar `authenticated = tudo`

Contrato mínimo recomendado:

- leitura acadêmica: `public.has_permission('panel.view')`
- escrita acadêmica: `public.is_direction() or not public.is_viewer()`
- financeiro: alinhar a `financial.*`
- casos integrados: manter por RPC segura
- TWR / Class Opening: por permissões específicas do domínio

## Critérios objetivos para cutover acadêmico

O cutover acadêmico só pode ocorrer se:

- 159/159 students reconciliados
- 5/5 classes reconciliadas
- 7/7 teachers reconciliados
- zero órfãos não explicados
- `legacy_record_id` validado em 100%
- `classes.teacher_id` preservado
- `students.class_id` preservado quando houver origem
- CRUD tipado testado
- reload/persistência testados
- suíte verde
- backup confirmado
- rollback preparado

## Critérios objetivos para cutover financeiro

- 8/8 `financial_charges` reconciliadas com 8 legados
- zero `typed_only`
- zero `legacy_only`
- reconciliação de valor, vencimento, competência, desconto e parcela validada
- política para `financial_payments = 0` formalizada
- `financial_ledger_entries` modelado e testado
- RLS alinhado a `financial.*`
- suíte verde
- backup confirmado
- rollback preparado
