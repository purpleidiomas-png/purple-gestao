# SCHEMA DRIFT REPORT — FASE 1.5

Data da inspeção: 2026-08-28  
Projeto Supabase inspecionado: `qqlymzyvvgmbyuhswipp`

## Escopo e limites reais desta inspeção

Esta fase foi executada em modo read-only.

Validação real obtida:

- autenticação real em produção com os perfis `pedagogico@purple.com.br` e `retencao@purple.com.br`;
- leitura via PostgREST sob RLS efetivo;
- comparação com o schema esperado no repositório.

Limites que permaneceram:

- não havia credencial administrativa/read-only de schema;
- não foi possível consultar `information_schema`, `pg_catalog`, policies completas, FKs, índices e triggers diretamente no banco real;
- não foi possível usar `psql`, `postgres`, `initdb` ou shadow database local neste ambiente.

Sempre que a validação dependeria de privilégio de schema e não apenas de leitura sob RLS, o item foi marcado como `NÃO VALIDADO`.

## Resumo executivo

Principais achados confirmados no banco real exposto ao papel autenticado:

1. `app_records` e `profiles` estão ativos e acessíveis.
2. O legado acadêmico continua vivo em `app_records(kind='student'|'class'|'teacher')`.
3. `students`, `classes` e `teachers` não aparecem no schema cache exposto aos perfis autenticados testados.
4. `financial_charges` e `financial_payments` existem e estão expostos, mas retornam zero linhas visíveis.
5. `financial_ledger_entries` não aparece no schema cache exposto.
6. `integrated_cases` e `integrated_case_sector_details` não aparecem no schema cache exposto.
7. As tabelas principais de Book Production V1/V2 existem no schema exposto.
8. `production_book_order_recipients` não aparece no schema cache exposto.
9. As tabelas propostas para `student_followups`, `twr_*` e `class_opening_*` não existem/expostas hoje.
10. `settings-default` visível não contém `twr` nem `classOpening`.

## Atualização administrativa de 2026-08-28

Com inspeção administrativa oficial pelo dashboard autenticado do Supabase + SQL Editor read-only, os seguintes itens deixam de ser inferência e passam a ser fatos confirmados:

- `students`, `classes` e `teachers` realmente não existem em produção.
- `integrated_cases` e `integrated_case_sector_details` realmente não existem em produção.
- `financial_ledger_entries` realmente não existe em produção.
- `student_followups`, `twr_*` e `class_opening_*` realmente não existem em produção.
- `production_book_order_recipients` realmente não existe em produção.
- `financial_charges` existe e tem `8` registros.
- `financial_payments` existe e tem `0` registros.
- `app_records(kind='financial_entry')` tem `8` registros.
- `production_books` existe e tem `15` registros.
- `production_book_orders` existe e tem `2` registros.
- `production_book_order_items` existe e tem `12` registros.
- `create_production_book_order_v3`, `save_integrated_case` e `list_integrated_cases` não existem no recorte de funções consultado.
- o `settings` real não contém estrutura `twr` nem `classOpening`.

## Classificação de drift

| Item | Repositório espera | Banco real observado | Classe | Observação |
|---|---|---|---|---|
| `profiles` | existe | existe e acessível | INOFENSIVA | coerente com a base |
| `app_records` | existe | existe e acessível | INOFENSIVA | continua sendo source of truth real para legado |
| `students` | existe como canônico | NÃO EXISTE em produção | CRÍTICA | migration acadêmica preparada pressupõe base inexistente |
| `classes` | existe como canônico | NÃO EXISTE em produção | CRÍTICA | mesmo risco |
| `teachers` | existe como canônico | NÃO EXISTE em produção | CRÍTICA | mesmo risco |
| `financial_charges` | existe | existe e exposta | RELEVANTE | sem linhas visíveis nos perfis testados |
| `financial_payments` | existe | existe e exposta | RELEVANTE | sem linhas visíveis nos perfis testados |
| `financial_ledger_entries` | existe desde 2026-08-20 | NÃO EXISTE em produção | RELEVANTE | drift real entre repositório e banco |
| `integrated_cases` | existe desde 2026-07-24 | NÃO EXISTE em produção | RELEVANTE | recurso do frontend não está materializado no banco |
| `integrated_case_sector_details` | existe desde 2026-07-24 | NÃO EXISTE em produção | RELEVANTE | mesma condição |
| Book Production V1/V2 | existe | tabelas principais existem no schema exposto | INOFENSIVA | compatível com repositório |
| `production_book_order_recipients` | existe desde V3 | NÃO EXISTE em produção | RELEVANTE | V3 realmente não foi aplicada |
| `student_followups` | prevista para Fase 1 | não existe/exposta | INOFENSIVA | esperado, ainda não migrado |
| `twr_teacher_profiles` e correlatas | previstas para Fase 1 | não existem/expostas | INOFENSIVA | esperado, ainda não migrado |
| `class_opening_*` | previstas para Fase 1 | não existem/expostas | INOFENSIVA | esperado, ainda não migrado |

## Inventário real validado por leitura autenticada

Status:

- `200`: tabela exposta e consultável no papel autenticado testado;
- `404/PGRST205`: objeto não encontrado no schema cache exposto ao papel autenticado;
- `NÃO VALIDADO`: exigiria inspeção administrativa.

| Objeto | Status real observado | Notas |
|---|---|---|
| `profiles` | 200 | leitura do próprio perfil confirmada |
| `app_records` | 200/206 | leitura confirmada |
| `students` | 404/PGRST205 | não exposta/encontrada para os perfis testados |
| `classes` | 404/PGRST205 | idem |
| `teachers` | 404/PGRST205 | idem |
| `financial_charges` | 200 | zero linhas visíveis |
| `financial_payments` | 200 | zero linhas visíveis |
| `financial_ledger_entries` | 404/PGRST205 | não exposta/encontrada |
| `integrated_cases` | 404/PGRST205 | não exposta/encontrada |
| `integrated_case_sector_details` | 404/PGRST205 | não exposta/encontrada |
| `inventory_items` | 200 | zero linhas visíveis |
| `inventory_movements` | 200 | zero linhas visíveis |
| `book_movements` | 200 | zero linhas visíveis |
| `assets` | 200 | zero linhas visíveis |
| `asset_movements` | 200 | zero linhas visíveis |
| `production_books` | 200 | zero linhas visíveis |
| `production_book_print_specs` | 200 | zero linhas visíveis |
| `production_print_profiles` | 200 | zero linhas visíveis |
| `production_print_profile_ranges` | 200 | zero linhas visíveis |
| `production_book_progressions` | 200 | zero linhas visíveis |
| `production_book_orders` | 200 | zero linhas visíveis |
| `production_book_order_classes` | 200 | zero linhas visíveis |
| `production_book_order_students` | 200 | zero linhas visíveis |
| `production_book_order_items` | 200 | zero linhas visíveis |
| `production_book_order_spec_snapshots` | 200 | zero linhas visíveis |
| `production_book_order_status_history` | 200 | zero linhas visíveis |
| `production_book_order_recipients` | 404/PGRST205 | V3 ausente/não exposta |
| `tasks` | 200/206 | linhas visíveis no perfil de retenção |
| `pulse_entries` | 200 | linha visível no perfil de retenção |
| `achievements` | 200/206 | linhas visíveis no perfil de retenção |
| `announcements` | 200 | zero linhas visíveis |
| `intelligence_snapshots` | 200/206 | linhas visíveis no perfil de retenção |
| `operational_diary_entries` | 200 | linha visível no perfil de retenção |
| `financial_accounts` | 200 | zero linhas visíveis |
| `asaas_customers` | 200 | zero linhas visíveis |
| `asaas_webhook_events` | 200 | zero linhas visíveis |
| `financial_charge_audit` | 200 | zero linhas visíveis |

## RLS real inferido por comportamento

Sem introspecção administrativa, a política real só pôde ser inferida pelo que cada perfil viu.

Achados confirmados:

- `profiles`: cada perfil autenticado visualizou apenas seu próprio registro.
- `app_records`: dois perfis líderes visualizaram subconjuntos diferentes da base.
- `app_records(kind='settings')`: ambos visualizaram `settings-default`.
- `app_records(kind='student'|'class'|'teacher')`: ambos visualizaram o mesmo conjunto legado.
- `financial_*`, `inventory_*`, `assets`, `production_*`: retornaram `200` com zero linhas visíveis para os perfis testados.

Isso significa que a exposição real hoje não é suficiente para comprovar a canonicidade tipada acadêmica pelo papel autenticado testado.

## Funções/RPCs

Validação administrativa completa: `NÃO VALIDADO`.

Validação comportamental:

- `list_integrated_cases()` não foi localizada no schema cache exposto;
- `save_integrated_case(...)` não foi localizada no schema cache exposto;
- `create_production_book_order_v3(...)` não foi localizada no schema cache exposto;
- a ausência de `create_production_book_order_v3` é compatível com ausência de V3 em produção;
- `create_production_book_order(...)` exige assinatura com parâmetros específicos e não foi validada por execução para evitar mutação.

## Triggers, índices, constraints, PKs, FKs, policies completas

Status: `NÃO VALIDADO`

Motivo: esta validação exigia introspecção de schema com privilégio administrativo/read-only não disponível no ambiente atual.

## Conclusão do drift

Estado da comparação repositório vs produção:

- há drift crítico na parte acadêmica, porque o repositório assume tabelas tipadas canônicas já operáveis, mas o banco real exposto aos papéis autenticados testados não comprova isso;
- há drift relevante na camada de casos integrados e financeiro expandido, porque objetos esperados no repositório não puderam ser confirmados no schema exposto real;
- Book Production V1/V2 está materializado no banco real exposto, mas V3 não está disponível no schema cache autenticado.
