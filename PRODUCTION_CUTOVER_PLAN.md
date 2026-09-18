# Purple Gestão — Production Cutover Plan

Data de referência: 2026-08-28
Projeto esperado: `qqlymzyvvgmbyuhswipp`

## Status

Não executar nesta fase.

Cutover requer autorização humana separada.

## Ação futura

Trocar:

- `ACADEMIC_SOURCE = APP_RECORDS`

para:

- `ACADEMIC_SOURCE = TYPED`

## Pré-requisitos

- Estado B PASS
- Estado C PASS
- backup confirmado
- app compatível com fluxo tipado de forma explícita
- RPC acadêmica e feature flag presentes e validadas

## Smoke tests obrigatórios após a troca

### Alunos

- listar
- abrir
- criar
- editar
- salvar
- recarregar
- confirmar persistência

### Turmas

- listar
- abrir
- criar/editar
- validar professor
- validar alunos
- confirmar persistência

### Professores

- listar
- abrir
- editar
- confirmar persistência

### Permissões

- direção
- coordenação/pedagógico
- viewer

## Observabilidade durante o cutover

- erros SQL
- erros RPC
- erros de RLS
- console
- network
- auditoria
- tempo de execução

## Resultado esperado

Se todos os smoke tests passarem:

- cutover segue monitorado

Se qualquer teste crítico falhar:

- acionar rollback imediato por feature flag
