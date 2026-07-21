# Purple Gestão — Permissões e Segurança de Acesso

**Status:** Política proposta; decisões pendentes identificadas

## 1. Modelo

O acesso combina papel e escopo. Papel define o que uma pessoa pode fazer; escopo define onde. Nenhum papel global é inferido pelo e-mail ou pela interface.

Dimensões de escopo: organização, unidade, setor e, para Consulta, concessão explícita. A negação prevalece quando perfil está inativo, sessão inválida ou recurso fora do escopo.

## 2. Papéis

- **Direção:** autoridade gerencial sobre os escopos atribuídos.
- **Líder de setor:** operação e leitura do próprio setor.
- **Consulta:** leitura estrita dos escopos concedidos.
- **Administrador técnico:** gestão técnica de contas/configurações autorizadas, sem poder aprovar relatórios por padrão.
- **Serviço:** identidade não humana, restrita a jobs específicos.

## 3. Matriz de alto nível

| Recurso/Ação | Direção | Líder | Consulta | Admin técnico |
|---|---:|---:|---:|---:|
| Dashboard integrado | Sim | Não | Se concedido | Não por padrão |
| Dashboard do próprio setor | Sim | Sim | Se concedido | Não por padrão |
| Criar relatório | Opcional/administração | Próprio setor | Não | Não |
| Editar rascunho | Sim, excepcional | Próprio/autorizado | Não | Não |
| Enviar relatório | Sim, excepcional | Próprio/autorizado | Não | Não |
| Solicitar ajuste | Sim | Não | Não | Não |
| Aprovar/arquivar | Sim | Não | Não | Não |
| Ler versão/PDF | Escopo | Próprio setor | Concedido | Somente suporte autorizado |
| Criar ação | Escopo | Próprio setor | Não | Não |
| Atualizar ação | Escopo | Responsável ou regra setorial | Não | Não |
| Gerenciar usuários | Direção limitada | Não | Não | Sim, sem autoelevação |
| Ver auditoria | Sim | Próprios eventos quando aprovado | Não | Segurança limitada |
| Configurar métricas/metas | Sim com governança | Não | Não | Operação técnica sem decisão de negócio |

## 4. Regras obrigatórias

- Usuário não altera o próprio papel, escopo, organização ou estado ativo.
- Líder nunca lê detalhes de outro setor pela API, banco, exportação, erro ou cache.
- Direção não aprova relatório que ela própria submeteu sem política explícita de exceção.
- Admin técnico não herda acesso ao conteúdo por administrar identidade.
- Desativação revoga sessões.
- Acesso temporário possui justificativa, início, fim e auditoria.
- Download de arquivo é reautorizado a cada solicitação.

## 5. Escopo do perfil Consulta

Decisão pendente antes da Sprint 1. Opções permitidas pela arquitetura:

1. Consulta global somente de relatórios aprovados.
2. Consulta por unidade/setor somente de aprovados.
3. Consulta por lista explícita de recursos.

Recomendação: opção 2, com concessões explícitas, prazo opcional e somente conteúdo aprovado.

## 6. Segregação de funções

Quando a equipe permitir:

- Autor e aprovador devem ser pessoas diferentes.
- Delegação de aprovação não pode ser criada pelo beneficiário.
- Mudança de papel sensível exige segundo responsável ou, no mínimo, alerta e revisão.
- Operações de suporte em produção usam acesso temporário e auditado.

## 7. Aplicação técnica

- Middleware protege navegação, mas não substitui autorização de domínio.
- API valida sessão, papel, escopo, estado e propriedade.
- RLS impede acesso direto indevido ao banco.
- Funções privilegiadas têm contrato pequeno e busca segura de contexto.
- Chaves de serviço permanecem apenas no servidor.
- Cache inclui escopo de autorização na chave e é invalidado em mudanças de acesso.

## 8. Arquivos, PDF e exportações

Buckets são privados. URLs assinadas têm curta duração. Arquivo herda o escopo do relatório. PDF aprovado não pode ser substituído; regeneração cria registro rastreável. Exportações em massa podem exigir permissão e justificativa adicionais.

## 9. Auditoria e alertas

Registrar login relevante, falhas anômalas, convite, redefinição, alteração de perfil, concessão, leitura/exportação sensível quando definida, submissão, ajuste, aprovação, arquivamento e acesso técnico excepcional.

## 10. Testes obrigatórios

- Testes positivos e negativos para cada célula da matriz.
- Tentativa de trocar IDs em URLs e payloads.
- Autoelevação e alteração de setor.
- Leitura de anexos por URL reaproveitada.
- Sessão de usuário desativado.
- Cache entre usuários de escopos diferentes.
- Funções de serviço chamadas sem credencial correta.

## 11. Resposta a incidentes de acesso

Revogar sessões e credenciais, preservar evidências, identificar recursos afetados, comunicar responsáveis segundo política, corrigir causa e registrar lições. O procedimento operacional detalhado deverá existir antes da produção.

## 12. Pontos abertos

- Política final de Consulta.
- Exigência de MFA.
- Aprovação em ausência da Direção.
- Necessidade de dupla aprovação para Financeiro.
- Regras de exportação em massa.

## Documentos relacionados

- [04 - Banco](04%20-%20Banco.md)
- [03 - Fluxos](03%20-%20Fluxos.md)
- [10 - API](10%20-%20API.md)
- [09 - Regras de Negócio](09%20-%20Regras%20de%20Negócio.md)
