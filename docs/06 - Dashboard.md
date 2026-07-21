# Purple Gestão — Dashboards

**Status:** Especificação funcional proposta

## 1. Objetivo

Dashboards devem facilitar decisão, não substituir os relatórios. Todo indicador precisa ser rastreável até dados autorizados, com definição, período, unidade, atualização e estado de completude.

## 2. Contextos

### Direção integrada

- Entregas previstas, recebidas, atrasadas e pendentes de decisão.
- KPIs principais dos três setores.
- Alertas críticos e planos de ação atrasados.
- Tendências por frequência e período.
- Comparação entre realizado, meta e período anterior.
- Acesso rápido à fila de aprovação.

### Retenção

- Base ativa, alunos em risco, recuperação, cancelamentos.
- Rematrículas previstas, concluídas e taxa de conversão.
- Follow-ups e receita preservada.
- Motivos de risco/cancelamento e ações vencidas.

### Pedagógico

- Aulas realizadas/canceladas, frequência, desempenho.
- Alunos abaixo da média, turmas críticas e reforços.
- Ocorrências, pendências, feedbacks e reclamações.

### Financeiro

- Receita prevista/realizada, faturamento e saldo.
- Inadimplência, recuperação e acordos.
- Despesas fixas/variáveis, resultado e necessidade de caixa.
- Dados financeiros detalhados permanecem restritos conforme permissão.

## 3. Filtros

- Organização e unidade quando aplicável.
- Setor, limitado pelo acesso.
- Frequência: semanal, quinzenal ou mensal.
- Intervalo de períodos.
- Status do relatório.
- Comparação: período anterior ou mesmo período anterior, quando pertinente.

Filtros ativos devem permanecer visíveis, ser compartilháveis sem expor dados e ter ação clara de redefinição.

## 4. Componentes

- **Cartão KPI:** valor, unidade, tendência, meta e atualização.
- **Série temporal:** evolução de uma ou duas métricas comparáveis.
- **Barras:** previsto versus realizado ou distribuição por categoria.
- **Composição:** somente quando partes formam um total coerente.
- **Tabela de pendências:** item, responsável, prazo, status e ação.
- **Alertas:** severidade, motivo, limiar e link para origem.
- **Qualidade do dado:** relatórios faltantes, incompletos ou fora do prazo.

## 5. Definições transversais

- **Atual:** último relatório aprovado no filtro; se não houver, indicar explicitamente o estado usado.
- **Tendência:** variação percentual entre períodos comparáveis; divisão por zero produz “não aplicável”, não zero.
- **Meta:** configuração válida para o período e escopo.
- **Atrasado:** prazo de submissão ultrapassado sem versão válida enviada.
- **Pendente de decisão:** enviado, em análise ou com ajuste aguardando ação conforme o ator.

## 6. Estados de qualidade

- Completo e aprovado.
- Preliminar: enviado ou em análise.
- Ausente: período esperado sem relatório.
- Incomparável: schema ou unidade mudou.
- Parcial: algum setor ou período não está disponível.

Dados preliminares não podem parecer aprovados. A visão padrão executiva deve priorizar aprovados, com opção explícita para incluir preliminares.

## 7. Drill-down e reconciliação

Todo cartão e ponto de gráfico deve abrir a lista de relatórios ou valores que o compõem. A tela detalhada informa fórmula, filtros, schema e momento da consulta. Totais exportados devem coincidir com o mesmo filtro.

## 8. Atualização e desempenho

- Consultas são agregadas no servidor/banco.
- Cache, se usado, respeita usuário e escopo.
- A interface exibe última atualização.
- Metas iniciais: carregamento principal percebido em até 2,5 s em condição de referência e interação de filtro em até 1 s sempre que viável.
- Consultas lentas são observadas e otimizadas por evidência.

## 9. Privacidade

- Líder não recebe no payload métricas detalhadas de outro setor.
- Visões cruzadas, se criadas, usam indicadores agregados expressamente aprovados.
- Exportação requer a mesma autorização da tela.
- URLs não carregam informação sensível em texto aberto.

## 10. Acessibilidade e responsividade

Gráficos possuem descrição e alternativa tabular. Em telas pequenas, KPIs e pendências prioritárias aparecem antes de gráficos extensos. Interações não dependem de hover.

## 11. Critérios de aceite

- Valores reconciliam com relatórios de origem.
- Períodos sem dados não são convertidos em zero.
- Usuário não infere dados proibidos por totais ou mensagens.
- Mudança de filtro atualiza todos os componentes coerentemente.
- Fórmulas críticas possuem testes automatizados.

## Documentos relacionados

- [05 - Design System](05%20-%20Design%20System.md)
- [08 - Relatórios](08%20-%20Relatórios.md)
- [07 - Permissões](07%20-%20Permissões.md)
- [09 - Regras de Negócio](09%20-%20Regras%20de%20Negócio.md)
