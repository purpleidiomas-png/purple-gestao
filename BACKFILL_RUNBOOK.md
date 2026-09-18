# Purple Gestão — Backfill Runbook

Data de referência: 2026-08-28

## Objetivo da Fase 2.1

Preparar o ensaio de backfill e reconciliação sem executar nada em produção.

Escopo principal desta fase:

- acadêmico: `teachers`, `classes`, `students`
- financeiro: `financial_charges` e legado `app_records(kind='financial_entry')`

## Ordem futura obrigatória

1. `teachers`
2. `classes`
3. `students`

Motivo:

- `classes.teacherId` é vínculo confiável 5/5
- `students.classId` é vínculo confiável quando presente, em 23/159
- `students` depende de `classes`
- `classes` depende de `teachers`

## Sequência operacional planejada

### 01 — Preflight read-only

Executar:

- [01_preflight_readonly.sql](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/phase2_1/01_preflight_readonly.sql)

Objetivo:

- comparar baseline da auditoria de 2026-08-28 com as contagens reais do momento
- não limitar o backfill aos IDs conhecidos hoje

### 02 — Schema acadêmico

Referência:

- [20260828_academic_transition_v2.sql](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/migrations/20260828_academic_transition_v2.sql)

Objetivo:

- criar as tabelas de destino do Estado B

### 03 — Backfill acadêmico

Executar futuramente:

- [03_academic_backfill.sql](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/phase2_1/03_academic_backfill.sql)

Comportamento esperado:

- idempotente por `legacy_record_id`
- nunca usa nome como identidade
- preserva JSON em `data`
- aborta se encontrar vínculo inválido entre turma e professor

### 04 — Reconciliação acadêmica

Executar:

- [04_academic_reconciliation_readonly.sql](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/phase2_1/04_academic_reconciliation_readonly.sql)

Critérios automáticos de bloqueio:

- `MISSING_IN_TYPED > 0`
- `DUPLICATED_IN_TYPED > 0`
- `ORPHAN_TEACHER_LINK > 0`
- `ORPHAN_CLASS_LINK > 0`

### 05 — Reconciliação financeira

Executar:

- [05_financial_reconciliation_readonly.sql](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/phase2_1/05_financial_reconciliation_readonly.sql)

Objetivo:

- revalidar o 8/8 sem assumir teto fixo

### 06 — Validação de cutover

Executar:

- [06_cutover_validation_readonly.sql](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/phase2_1/06_cutover_validation_readonly.sql)

Objetivo:

- consolidar GO / NO-GO
- separar claramente backfill de cutover

## Regras de segurança

- nunca apagar `app_records`
- nunca atualizar o legado de forma destrutiva
- nunca fazer `drop` do legado
- qualquer backfill incompleto pode ser abandonado sem afetar a operação atual

## Rollback conceitual do Estado C

Se o backfill falhar:

- `app_records` continua canônico
- os dados tipados são desconsiderados para o cutover
- o frontend não troca de fonte
- a correção ocorre no ensaio, não na operação da escola

## Resultado esperado da Fase 2.1

- kit de execução separado
- critérios de segurança objetivos
- reconciliação repetível
- contrato de cutover explícito
