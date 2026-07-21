# Purple Gestão — Catálogo de Funcionalidades

**Status:** Proposta para aprovação

## 1. Escopo funcional

Este catálogo define capacidades; detalhes de fluxo, permissão e regra pertencem respectivamente a [03 - Fluxos](03%20-%20Fluxos.md), [07 - Permissões](07%20-%20Permissões.md) e [09 - Regras de Negócio](09%20-%20Regras%20de%20Negócio.md).

## 2. Autenticação e conta

- Login por e-mail e senha.
- Logout e invalidação de sessão.
- Recuperação e redefinição de senha.
- Convite e ativação de usuário.
- Bloqueio de usuário inativo.
- Visualização de perfil e troca de senha.
- Sessões com expiração e revogação.
- MFA como evolução recomendada para Direção.

## 3. Usuários, setores e acesso

- Cadastro administrativo de perfil.
- Vínculo a organização, unidade e setor.
- Papéis Direção, Líder, Consulta e Administrador técnico.
- Ativação, desativação e histórico de acesso.
- Escopo de consulta explícito.
- Substituição temporária de aprovador, com início e fim.

## 4. Relatórios

- Criação semanal, quinzenal e mensal.
- Formulário específico de Retenção, Pedagógico ou Financeiro.
- Rascunho, validação, envio e reenvio.
- Resumo executivo, causas, decisões, casos prioritários e anexos.
- Métricas calculadas e comparativas.
- Histórico, filtros, paginação e busca.
- Versionamento e trilha de status.
- Prevenção de duplicidade por período.
- Exportação autorizada.

Especificação completa em [08 - Relatórios](08%20-%20Relatórios.md).

## 5. Revisão e aprovação

- Fila de relatórios aguardando Direção.
- Início de análise.
- Comentário de ajuste obrigatório.
- Resposta e reenvio pelo setor.
- Aprovação com autoria e data.
- Congelamento da versão aprovada.
- Arquivamento controlado.

## 6. Dashboards

- Painel integrado da Direção.
- Painel exclusivo de cada setor.
- Filtros por período, frequência e unidade.
- KPIs, evolução, metas, alertas e pendências.
- Navegação do gráfico para os relatórios de origem.
- Indicação de atualização, unidade e fórmula.

Detalhes em [06 - Dashboard](06%20-%20Dashboard.md).

## 7. Planos de ação

- Criação vinculada a relatório ou independente, se autorizada.
- Título, diagnóstico, resultado esperado, responsável, prioridade e prazo.
- Progresso, atualizações, evidências e histórico.
- Estados: pendente, em andamento, concluído e cancelado.
- Alertas de proximidade e atraso.
- Aprovação ou validação de conclusão quando configurado.

## 8. Documentos e anexos

- Upload validado por tipo e tamanho.
- Download por URL temporária e autorizada.
- Geração de PDF oficial da versão aprovada.
- Armazenamento do PDF com hash e metadados.
- Regeneração idempotente e rastreável.

## 9. Notificações

- Relatório enviado, ajuste solicitado, reenvio e aprovação.
- Prazo de relatório próximo ou vencido.
- Plano de ação próximo ou atrasado.
- Centro interno de notificações e leitura por usuário.
- E-mail opcional, configurável e sem conteúdo sensível excessivo.

## 10. Auditoria e administração

- Registro de autenticação relevante e ações de domínio.
- Consulta pela Direção e perfis autorizados.
- Catálogo de métricas, metas e calendários versionados.
- Gestão de prazos e configurações.
- Exportação administrativa com justificativa quando necessária.

## 11. Requisitos não funcionais

- Segurança alinhada a OWASP e menor privilégio.
- Disponibilidade e recuperação compatíveis com criticidade definida.
- Interface responsiva e WCAG 2.2 AA como meta.
- Datas e valores localizados para o Brasil.
- Páginas principais com resposta percebida rápida.
- Logs estruturados, métricas e alertas operacionais.
- Proteção de dados conforme LGPD e política interna.
- Compatibilidade com versões atuais dos navegadores principais.

## 12. Fora de escopo do MVP

- ERP financeiro e emissão de cobrança.
- LMS, notas e presença em nível transacional.
- CRM de captação e retenção completo.
- Mensageria direta com alunos ou responsáveis.
- Edição colaborativa em tempo real.
- Decisão ou aprovação automática por IA.

## 13. Critérios globais de aceite

- Toda funcionalidade respeita a matriz de acesso no servidor.
- Alterações relevantes aparecem na auditoria.
- Erros não expõem dados internos.
- A interface possui estados de carregamento, vazio, sucesso e falha.
- Operações repetidas não criam duplicidade indevida.

## Documentos relacionados

- [03 - Fluxos](03%20-%20Fluxos.md)
- [06 - Dashboard](06%20-%20Dashboard.md)
- [08 - Relatórios](08%20-%20Relatórios.md)
- [11 - Backlog](11%20-%20Backlog.md)
