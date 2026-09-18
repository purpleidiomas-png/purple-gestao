# PRODUCTION SCHEMA TRUTH

Data da inspeção administrativa: 2026-08-28  
Project ref confirmado: `qqlymzyvvgmbyuhswipp`  
Método de acesso: dashboard oficial do Supabase autenticado + SQL Editor oficial, em modo read-only

## Status desta fotografia

Classificação dos fatos:

- `CONFIRMADO`: observado diretamente no dashboard autenticado ou por query read-only no SQL Editor
- `INFERIDO`: dedução conservadora a partir de evidência administrativa parcial
- `NÃO VALIDADO`: não foi possível confirmar ainda de forma administrativa suficiente

Nenhuma escrita foi executada no banco.

## 1. Schema real — existência das tabelas-chave

### Confirmado

Existem em `public`:

- `profiles`
- `app_records`
- `financial_charges`
- `financial_payments`
- `production_books`
- `production_book_orders`
- `production_book_order_items`

Não existem em `public`:

- `students`
- `classes`
- `teachers`
- `financial_ledger_entries`
- `integrated_cases`
- `integrated_case_sector_details`
- `student_followups`
- `twr_teacher_profiles`
- `twr_schedule_windows`
- `twr_activities`
- `twr_publication_history`
- `class_opening_analyses`
- `class_opening_checklist`
- `class_opening_history`
- `production_book_order_recipients`

### Implicação direta

O schema real de produção ainda é majoritariamente legado/híbrido, com acadêmico e casos integrados permanecendo em `app_records`, enquanto o financeiro e Book Production estão apenas parcialmente tipados.

## 2. Contagens administrativas confirmadas

- `profiles`: `5`
- `app_records`: `537`
- `financial_charges`: `8`
- `financial_payments`: `0`
- `students`: `TABLE_NOT_FOUND`
- `classes`: `TABLE_NOT_FOUND`
- `teachers`: `TABLE_NOT_FOUND`
- `financial_ledger_entries`: `TABLE_NOT_FOUND`
- `integrated_cases`: `TABLE_NOT_FOUND`
- `student_followups`: `TABLE_NOT_FOUND`
- `production_books`: `15`
- `production_book_orders`: `2`
- `production_book_order_items`: `12`
- `production_book_order_recipients`: `TABLE_NOT_FOUND`

## 3. App records por kind

Confirmado:

- `action`: `5`
- `audit`: `344`
- `case`: `1`
- `class`: `5`
- `financial_entry`: `8`
- `notification_reads`: `4`
- `report`: `3`
- `settings`: `1`
- `student`: `159`
- `teacher`: `7`

## 4. Acadêmico real

### Confirmado

- não existe tabela tipada `students`
- não existe tabela tipada `classes`
- não existe tabela tipada `teachers`
- o acadêmico real existente hoje está em `app_records`

### Contagens legadas confirmadas

- alunos legados: `159`
- turmas legadas: `5`
- professores legados: `7`

### Consequência

Qualquer migration que dependa da existência prévia de `students`, `classes` ou `teachers` em produção está bloqueada no estado atual.

## 5. Financeiro real

### Confirmado

- existe `financial_charges`
- existe `financial_payments`
- não existe `financial_ledger_entries`
- existem `8` registros legados `app_records(kind='financial_entry')`
- existem `8` registros em `financial_charges`
- existem `0` registros em `financial_payments`

### Status agregado confirmado em `financial_charges`

- `CANCELED`: `2`
- `PENDING`: `6`

### Colunas confirmadas em `financial_charges` (parcial)

- `id`
- `student_id`
- `financial_account_id`
- `asaas_customer_id`
- `provider`

### Divergência crítica confirmada

O schema real não possui a coluna `asaas_payment_id` em `financial_charges`, apesar de o diagnóstico inicial ter assumido essa nomenclatura.

## 6. Follow-up / timeline

### Confirmado

- `students_with_timeline`: `23`
- `total_timeline_events`: `23`
- `students_with_followups`: `0`
- `total_followup_events`: `0`
- `student_followups`: `TABLE_NOT_FOUND`

### Conclusão

O conteúdo real visível de acompanhamento está na `timeline` legada, não em `followUpEntries`, e a tabela canônica `student_followups` ainda não existe em produção.

## 7. Settings / TWR / Class Opening

### Confirmado

- existe `1` registro `settings`
- `rows_with_twr`: `0`
- `rows_with_class_opening`: `0`
- não existem tabelas `twr_*`
- não existem tabelas `class_opening_*`

### Conclusão

Não há evidência administrativa de dados TWR/Class Opening materializados nem em tabela própria nem no `settings` atual de produção.

## 8. Book Production

### Confirmado

Existem:

- `production_books`
- `production_book_orders`
- `production_book_order_items`

Não existe:

- `production_book_order_recipients`

Contagens:

- `production_books`: `15`
- `production_book_orders`: `2`
- `production_book_order_items`: `12`

RPCs confirmadas:

- `advance_production_book_order_status`
- `create_production_book_order`
- `save_production_book_config`
- `save_production_print_profile`
- `remove_production_book_config`
- `remove_production_print_profile`

RPC não confirmada porque não existe:

- `create_production_book_order_v3`

### Conclusão

Produção de livros em produção está em V1/V2 parcial, sem V3.

## 9. RLS

### Confirmado

RLS habilitada em:

- `app_records`
- `financial_charges`
- `financial_payments`
- `production_book_order_items`
- `production_book_orders`
- `production_books`
- `profiles`

Policies confirmadas, ao menos por nome e comando:

- `app_records`: `records_read`, `records_insert`, `records_update`, `records_delete`
- `financial_charges`: `financial_charges direction select`, `financial_charges direction insert`, `financial_charges direction update`
- `financial_payments`: `financial_payments direction select`
- `production_book_order_items`: `production_book_order_items_direction_select`, `..._insert`, `..._update`
- `production_book_orders`: `production_book_orders_direction_insert`

### Não validado ainda

- texto completo de todas as expressions `USING` / `WITH CHECK`
- políticas completas de todas as tabelas existentes de Book Production

## 10. Grants

### Confirmado

Em `app_records`, o papel `authenticated` possui grants amplos, incluindo:

- `SELECT`
- `INSERT`
- `UPDATE`
- `DELETE`
- `REFERENCES`
- `TRIGGER`
- `TRUNCATE`

### Observação

Grant não equivale a acesso efetivo; o acesso final continua mediado por RLS. Ainda assim, a presença de `TRUNCATE` para `authenticated` merece revisão arquitetural futura.

## 11. Functions / RPCs

### Confirmado como existente

- `advance_production_book_order_status(p_order_id uuid, p_next_status text) -> production_book_orders`
- `create_production_book_order(p_order jsonb, p_classes jsonb, p_items jsonb) -> production_book_orders`
- `default_permissions(p_role text, p_sector text) -> jsonb`
- `has_permission(permission_key text) -> boolean`
- `has_sector_access(record_sector text) -> boolean`
- `is_direction() -> boolean`
- `is_viewer() -> boolean`
- `my_sector() -> text`
- `remove_production_book_config(p_book_id uuid) -> text`
- `remove_production_print_profile(p_profile_id uuid) -> text`
- `save_production_book_config(p_config jsonb) -> production_books`
- `save_production_print_profile(p_profile jsonb, p_ranges jsonb) -> production_print_profiles`

### Confirmado como ausente no recorte consultado

- `save_integrated_case`
- `list_integrated_cases`
- `create_production_book_order_v3`

## 12. Síntese operacional

Produção hoje está assim:

- acadêmico: legado em `app_records`
- financeiro: parcialmente tipado (`financial_charges`/`financial_payments`) + legado `financial_entry`
- casos integrados: não materializados em tabela própria
- follow-up: timeline legada
- TWR/Class Opening: não materializados
- Book Production: V1/V2 parcial, sem V3

Isso torna a Fase 1.5B administrativamente suficiente para classificar vários bloqueios reais de migration sem executar nada no banco.
