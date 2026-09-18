# Purple Gestão — Financial Reconciliation

Data de referência: 2026-08-28

## Estado real confirmado

- `financial_charges`: 8
- `app_records(kind='financial_entry')`: 8
- `financial_payments`: 0
- `financial_ledger_entries`: não existe

## Resultado da comparação estrutural

Reconciliação agregada:

- `MESMA_COBRANÇA`: 8
- `SÓ CANÔNICO`: 0
- `SÓ LEGADO`: 0
- `DIVERGENTE`: 0
- `AMBÍGUO`: 0

Correspondências confirmadas nos 8 pares:

- mesmo aluno: 8/8
- mesmo vencimento: 8/8
- mesmo valor cheio: 8/8
- mesmo valor pontual: 8/8
- mesmo desconto: 8/8
- mesma competência: 8/8
- mesma parcela: 8/8
- mesma presença de payload Asaas: 8/8

Observação:

- o `status` não bateu 1:1 na normalização usada nesta análise porque o legado usa nomenclatura diferente da tipada; isso é contrato de representação, não divergência material da cobrança

## Colunas reais de `financial_charges`

Principais colunas confirmadas:

- `id`
- `student_id`
- `financial_account_id`
- `asaas_customer_id`
- `provider`
- `external_charge_id`
- `external_reference`
- `charge_type`
- `billing_type`
- `status`
- `description`
- `competence`
- `due_date`
- `value`
- `full_value`
- `punctual_value`
- `discount_value`
- `discount_due_date`
- `installment_number`
- `installment_total`
- `installment_group_id`
- `paid_amount`
- `paid_at`
- `student_name`
- `responsible_name`
- `data`

Não existe:

- `asaas_payment_id`

## Colunas observadas apenas no legado `financial_entry`

Persistem só no payload legado e devem ser avaliadas como `data` ou promoção futura:

- `asaasPayment`
- `boletoPayload`
- `pixPayload`
- `cancelResponse`
- `person`
- `student`
- `subaccount`
- `account`
- `active`
- `archivedAt`

## Arquitetura V2 recomendada

### financial_charges

Representa a obrigação de cobrança.

Campos de responsabilidade:

- aluno
- conta financeira
- identificadores externos da cobrança
- descrição
- competência
- vencimento
- valores base
- desconto
- parcela
- status da cobrança
- metadados de emissão

Adicionar no V2:

- `legacy_record_id text unique null`

### financial_payments

Representa o evento de recebimento/pagamento materializado.

Como produção está em `0`, a leitura recomendada hoje é:

- nenhum pagamento foi materializado ainda em tabela própria
- o sistema vem carregando status e `paidAmount` a partir da própria cobrança
- portanto a alternativa mais compatível com a evidência atual é:
  - A: ainda não houve materialização de pagamentos em `financial_payments`
  - B: parte do estado de pagamento está embutida em `financial_charges`
  - D: a integração Asaas ainda não materializou pagamentos como entidade separada

Não há evidência para afirmar C.

### financial_ledger_entries

Representa fatos contábeis/financeiros derivados.

No V2 deve nascer apenas como trilha de eventos, sem inventar colunas já refutadas em produção.

Campos recomendados:

- `id uuid`
- `provider text`
- `external_event_id text`
- `charge_id uuid`
- `payment_id uuid`
- `student_id text`
- `entry_type text`
- `amount numeric`
- `net_value numeric`
- `fee_value numeric`
- `occurred_at timestamptz`
- `data jsonb`

## RLS recomendado

- leitura financeira: `public.has_permission('financial.receipts.view') or public.has_permission('financial.receivables.view') or public.is_direction()`
- escrita financeira: `public.has_permission('financial.transactions.create'|'financial.transactions.edit'|'financial.transactions.delete')` conforme operação
- webhook/auditoria: `security definer` + grants mínimos

## Cutover financeiro

Ainda não pronto.

Pré-condições:

- manter os 8 pares reconciliados
- decidir quando `financial_payments` passa a ser preenchida
- validar criação de `financial_ledger_entries`
- alinhar frontend às colunas reais
