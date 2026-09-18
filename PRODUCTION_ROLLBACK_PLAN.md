# Purple Gestão — Production Rollback Plan

Data de referência: 2026-08-28
Projeto esperado: `qqlymzyvvgmbyuhswipp`

## Princípio

O primeiro rollback operacional do cutover não é destrutivo.

É:

- `ACADEMIC_SOURCE = APP_RECORDS`

## Quando acionar rollback

Acionar imediatamente se, após o futuro cutover:

- CRUD acadêmico falhar
- persistência após recarregar falhar
- erro de RLS bloquear perfis esperados
- erro de RPC impedir operação normal
- divergência de dados aparecer em smoke test
- console/network mostrar erro crítico recorrente

## O que fazer

1. parar novos testes de negócio
2. trocar `ACADEMIC_SOURCE` para `APP_RECORDS`
3. confirmar recuperação do fluxo legado
4. registrar horário da troca
5. preservar tabelas tipadas
6. não apagar typed
7. não fazer sincronização destrutiva
8. abrir diagnóstico pós-incidente

## O que não fazer

- não apagar `students`
- não apagar `classes`
- não apagar `teachers`
- não apagar `app_records`
- não improvisar backfill corretivo em produção

## Resultado esperado

- operação volta ao legado
- produção segue atendendo
- correção volta para shadow antes de nova tentativa
