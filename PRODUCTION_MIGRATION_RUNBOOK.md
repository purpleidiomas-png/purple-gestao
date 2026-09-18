# PRODUCTION MIGRATION RUNBOOK — FASE 1.5

Este runbook ainda não autoriza execução.  
Ele define o procedimento futuro mínimo para uma janela segura.

## Status atual

Em 2026-08-28, a Fase 1.5 ficou apenas parcialmente validada.

Motivos:

- schema real completo não pôde ser inspecionado com credencial administrativa read-only;
- shadow database não estava disponível neste ambiente;
- reconciliação acadêmica canônica não pôde ser comprovada;
- reconciliação financeira global não pôde ser comprovada.

## Pré-requisitos

Antes de qualquer execução em produção:

1. acesso read-only administrativo ao schema real;
2. backup confirmado do projeto Supabase de produção;
3. export lógico mínimo das tabelas afetadas;
4. confirmação explícita da janela de manutenção;
5. shadow/staging com schema clonado para teste prévio;
6. baseline de testes do app em `20/20 PASS`;
7. confirmação de que nenhuma migration concorrente será aplicada na mesma janela.

## Backup

Obrigatório antes da execução:

- snapshot/backup do banco inteiro;
- export dedicado de:
  - `profiles`
  - `app_records`
  - `students`
  - `classes`
  - `teachers`
  - `financial_charges`
  - `financial_payments`
  - `financial_ledger_entries` se existir
  - `integrated_cases`
  - `integrated_case_sector_details`
  - tabelas `production_*`
- registro do identificador do backup no changelog da janela.

Sem confirmação de backup, a execução deve ser abortada.

## Ordem das migrations

Ordem prevista:

1. `supabase/migrations_superseded/20260828_permission_defaults_twr_class_opening.sql`
2. `supabase/migrations_superseded/20260828_academic_source_of_truth_contract.sql`
3. `supabase/migrations_superseded/20260828_financial_source_of_truth_contract.sql`
4. `supabase/migrations_superseded/20260828_student_followups_v1.sql`
5. `supabase/migrations_superseded/20260828_twr_class_opening_v1.sql`

## Validação antes

Checklist obrigatório antes de rodar a primeira migration:

- confirmar existência real de `students`, `classes`, `teachers`;
- confirmar colunas reais atuais dessas três tabelas;
- confirmar existência e shape real de `financial_charges`;
- confirmar se `financial_ledger_entries` existe ou não;
- confirmar payload real de TWR e Class Opening;
- medir contagens globais:
  - `app_records` por `kind`
  - `students`
  - `classes`
  - `teachers`
  - `financial_charges`
  - `financial_payments`
  - `financial_ledger_entries`
- rodar reconciliação acadêmica e financeira agregada;
- validar policies reais versus `PERMISSIONS_MATRIX.md`;
- repetir smoke local do frontend.

## Execução

Procedimento:

1. congelar deploys concorrentes;
2. confirmar backup;
3. aplicar migration 1;
4. validar leitura de permissões/TWR/Class Opening;
5. aplicar migration 2;
6. não trocar frontend ainda;
7. aplicar migration 3;
8. validar constraints e índices criados;
9. aplicar migration 4;
10. aplicar migration 5;
11. executar backfills planejados e auditáveis;
12. rodar smoke test pós-migração.

## Backfill

Regras obrigatórias:

- determinístico;
- idempotente quando possível;
- sem sobrescrita silenciosa do dado mais confiável;
- registros ambíguos devem ir para revisão manual;
- todo passo deve produzir contagem antes/depois.

Backfills previstos:

### Acadêmico

- preencher `legacy_record_id` em `students`, `classes`, `teachers`;
- validar unicidade antes de criar índices únicos;
- se houver conflito de `legacy_record_id`, abortar criação do índice e classificar em revisão manual.

### Financeiro

- preencher campos derivados de `financial_charges` sem alterar valores originais;
- nunca substituir valor canônico por legado quando houver divergência;
- divergências de parcela devem ser marcadas para revisão manual.

### Follow-up

- revisar a migration 4 para incluir também `timeline`, não só `followUpEntries`, se isso for confirmado como fonte real relevante;
- entradas sem data/autor/vínculo devem ir para revisão manual.

### TWR / Class Opening

- só executar backfill após mapear payload real completo;
- se `settings.twr` estiver ausente ou variar por ambiente, abortar o backfill automático.

## Validação depois

Após cada migration:

- recontar objetos afetados;
- conferir índices esperados;
- conferir constraints esperadas;
- validar leitura pelas roles esperadas;
- confirmar que o app continua em `20/20 PASS`;
- validar que nenhuma tabela crítica desapareceu do schema cache exposto.

## Smoke test

Smoke mínimo após a janela:

1. login com Direção;
2. login com líder pedagógico;
3. login com líder de retenção;
4. leitura de alunos;
5. leitura de turmas;
6. leitura de professores;
7. leitura financeira;
8. leitura de casos integrados;
9. Book Production;
10. navegação geral sem erro JS;
11. PWA/service worker sem asset mismatch crítico.

## Rollback

Rollback só pode ser considerado pronto quando houver:

- backup confirmado;
- script de reversão para cada migration destrutivamente sensível;
- rollback testado em shadow/staging;
- critério claro de ponto de não retorno.

Estado atual do rollback: `PARCIALMENTE PRONTO`

Motivo:

- existe rollback apenas para parte de Book Production V2, não para todo o pacote da Fase 1;
- shadow test não pôde ser executado neste ambiente.

## Critérios de abort

Abortar imediatamente se ocorrer qualquer um destes casos:

- backup não confirmado;
- `students`, `classes` ou `teachers` não existirem como esperado;
- houver conflito real em `legacy_record_id`;
- a migration 2 falhar ou encontrar tabela base divergente;
- a reconciliação financeira continuar incompreendida;
- `financial_charges` real tiver shape incompatível com a migration 3;
- o backfill de follow-up não cobrir a fonte real observada;
- `settings.twr`/`classOpening` real não corresponder ao mapeamento;
- qualquer migration falhar em shadow/staging;
- políticas RLS bloquearem leitura essencial do fluxo;
- a suíte cair abaixo de `20/20 PASS`;
- surgir drift não compreendido entre produção e repositório;
- faltar confirmação de janela e owner responsável.

## Classificação por migration

| Migration | Estado atual | Motivo |
|---|---|---|
| `20260828_permission_defaults_twr_class_opening.sql` | SUPERSEDED / NÃO EXECUTAR | arquivada fora de `supabase/migrations` na Fase 2 |
| `20260828_academic_source_of_truth_contract.sql` | SUPERSEDED / NÃO EXECUTAR | arquivada fora de `supabase/migrations` na Fase 2 |
| `20260828_financial_source_of_truth_contract.sql` | SUPERSEDED / NÃO EXECUTAR | arquivada fora de `supabase/migrations` na Fase 2 |
| `20260828_student_followups_v1.sql` | SUPERSEDED / NÃO EXECUTAR | arquivada fora de `supabase/migrations` na Fase 2 |
| `20260828_twr_class_opening_v1.sql` | SUPERSEDED / NÃO EXECUTAR | arquivada fora de `supabase/migrations` na Fase 2 |

## Shadow test

Estado atual: `NÃO DISPONÍVEL`

Motivo:

- sem `psql`/Postgres local;
- sem staging/shadow conectado;
- sem permissão de clonar estrutura do banco real dentro deste ambiente.
