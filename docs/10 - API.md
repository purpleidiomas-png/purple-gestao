# Purple Gestão — Contrato de API

**Status:** Contrato conceitual; implementação e OpenAPI serão definidos em sprint  
**Estilo inicial:** HTTP/JSON orientado a recursos e comandos de domínio

## 1. Princípios

- API é a fronteira de autorização para operações privilegiadas.
- Contratos são tipados, validados e documentados.
- Recursos usam identificadores opacos.
- Datas seguem ISO 8601; instantes em UTC.
- Valores monetários não usam ponto flutuante impreciso.
- Mudanças incompatíveis exigem nova versão.
- Nenhum endpoint aceita papel ou organização confiando no cliente.

## 2. Convenções

- Prefixo proposto: `/api/v1`.
- JSON em `camelCase` ou `snake_case`, a decidir uma vez e manter consistentemente.
- Paginação por cursor para coleções crescentes; página pode ser aceita em telas pequenas e estáveis.
- Filtros são allowlist, com limites.
- `X-Request-Id`/correlation ID em respostas e logs.
- `Idempotency-Key` em envio, aprovação, geração de PDF e comandos semelhantes.

## 3. Envelope de erro

Resposta de erro deve conter código estável, mensagem segura, detalhes de campos quando aplicável e identificador de correlação. Classes:

- `400` requisição malformada.
- `401` não autenticado.
- `403` autenticado sem permissão.
- `404` recurso inexistente ou ocultado por segurança.
- `409` conflito, duplicidade ou versão desatualizada.
- `422` regra de negócio/validação.
- `429` limite de requisições.
- `500/503` falha interna ou indisponibilidade.

## 4. Autenticação e perfil

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/me` | sessão, perfil e escopos efetivos |
| `GET` | `/me/notifications` | notificações autorizadas |
| `POST` | `/me/notifications/{id}/read` | marcar leitura |
| `POST` | `/auth/logout` | encerrar sessão quando aplicável |

Login, convite e recuperação podem ser fornecidos pelo provedor, com callbacks protegidos.

## 5. Relatórios

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/report-definitions` | schemas disponíveis no escopo |
| `GET` | `/report-periods` | períodos esperados e situação |
| `GET` | `/reports` | listar com filtros autorizados |
| `POST` | `/reports` | criar identidade/rascunho |
| `GET` | `/reports/{id}` | detalhe e versão corrente |
| `PATCH` | `/reports/{id}/draft` | alterar rascunho com controle de versão |
| `POST` | `/reports/{id}/submit` | validar e submeter versão |
| `POST` | `/reports/{id}/start-review` | iniciar análise |
| `POST` | `/reports/{id}/request-adjustment` | abrir ajuste formal |
| `POST` | `/reports/{id}/resubmit` | enviar versão corrigida |
| `POST` | `/reports/{id}/approve` | aprovar versão corrente |
| `POST` | `/reports/{id}/archive` | arquivar aprovado |
| `GET` | `/reports/{id}/versions` | histórico de versões |
| `GET` | `/reports/{id}/timeline` | eventos do domínio |

Comandos validam `expectedVersion` para concorrência e retornam o novo estado canônico.

## 6. Planos de ação

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/action-plans` | listar por responsável, setor, prazo e status |
| `POST` | `/action-plans` | criar plano autorizado |
| `GET` | `/action-plans/{id}` | detalhe e histórico |
| `PATCH` | `/action-plans/{id}` | alterar campos permitidos |
| `POST` | `/action-plans/{id}/updates` | registrar evolução |
| `POST` | `/action-plans/{id}/complete` | concluir com resultado |
| `POST` | `/action-plans/{id}/cancel` | cancelar com justificativa |

## 7. Dashboard

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/dashboards/integrated` | visão da Direção |
| `GET` | `/dashboards/departments/{id}` | visão setorial |
| `GET` | `/metrics/{key}/drilldown` | explicar agregado |

Respostas incluem filtros efetivos, período, atualização, qualidade e definição das métricas. O servidor ignora ou rejeita escopos não autorizados.

## 8. Arquivos e documentos

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/reports/{id}/attachments/upload-intent` | autorizar upload privado |
| `POST` | `/reports/{id}/attachments/complete` | validar e registrar conclusão |
| `GET` | `/attachments/{id}/download` | URL temporária autorizada |
| `POST` | `/reports/{id}/pdf` | solicitar/retentar PDF oficial |
| `GET` | `/reports/{id}/pdf` | metadados ou download autorizado |

## 9. Administração

| Método | Rota | Finalidade |
|---|---|---|
| `GET/POST` | `/admin/users` | listar ou convidar |
| `PATCH` | `/admin/users/{id}` | alterar estado permitido |
| `POST` | `/admin/users/{id}/scopes` | conceder escopo |
| `DELETE` | `/admin/users/{id}/scopes/{scopeId}` | revogar escopo |
| `GET` | `/admin/audit` | consultar auditoria autorizada |
| `GET/POST` | `/admin/report-definitions` | governar schemas |
| `GET/PATCH` | `/admin/settings` | configurações versionadas |

## 10. Segurança

- Proteção CSRF conforme mecanismo de sessão.
- CORS restrito aos ambientes oficiais.
- Rate limit por identidade e risco.
- Validação de conteúdo e tamanho.
- Respostas não revelam existência de recurso proibido quando isso gerar vazamento.
- Consultas parametrizadas e saída codificada.
- Upload com nome gerado pelo servidor, bucket privado e inspeção aplicável.

## 11. Observabilidade

Medir latência, taxa de erro, conflitos, comandos de domínio, falhas de jobs e violações negadas sem registrar payload sensível. Toda requisição relevante carrega correlação até banco/job.

## 12. Evolução e testes de contrato

- OpenAPI será gerada ou mantida junto ao código.
- Consumidores têm testes de contrato.
- Campos novos são opcionais até migração coordenada.
- Remoções passam por depreciação anunciada.
- Endpoints administrativos têm testes negativos explícitos.

## 13. Pontos abertos

- Convenção final de nomes JSON.
- Sessão por cookie seguro ou integração direta controlada com o provedor.
- Paginação padrão e limites.
- Processamento síncrono ou assíncrono do primeiro PDF.
- Necessidade futura de API pública para integrações.

## Documentos relacionados

- [04 - Banco](04%20-%20Banco.md)
- [07 - Permissões](07%20-%20Permissões.md)
- [09 - Regras de Negócio](09%20-%20Regras%20de%20Negócio.md)
- [03 - Fluxos](03%20-%20Fluxos.md)
