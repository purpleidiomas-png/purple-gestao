# Purple Gestão — Production Change Plan

Data de referência: 2026-08-28
Projeto oficial de produção: `qqlymzyvvgmbyuhswipp`

## Resultado operacional desta fase

O plano operacional ficou pronto, mas o **CHANGE 1 ainda não está autorizado**.

Motivo:

- existe um bloqueador P0 de compatibilidade do app com o Estado B;
- hoje o frontend tenta gravar em `students`, `classes` e `teachers` assim que essas tabelas existem;
- isso viola a exigência de que o Estado B crie estrutura sem mudar o fluxo acadêmico ativo.

## Menor escopo seguro recomendado

### CHANGE 1 — ESTADO B

Escopo recomendado:

- somente acadêmico estrutural
- sem financeiro
- sem follow-up
- sem integrated cases
- sem TWR
- sem class opening
- sem Book Production

Migration candidata:

- `supabase/migrations/20260828_academic_transition_v2.sql`

Status atual:

- tecnicamente preparada
- operacionalmente **bloqueada** até corrigir o app guard de fonte acadêmica

### CHANGE 2 — ESTADO C

Escopo recomendado:

- backfill acadêmico
- reconciliação acadêmica
- validação GO/NO-GO
- `ACADEMIC_SOURCE` continua `APP_RECORDS`

Arquivos operacionais:

- `supabase/phase2_1/03_academic_backfill.sql`
- `supabase/phase2_1/04_academic_reconciliation_readonly.sql`
- `supabase/phase2_1/06_cutover_validation_readonly.sql`

### CHANGE 3 — CUTOVER

Escopo:

- autorização humana separada
- troca explícita `APP_RECORDS -> TYPED`
- smoke tests reais
- rollback inicial por feature flag

## Migrations avaliadas para CHANGE 1

| Arquivo | Entraria no CHANGE 1? | Motivo |
| --- | --- | --- |
| `20260828_academic_transition_v2.sql` | SIM | cria apenas estrutura acadêmica tipada |
| `20260828_academic_rpc_v1.sql` | NÃO | introduz novo caminho de escrita e feature flag; melhor deixar para etapa pré-cutover |
| `20260828_financial_transition_v2.sql` | NÃO | aumenta blast radius e pode ficar em change próprio |
| `20260828_student_followups_v2.sql` | NÃO | depende do domínio acadêmico já estabilizado |
| `20260828_integrated_cases_v2.sql` | NÃO | domínio separado; manter isolado |
| `20260828_twr_v2.sql` | NÃO | domínio novo e independente |
| `20260828_class_opening_v2.sql` | NÃO | domínio novo e independente |

## Dependências do CHANGE 1

`20260828_academic_transition_v2.sql` depende de objetos já existentes no projeto:

- `public.touch_updated_at()`
- `public.has_permission(text)`
- `public.is_direction()`
- `public.is_viewer()`
- role `authenticated`

## Blast radius recomendado

Baixo, se e somente se o guard do app for corrigido antes:

- cria `public.teachers`
- cria `public.classes`
- cria `public.students`
- cria índices, triggers, grants e policies dessas três tabelas
- não altera `app_records`
- não altera financeiro
- não altera Book Production
- não altera Asaas

## Project ref guard obrigatório

Antes de qualquer comando futuro de escrita:

1. confirmar visualmente e por CLI o project ref alvo;
2. o valor deve ser exatamente `qqlymzyvvgmbyuhswipp`;
3. qualquer divergência = `ABORT`.

## Schema drift strategy

Classificação obrigatória imediatamente antes de qualquer change:

- `SAFE DRIFT`: novos objetos não usados pela mudança, sem conflito de nomes/contratos
- `REVIEW REQUIRED`: novas colunas, grants, RLS, RPCs ou índices que possam alterar comportamento esperado
- `ABORT`: mudança incompatível com migration, com backfill, com RLS, ou com o contrato do app

## Freeze strategy recomendada para Estado C

Recomendação: opção A, freeze curto de escrita acadêmica por poucos minutos.

Motivo:

- volume atual é baixo;
- é mais simples e confiável que backfill incremental final;
- evita janela em que novos alunos/turmas/professores surgem durante a cópia.

Procedimento futuro:

1. comunicar janela curta;
2. pausar escrita acadêmica;
3. executar backfill e reconciliação;
4. validar;
5. liberar operação mantendo `APP_RECORDS`.

## Feature flag storage plan

Plano aprovado conceitualmente:

- tabela `public.runtime_flags`
- chave `ACADEMIC_SOURCE`
- leitura por função explícita `public.current_academic_source()`
- alteração restrita à Direção com permissão de configuração
- trilha de auditoria por `updated_at` e `updated_by`

Observação:

- esse armazenamento está validado no shadow;
- não deve ser aplicado em produção no CHANGE 1.

## App compatibility com Estado B

Status: **FAIL / P0**

Evidência no código atual:

- `Storage.load()` consulta `students`, `classes` e `teachers` sempre que as tabelas existem;
- `saveDirectoryRecord()` faz `upsert` em tabela tipada antes de salvar em `app_records`;
- isso cria dual-write implícito assim que o Estado B existir.

Consequência:

- o CHANGE 1 não deve ser executado em produção antes da correção explícita desse guard.

## Decisão humana necessária após esta fase

1. autorizar correção do app guard para manter `APP_RECORDS` como fonte efetiva no Estado B;
2. depois rerodar a checagem de compatibilidade;
3. só então autorizar CHANGE 1.
