# Purple Gestão — Cutover Checklist

Data de referência: 2026-08-28

## Resultado

Este checklist deve terminar em apenas um estado:

- `GO`
- `NO-GO`

## Academic GO / NO-GO

### Contagem

- [ ] baseline da auditoria comparada com a contagem do momento
- [ ] todos os registros elegíveis atuais foram incluídos no escopo
- [ ] `LEGACY_COUNT = TYPED_COUNT`

### Rastreabilidade

- [ ] `legacy_record_id` presente em 100%
- [ ] `legacy_record_id` único em 100%
- [ ] `MATCHED_BY_LEGACY_RECORD_ID = LEGACY_COUNT`

### Integridade relacional

- [ ] `ORPHAN_TEACHER_LINK = 0`
- [ ] `ORPHAN_CLASS_LINK = 0`
- [ ] nenhum `teacherId` legado ficou sem professor tipado correspondente
- [ ] nenhum `classId` legado preenchido ficou sem turma tipada correspondente

### Fingerprint

- [ ] fingerprints essenciais compatíveis entre legado e tipado
- [ ] nenhum desvio semântico relevante detectado

### Segurança operacional

- [ ] RLS validada
- [ ] CRUD validado em ambiente seguro
- [ ] backup confirmado
- [ ] rollback preparado
- [ ] suíte 100% verde

Academic decision:

- se qualquer item acima falhar → `NO-GO`
- se todos passarem → `GO`

## Financial GO / NO-GO

### Reconciliação

- [ ] todos os registros elegíveis do momento foram comparados
- [ ] `legacy_only = 0`
- [ ] `typed_only = 0`
- [ ] `divergent > 0` bloqueia GO
- [ ] `ambiguous > 0` bloqueia GO

### Fingerprint

- [ ] identificador confiável preservado
- [ ] valor compatível
- [ ] vencimento compatível
- [ ] competência compatível
- [ ] status compatível por mapeamento semântico
- [ ] parcela compatível

### Modelo

- [ ] evento futuro de criação de `financial_payments` está definido
- [ ] decisão de ledger está formalizada
- [ ] frontend não depende de coluna refutada em produção

### Segurança operacional

- [ ] RLS validada
- [ ] backup confirmado
- [ ] rollback preparado
- [ ] suíte 100% verde

Financial decision:

- se qualquer item acima falhar → `NO-GO`
- se todos passarem → `GO`

## Fonte acadêmica explícita

- [ ] `ACADEMIC_SOURCE = APP_RECORDS` antes do cutover
- [ ] `ACADEMIC_SOURCE = TYPED` só após GO formal
- [ ] a troca não depende apenas da existência de tabela
