# Purple Gestão — Production Preflight Checklist

Data de referência: 2026-08-28
Projeto esperado: `qqlymzyvvgmbyuhswipp`

## Gate 0 — alvo correto

- [ ] projeto alvo exibido e conferido manualmente
- [ ] project ref confirmado como `qqlymzyvvgmbyuhswipp`
- [ ] qualquer outro ref = `ABORT`

## Gate 1 — backup anterior à mudança

Mecanismo oficial:

- usar o backup oficial gerenciado do Supabase do projeto de produção
- registrar o identificador/timestamp do backup imediatamente anterior à mudança

Confirmar e registrar:

- [ ] data/hora do backup em UTC e America/Sao_Paulo
- [ ] método oficial utilizado
- [ ] ponto de recuperação disponível
- [ ] prova de que o backup é anterior ao início da mudança
- [ ] local onde o registro foi armazenado

Registro obrigatório:

- timestamp início da operação
- timestamp do backup de referência
- responsável humano que confirmou

## Gate 2 — preflight read-only do momento

Executar:

- `supabase/phase2_1/01_preflight_readonly.sql`

Registrar:

- [ ] contagens atuais
- [ ] baseline histórico de 2026-08-28
- [ ] delta por entidade

Regras:

- delta não é erro por si só
- novos registros legítimos entram no escopo do backfill

## Gate 3 — schema drift

Comparar produção atual com a verdade da Fase 1.5B.

Verificar:

- [ ] novas tabelas
- [ ] novas colunas críticas
- [ ] grants alterados
- [ ] RLS alterada
- [ ] RPCs alteradas
- [ ] migrations inesperadas

Classificar:

- [ ] SAFE DRIFT
- [ ] REVIEW REQUIRED
- [ ] ABORT

## Gate 4 — compatibilidade do app

- [ ] `ACADEMIC_SOURCE` esperado continua `APP_RECORDS`
- [ ] app não muda para typed só porque tabela existe
- [ ] app não faz dual-write implícito para diretórios acadêmicos

Se qualquer item falhar:

- `ABORT`

## Gate 5 — integridade do caminho executável

- [ ] migrations superseded continuam fora do diretório executável normal
- [ ] ordem das migrations V2 revisada
- [ ] nenhum arquivo legado será executado por engano

## Gate 6 — autorização humana

- [ ] change aprovado explicitamente
- [ ] janela operacional aprovada
- [ ] responsável de negócio disponível para validação

Sem todos os gates acima:

- `NÃO EXECUTAR`
