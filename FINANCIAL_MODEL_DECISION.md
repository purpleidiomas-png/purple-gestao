# Purple Gestão — Financial Model Decision

Data de referência: 2026-08-28

## Decisão sobre `financial_payments`

Produção atual:

- `financial_charges = 8`
- `financial_entry legado = 8`
- `financial_payments = 0`

Decisão desta fase:

- não criar pagamentos artificiais
- `financial_payments` só deve nascer a partir de evento real de liquidação/recebimento confirmado

Evento conceitual mínimo:

`PAYMENT_RECEIVED`

Fontes possíveis futuras:

- webhook confirmado do provedor
- operação administrativa autenticada com evidência suficiente

Não basta:

- existir cobrança
- cobrança ter QR code ou boleto
- pagamento esperado pelo frontend

## Decisão sobre ledger

Escolha:

- `financial_ledger_entries` deve começar como `VIEW DERIVADA`, não como terceira cópia materializada

Justificativa:

- hoje os fatos financeiros reais já podem ser explicados a partir de `financial_charges`
- `financial_payments` ainda está vazio
- materializar ledger agora criaria duplicação prematura
- projeção derivada é mais segura durante a transição

Modelo recomendado por fase:

### Fase de transição

- ledger = view ou projeção calculada

### Pós-cutover financeiro

- só materializar se surgir necessidade real de:
  - performance
  - trilha contábil imutável
  - múltiplos eventos por cobrança

## Fingerprint financeiro

Campos semanticamente importantes:

- `legacy_record_id` quando existir
- `external_charge_id` quando existir
- `external_reference` quando existir
- `due_date`
- `full_value` / `value`
- `punctual_value`
- `discount_value`
- `competence`
- `installment_number`
- `installment_total`
- `status` por mapeamento semântico

Não usar como chave principal:

- nome do aluno

## Decisão de cutover financeiro

Ainda:

- reconciliação repetível: sim
- pronto para backfill/cutover: não

Motivo:

- falta formalizar a geração real de `financial_payments`
- falta validar a projeção de ledger em ambiente shadow/local
