# Purple Gestão — Production State C Runbook

Data de referência: 2026-08-28
Objetivo: Estado B -> Estado C
Projeto esperado: `qqlymzyvvgmbyuhswipp`

## Escopo

- freeze curto de escrita acadêmica
- backfill acadêmico
- reconciliação acadêmica
- validação GO/NO-GO

Sem cutover.

## Arquivos

- `supabase/phase2_1/01_preflight_readonly.sql`
- `supabase/phase2_1/03_academic_backfill.sql`
- `supabase/phase2_1/04_academic_reconciliation_readonly.sql`
- `supabase/phase2_1/06_cutover_validation_readonly.sql`

## Sequência futura

1. Confirmar novamente `qqlymzyvvgmbyuhswipp`
2. Confirmar backup anterior ao Estado C
3. Executar `01_preflight_readonly.sql`
4. Iniciar freeze curto de escrita acadêmica
5. Executar backfill na ordem:
   - `teachers`
   - `classes`
   - `students`
6. Executar reconciliação acadêmica
7. Validar fingerprint e integridade
8. Executar validação de cutover
9. Validar app legado ainda operacional
10. Encerrar freeze
11. `STOP`

## Critérios de PASS do Estado C

- 100% elegíveis reconciliados
- `MISSING_IN_TYPED = 0`
- `DUPLICATED_IN_TYPED = 0`
- `ORPHAN_TEACHER_LINK = 0`
- `ORPHAN_CLASS_LINK = 0`
- fingerprint compatível
- legado intacto
- tipado íntegro
- RLS validada
- `ACADEMIC_SOURCE` continua `APP_RECORDS`

## NO-GO

Se qualquer critério falhar:

1. parar imediatamente
2. manter `ACADEMIC_SOURCE = APP_RECORDS`
3. não corrigir “na corrida” em produção
4. levar o diagnóstico para shadow
5. corrigir script/teste
6. só voltar após novo ensaio

## STOP point

Se tudo passar:

- `ESTADO C VALIDADO — AGUARDANDO AUTORIZAÇÃO DE CUTOVER`
