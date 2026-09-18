# Purple Gestão — Migration Plan

Data de referência: 2026-08-28

Objetivo desta fase:

- preparar a retirada do estado híbrido;
- criar migrations incrementais;
- não executar nada.

## 1. Ordem segura de aplicação

1. Permissões faltantes de TWR/Abertura de Turmas
2. Contrato canônico de diretórios acadêmicos
3. Contrato canônico do financeiro
4. Tabela de follow-up do aluno
5. Estruturas tipadas de TWR e Abertura de Turmas
6. Alinhamento final de app_records e desligamento progressivo dos fallbacks
7. RLS final por domínio após backfill validado

## 2. Migrations criadas nesta fase

### 2.1 `20260828_permission_defaults_twr_class_opening.sql`

Objetivo:

- materializar no backend as permissões já usadas na UI:
  - `twr.manage`
  - `twr.submit.own`
  - `class_opening.manage`
  - `class_opening.exception`

Impacto:

- sem alterar dados operacionais;
- prepara backend para contratos futuros.

Rollback:

- restaurar `default_permissions(...)` para a versão anterior.

### 2.2 `20260828_academic_source_of_truth_contract.sql`

Objetivo:

- adicionar `legacy_record_id` estável em `students`, `classes`, `teachers`;
- permitir mapeamento determinístico entre legado e tipado;
- preparar desligamento de `app_records(student/class/teacher)`.

Backfill:

- `data->>'legacyId'`
- `data->>'id'`

Validação:

- índices únicos parciais;
- comparação 1:1 entre tipado e legado.

Rollback:

- remover índices/colunas novas.

### 2.3 `20260828_financial_source_of_truth_contract.sql`

Objetivo:

- completar o contrato tipado de cobrança/parcela com os campos que ainda vivem no JSON:
  - `installment_number`
  - `installment_total`
  - `full_value`
  - `punctual_value`
  - `discount_value`
  - `discount_due_date`
  - `origin`
  - `legacy_record_id`

Backfill:

- a partir de `financial_charges.data`

Validação:

- valores > 0 quando aplicável
- coerência entre `value`, `full_value` e `punctual_value`

Rollback:

- remover colunas/índices adicionados.

### 2.4 `20260828_student_followups_v1.sql`

Objetivo:

- criar uma única fonte para follow-up/histórico operacional do aluno.

Backfill:

- `students.data.followUpEntries`

Validação:

- contagem por aluno
- amostragem de datas e autores

Rollback:

- manter JSON original intacto; remover tabela nova se necessário.

### 2.5 `20260828_twr_class_opening_v1.sql`

Objetivo:

- tirar TWR e Abertura de Turmas de `settings.twr`;
- criar estruturas tipadas próprias.

Escopo:

- `twr_teacher_profiles`
- `twr_schedule_windows`
- `twr_activities`
- `twr_publication_history`
- `class_opening_analyses`
- `class_opening_checklist`
- `class_opening_history`

Backfill:

- não automático nesta fase;
- leitura do JSON legado deve ser validada antes da execução.

Rollback:

- como não há destruição do legado, rollback é remover tabelas novas e manter leitura no JSON.

## 3. Fontes híbridas e plano de migração de dados

| Origem | Destino | Transformação | Deduplicação | Validação | Rollback |
|---|---|---|---|---|---|
| `app_records(student)` | `students` | mapear `legacyId` | por `legacy_record_id` | contagem + amostra | manter legado intocado |
| `app_records(class)` | `classes` | mapear `legacyId` | por `legacy_record_id` | contagem + amostra | manter legado intocado |
| `app_records(teacher)` | `teachers` | mapear `legacyId` | por `legacy_record_id` | contagem + amostra | manter legado intocado |
| `app_records(financial_entry)` | `financial_charges/payments` | separar cobrança/pagamento | por `legacy_record_id` + chave financeira | total por aluno/competência | manter legado intocado |
| `students.followUpEntries` | `student_followups` | normalizar datas/campos | hash por aluno+data+assunto | contagem por aluno | manter JSON original |
| `settings.twr` | `twr_*` | explode JSON em entidades | ids estáveis por bloco/professor | contagem por professor | manter JSON original |
| `settings.twr.classOpening` | `class_opening_*` | explode JSON em análise/checklist/histórico | id legado por análise | contagem por status | manter JSON original |

## 4. App Records após execução futura

Deve continuar:

- `report`
- `action`
- `meeting`
- `audit`
- `settings`
- `notification_reads`

Deve sair do papel de fonte canônica:

- `student`
- `class`
- `teacher`
- `financial_entry`
- `case`

## 5. Riscos antes da execução

- permissões UI e RLS ainda divergentes;
- follow-up tem formatos heterogêneos;
- financeiro ainda mistura histórico manual, Asaas e app_records;
- TWR/Class Opening hoje não têm chave estável no banco;
- book production ainda referencia `app_records(id)` para students/classes.

## 6. Sequência de rollout recomendada

1. aplicar permissões novas;
2. aplicar colunas contratuais sem mudar leitura;
3. executar backfills controlados em ambiente não produtivo;
4. validar contagem/consistência;
5. trocar leitura do frontend para fonte canônica;
6. só depois desativar fallback legado;
7. por último apertar RLS final.
