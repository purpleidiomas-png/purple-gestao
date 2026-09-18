# SHADOW REHEARSAL REPORT

Data: 2026-08-28

## Ambiente

- Tipo: Embedded Postgres local descartável
- PostgreSQL: 18.4
- Produção acessada: NÃO
- Produção alterada: NÃO

## Academic migration

- Resultado: PASS
- Database: healthy_1789766802759_1

## Academic backfill

- Primeira execução: PASS
- Segunda execução: PASS
- Idempotência: PASS
- Reconciliação saudável: teachers=2, classes=2, students=2

## Fingerprint

- Resultado: PASS
- Divergência semântica detectada após alteração proposital no destino

## Financial

- Reconciliação base: PASS
- Divergência de valor detectada: PASS
- Legacy only detectado: PASS
- Typed only detectado: PASS
- financial_payments vazio não quebrou reconciliação: PASS
- Ledger derivado sem terceira cópia persistida: PASS

## Follow-up / Cases / TWR / Class Opening

- Follow-up: PASS
- Integrated Cases: PASS
- TWR: PASS
- Class Opening: PASS

## RLS / RPC / Cutover / Rollback

- RLS: PASS
- Academic RPC: PASS
- Transaction rollback: PASS
- Feature flag: PASS
- Cutover simulation: PASS
- Rollback simulation: PASS
