# Purple Gestão — Arquitetura de Dados

**Status:** Modelo lógico proposto; não implementado  
**Banco recomendado:** PostgreSQL gerenciado com autenticação integrada

## 1. Princípios

- Chaves primárias UUID, salvo sequências técnicas de alto volume.
- Integridade garantida no banco além da aplicação.
- RLS como defesa obrigatória para dados expostos ao cliente.
- Migrações versionadas; alterações manuais em produção são proibidas.
- Datas de negócio usam `date`; eventos usam `timestamptz` em UTC.
- Exclusão física é excepcional; registros históricos são preservados.
- Informações sensíveis não entram em logs livres.

## 2. Domínios principais

### Organização e acesso

| Entidade | Responsabilidade |
|---|---|
| `organizations` | limite de isolamento da Purple ou futuro cliente |
| `units` | unidade escolar, preparada para expansão |
| `departments` | Retenção, Pedagógico e Financeiro |
| `profiles` | identidade de negócio ligada ao usuário autenticado |
| `profile_scopes` | papéis e escopos explícitos por organização/unidade/setor |
| `approval_delegations` | delegações temporárias e auditáveis |

### Relatórios

| Entidade | Responsabilidade |
|---|---|
| `report_definitions` | tipo de relatório por setor e frequência |
| `metric_definitions` | chave, rótulo, tipo, unidade, fórmula e validação |
| `report_definition_versions` | schema vigente em determinada data |
| `report_periods` | período esperado e prazo de entrega |
| `reports` | identidade e estado corrente do relatório |
| `report_versions` | fotografia imutável de cada rascunho submetido |
| `report_metric_values` | valores tipados por versão e métrica |
| `report_adjustment_requests` | solicitação, itens, autor e resolução |
| `report_status_history` | transições de estado |
| `report_comments` | comentários contextuais, sem substituir ajustes formais |

### Execução e documentos

| Entidade | Responsabilidade |
|---|---|
| `action_plans` | plano ligado a relatório, setor e responsável |
| `action_plan_updates` | evolução imutável do plano |
| `attachments` | metadados dos arquivos privados |
| `generated_documents` | PDF, versão, hash e template |
| `notifications` | evento destinado a usuário |
| `notification_reads` | leitura por destinatário |
| `audit_logs` | trilha append-only de segurança e domínio |
| `app_settings` | configurações versionadas por escopo |

## 3. Relações essenciais

- Organização possui unidades; unidade possui setores habilitados.
- Perfil possui um ou mais escopos.
- Definição possui versões e métricas.
- Período mais setor mais definição identifica um relatório único.
- Relatório possui várias versões, mas uma única versão corrente aprovada.
- Ajuste referencia a versão analisada e a versão que o resolve.
- Plano de ação pode referenciar relatório e versão de origem.
- PDF referencia exatamente uma versão aprovada.

## 4. Restrições recomendadas

- Unicidade de relatório por organização, unidade, setor, frequência e período.
- `period_end >= period_start`.
- Frequência limitada ao catálogo ativo.
- Percentual entre 0 e 100, salvo definição explícita diferente.
- Prazo obrigatório para plano ativo.
- Aprovação exige versão submetida e usuário autorizado.
- Apenas uma versão aprovada corrente por relatório.
- Delegação com término posterior ao início.
- Hash único por documento gerado quando aplicável.

## 5. Valores estruturados versus JSON

Campos usados em filtros, regras, comparação ou dashboards devem ser normalizados. JSON pode armazenar snapshot do schema, preferências de apresentação e metadados extensíveis, nunca substituir indiscriminadamente métricas consultáveis.

Textos executivos podem permanecer na versão: resumo, causas, decisões, riscos e observações. Métricas devem ter definição e valor separados.

## 6. Versionamento

- `reports` mantém identidade e estado atual.
- `report_versions` é imutável após submissão.
- Ajuste cria nova versão; não altera a submetida.
- Definição de métrica possui validade temporal.
- Relatórios antigos continuam interpretados pelo schema original.

## 7. Segurança e RLS

- Toda linha contém `organization_id`; entidades operacionais também carregam `unit_id` e `department_id` quando aplicável.
- Direção lê dados dentro do escopo concedido.
- Líder lê e altera somente o próprio setor e estados permitidos.
- Consulta lê apenas escopos explicitamente atribuídos.
- Usuário nunca pode atualizar o próprio papel, setor, estado ativo ou organização.
- Operações privilegiadas usam funções servidoras pequenas e auditadas.
- Chave administrativa nunca é enviada ao navegador.

A matriz normativa está em [07 - Permissões](07%20-%20Permissões.md).

## 8. Auditoria

O log deve registrar `actor_id`, organização, ação, entidade, identificador, correlação, IP reduzido ou conforme política, agente do cliente quando necessário, antes/depois redigido e instante. Escrita ocorre no servidor ou por trigger; usuários comuns não atualizam nem excluem logs.

## 9. Índices iniciais

- Relatórios por organização/unidade/setor/período.
- Fila por status e data de submissão.
- Métricas por definição, versão e período.
- Ações por responsável, status e prazo.
- Notificações não lidas por destinatário.
- Auditoria por entidade, ator e data.

Índices serão validados por planos de consulta reais; duplicação prematura deve ser evitada.

## 10. Retenção, backup e recuperação

Políticas finais dependem de aprovação jurídica e da Direção. Proposta inicial:

- Relatórios, versões, aprovações e PDFs: retenção longa, a definir.
- Auditoria: retenção mínima definida por política interna.
- Notificações transitórias: expiração configurável.
- Backup automático, criptografado e testado por restauração.
- Objetivos RPO/RTO definidos antes da produção.

## 11. Migrações e ambientes

- Ambientes isolados: desenvolvimento, homologação e produção.
- Dados reais não são copiados para desenvolvimento.
- Seeds contêm somente dados fictícios.
- Migração passa por revisão, teste de avanço e estratégia de rollback.
- Mudanças destrutivas usam expansão, migração de dados e contração em releases separadas.

## 12. Pontos abertos

- Uma ou múltiplas unidades no lançamento.
- Prazo legal e operacional de retenção.
- Necessidade de anonimização de referências de alunos.
- Responsável por restaurações e testes de desastre.
- Volume esperado de anexos e PDFs.

## Documentos relacionados

- [07 - Permissões](07%20-%20Permissões.md)
- [08 - Relatórios](08%20-%20Relatórios.md)
- [10 - API](10%20-%20API.md)
