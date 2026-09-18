# Purple Gestão — Production State B Runbook

Data de referência: 2026-08-28
Objetivo: Estado A -> Estado B
Projeto esperado: `qqlymzyvvgmbyuhswipp`

## Escopo

Criar apenas as estruturas acadêmicas tipadas.

Arquivo:

- `supabase/migrations/20260828_academic_transition_v2.sql`

## O que muda

Cria:

- `public.teachers`
- `public.classes`
- `public.students`

Cria/ajusta nesses objetos:

- PKs
- FKs
- `legacy_record_id`
- índices
- triggers
- RLS
- policies
- grants

## O que NÃO muda

- `app_records`
- `ACADEMIC_SOURCE`
- frontend autorizado
- backfill
- financeiro
- Book Production
- Asaas
- deploy

## Pré-condições obrigatórias

- preflight concluído
- project ref guard PASS
- backup confirmado
- schema drift classificado
- compatibilidade do app com Estado B = PASS

## Sequência futura

1. Confirmar `qqlymzyvvgmbyuhswipp`
2. Confirmar backup anterior
3. Rodar `01_preflight_readonly.sql`
4. Classificar drift
5. Executar `20260828_academic_transition_v2.sql`
6. Validar objetos criados
7. Validar índices e constraints
8. Validar RLS e policies
9. Validar que `app_records` segue intacto
10. Validar que `ACADEMIC_SOURCE` continua `APP_RECORDS`
11. Smoke test do app atual
12. `STOP`

## Critérios de PASS do Estado B

- tabelas existem
- constraints corretas
- índices corretos
- RLS correta
- `app_records` intacto
- contagens legadas intactas
- app atual continua funcionando
- nenhum erro crítico
- `ACADEMIC_SOURCE` continua `APP_RECORDS`

## STOP point

Se tudo passar:

- `ESTADO B VALIDADO — AGUARDANDO AUTORIZAÇÃO DO ESTADO C`

## Abort conditions

- project ref divergente
- backup não confirmado
- drift incompatível
- falha na migration
- RLS/policies divergentes
- app mudar de comportamento por mera existência das tabelas

## Rollback do Estado B

Como procedimento operacional:

- não avançar para Estado C
- manter `APP_RECORDS` como fonte acadêmica
- diagnosticar e corrigir em shadow

Observação:

- rollback estrutural destrutivo não deve ser improvisado na janela;
- se o bloqueio for de compatibilidade do app, a ação correta é parar antes de seguir.
