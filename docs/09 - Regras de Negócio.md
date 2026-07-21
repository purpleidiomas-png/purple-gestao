# Purple Gestão — Regras de Negócio

**Status:** Regras propostas para aprovação  
**Convenção:** identificadores `RN-XXX` são estáveis

## 1. Identidade e acesso

- **RN-001:** somente perfil ativo com sessão válida acessa área protegida.
- **RN-002:** autorização combina papel e escopo; nenhuma regra depende apenas da interface.
- **RN-003:** usuário não altera o próprio papel, escopo, organização ou estado.
- **RN-004:** desativação revoga sessões e preserva autoria histórica.
- **RN-005:** acesso temporário exige justificativa, vigência e auditoria.
- **RN-006:** pelo menos um responsável de Direção deve permanecer ativo por organização.

## 2. Períodos e obrigatoriedade

- **RN-010:** todo relatório pertence a um setor, frequência e período explícito.
- **RN-011:** fim não pode anteceder início.
- **RN-012:** não pode existir mais de um relatório corrente para a mesma combinação organização, unidade, setor, definição e período.
- **RN-013:** períodos esperados são gerados pelo calendário vigente.
- **RN-014:** envio após o prazo é permitido, mas marcado como atrasado.
- **RN-015:** período sem movimento exige relatório com valores adequados e justificativa; ausência não equivale a zero.

## 3. Preenchimento e validação

- **RN-020:** rascunho pode estar incompleto.
- **RN-021:** envio exige todos os campos obrigatórios e validações do schema vigente.
- **RN-022:** métrica calculada não é editada diretamente, salvo exceção documentada.
- **RN-023:** “Outros” exige descrição.
- **RN-024:** valores fora de limiar plausível exigem confirmação ou justificativa conforme definição.
- **RN-025:** denominador zero retorna “não aplicável”.
- **RN-026:** schema aplicável é congelado junto da versão submetida.

## 4. Versionamento e estados

- **RN-030:** submissão cria versão imutável.
- **RN-031:** ajuste nunca altera a versão analisada; cria trabalho para uma nova versão.
- **RN-032:** somente transições definidas em [03 - Fluxos](03%20-%20Fluxos.md) são válidas.
- **RN-033:** aprovação exige Direção autorizada e versão submetida corrente.
- **RN-034:** autor não aprova a própria submissão, salvo política de exceção formalmente aprovada.
- **RN-035:** relatório aprovado só é corrigido por nova revisão/versionamento.
- **RN-036:** apenas aprovado pode ser arquivado.
- **RN-037:** arquivar não exclui nem anonimiza automaticamente.

## 5. Ajustes e aprovação

- **RN-040:** solicitação de ajuste exige comentário e identificação do que deve ser corrigido.
- **RN-041:** ajuste aberto permanece ligado à versão que o originou.
- **RN-042:** reenvio deve informar quais ajustes foram atendidos.
- **RN-043:** aprovação registra ator, data, versão e escopo.
- **RN-044:** delegação de aprovação válida substitui temporariamente a autoridade no escopo definido.

## 6. Planos de ação

- **RN-050:** plano ativo possui título, responsável, prioridade, prazo e resultado esperado.
- **RN-051:** plano vinculado mantém referência ao relatório e versão de origem.
- **RN-052:** progresso fica entre 0 e 100.
- **RN-053:** conclusão exige resultado obtido; evidência pode ser obrigatória por configuração.
- **RN-054:** cancelamento exige justificativa.
- **RN-055:** atraso é calculado pela data local da organização e não encerra o plano automaticamente.
- **RN-056:** desativação do responsável exige reatribuição das ações abertas.

## 7. Dashboard e indicadores

- **RN-060:** dashboard padrão executivo utiliza dados aprovados.
- **RN-061:** dados preliminares só aparecem quando explicitamente selecionados e identificados.
- **RN-062:** ausência, zero e não aplicável são estados distintos.
- **RN-063:** comparação usa períodos e schemas compatíveis.
- **RN-064:** todo indicador informa unidade, período e origem.
- **RN-065:** metas são avaliadas conforme versão válida no período.

## 8. Arquivos e PDF

- **RN-070:** anexos ficam privados e herdam permissão do relatório.
- **RN-071:** tipo, tamanho, nome e conteúdo passam por validações de segurança.
- **RN-072:** anexo submetido não é substituído silenciosamente.
- **RN-073:** PDF oficial só é gerado de versão aprovada.
- **RN-074:** PDF registra hash e template; regeneração não apaga o histórico.
- **RN-075:** falha de geração cria pendência operacional observável.

## 9. Notificações e auditoria

- **RN-080:** notificação informa evento, mas não substitui o estado do sistema.
- **RN-081:** leitura de uma notificação é individual.
- **RN-082:** auditoria é append-only para usuários comuns.
- **RN-083:** evento auditado inclui ator, ação, recurso, data e correlação.
- **RN-084:** segredos e conteúdo sensível desnecessário não entram em logs.

## 10. Privacidade e retenção

- **RN-090:** coletar somente dados necessários à finalidade gerencial.
- **RN-091:** exportação respeita o mesmo escopo da consulta.
- **RN-092:** retenção e anonimização seguem política aprovada, sem exclusão ad hoc.
- **RN-093:** dados reais não são copiados para desenvolvimento.

## 11. Concorrência e integridade

- **RN-100:** comandos com efeito aceitam idempotência quando houver risco de repetição.
- **RN-101:** edição concorrente não sobrescreve versão mais recente silenciosamente.
- **RN-102:** sucesso só é exibido após confirmação persistida.
- **RN-103:** falha de notificação não reverte uma transação de negócio concluída.

## 12. Gestão das regras

Alterar uma regra exige análise de impacto em banco, API, interface, relatórios, testes, dados históricos e documentação. Regra removida permanece registrada no histórico de versões deste documento.

## Documentos relacionados

- [03 - Fluxos](03%20-%20Fluxos.md)
- [07 - Permissões](07%20-%20Permissões.md)
- [08 - Relatórios](08%20-%20Relatórios.md)
- [10 - API](10%20-%20API.md)
