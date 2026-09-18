# Purple Gestão — Academic RPC Contract

Data de referência: 2026-08-28

## Objetivo

Definir a RPC transacional que deve assumir a escrita acadêmica somente depois do cutover.

Nesta fase:

- contrato definido
- frontend não alterado
- RPC não implementada

## Nome conceitual

`save_academic_directory_record`

## Operações suportadas

- `teacher.upsert`
- `class.upsert`
- `student.upsert`
- `teacher.delete`
- `class.delete`
- `student.delete`

## Payload

```json
{
  "operation": "student.upsert",
  "source_mode": "TYPED",
  "actor_id": "uuid",
  "record": {
    "id": "uuid|null",
    "legacy_record_id": "text|null",
    "data": {}
  },
  "expected_version": {
    "updated_at": "timestamp|null"
  },
  "audit": {
    "reason": "text",
    "origin": "WEB_APP"
  }
}
```

## Validações

- `source_mode` deve ser `TYPED`
- feature flag acadêmica deve apontar para `TYPED`
- permissão compatível com a operação
- `legacy_record_id` obrigatório para registro migrado
- nenhuma inferência por nome
- `class.teacher_id` deve referenciar professor existente
- `student.class_id`, quando presente, deve referenciar turma existente
- deletes só podem acontecer em fase autorizada específica

## Permissões

- leitura: `panel.view`
- escrita: usuário autenticado com permissão funcional do domínio
- recomendação mínima desta fase:
  - `direction` ou
  - não `viewer`

## Transação

A RPC deve:

1. validar feature flag
2. validar permissão
3. validar integridade da operação
4. executar `insert/update/delete` tipado
5. registrar auditoria
6. retornar erro atômico em qualquer falha

Sem dual-write.

## Auditoria

Campos mínimos:

- `entity`
- `operation`
- `record_id`
- `legacy_record_id`
- `actor_id`
- `before_data`
- `after_data`
- `created_at`

## Erros esperados

- `ACADEMIC_SOURCE_NOT_TYPED`
- `PERMISSION_DENIED`
- `LEGACY_RECORD_ID_REQUIRED`
- `TEACHER_REFERENCE_NOT_FOUND`
- `CLASS_REFERENCE_NOT_FOUND`
- `OPTIMISTIC_LOCK_FAILED`
- `INVALID_OPERATION`

## Feature flag de source

O cutover não deve ser implícito.

Contrato explícito:

- `ACADEMIC_SOURCE = APP_RECORDS`
- `ACADEMIC_SOURCE = TYPED`

Implementação recomendada futura:

- tabela/configuração própria de estado de source
- ou chave explícita em `settings`, com leitura controlada

Mas nunca:

- “se a tabela existe, usar typed”
