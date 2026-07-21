# Purple Gestão — Especificação de Relatórios

**Status:** Catálogo inicial para validação dos responsáveis setoriais

## 1. Estrutura comum

Todo relatório contém organização/unidade, setor, frequência, início/fim, prazo, responsável, versão, status, data de apresentação, destinatários, métricas, causas, resumo executivo, riscos, decisões, casos prioritários, planos de ação, anexos e histórico.

Rascunho aceita incompletude; envio exige os campos definidos como obrigatórios no schema vigente.

## 2. Frequências

- **Semanal:** acompanhamento operacional e ações imediatas.
- **Quinzenal:** tendência curta e revisão de execução.
- **Mensal:** fechamento consolidado e decisão estratégica.

Calendário, cortes e prazos são configurados pela organização. Um período sempre possui início/fim explícitos; nomes como “primeira quinzena” não substituem datas.

## 3. Retenção

### Semanal

- Base ativa de alunos.
- Alunos em risco.
- Follow-ups realizados.
- Rematrículas previstas e concluídas.
- Cancelamentos.
- Receita preservada.
- Pendências críticas.

### Quinzenal

- Base ativa.
- Alunos em risco e recuperados.
- Follow-ups.
- Rematrículas previstas/concluídas.
- Cancelamentos.
- Receita preservada.

### Mensal

- Base ativa.
- Alunos em risco.
- Rematrículas previstas/concluídas.
- Cancelamentos.
- Receita preservada e perdida.
- Satisfação média.

Motivos iniciais: faltas, inadimplência, insatisfação, dificuldade pedagógica, mudança de horário, desistência e outros. “Outros” exige descrição.

## 4. Pedagógico

### Semanal

- Aulas realizadas e canceladas.
- Atrasos/faltas de professores.
- Planejamentos enviados.
- Registros acadêmicos preenchidos.
- Tarefas/testes aplicados.
- Alunos com baixo desempenho.
- Pendências pedagógicas.

### Quinzenal

- Aulas realizadas/canceladas.
- Ocorrências com professores.
- Turmas críticas.
- Alunos com baixo rendimento.
- Reforços realizados.
- Pendências acadêmicas.
- Feedbacks aplicados.

### Mensal

- Frequência média.
- Média geral das turmas.
- Aulas realizadas.
- Ocorrências com professores.
- Reforços.
- Alunos abaixo da média.
- Pendências e reclamações pedagógicas.

Motivos iniciais: atrasos, faltas, planejamentos, registros, engajamento, aprendizagem, reclamações e substituições.

## 5. Financeiro

### Semanal

- Saldo inicial, entradas, saídas e saldo final.
- Mensalidades recebidas e em atraso.
- Acordos realizados.
- Contas urgentes.

### Quinzenal

- Receita prevista e realizada.
- Inadimplência.
- Acordos realizados e quebrados.
- Despesas não previstas.
- Saldo atual.
- Necessidade de caixa.

### Mensal

- Faturamento bruto.
- Receita recebida.
- Inadimplência e recuperação de atrasados.
- Despesas fixas e variáveis.
- Resultado líquido.
- Caixa final.

Motivos iniciais: inadimplência, acordos, despesas não previstas, vencimentos, cobranças, caixa, projeção e outros.

## 6. Fórmulas candidatas

As fórmulas abaixo precisam de validação de negócio antes de serem normativas:

- Taxa de rematrícula = concluídas ÷ previstas × 100.
- Taxa de recuperação = recuperados ÷ alunos em risco acompanhados × 100.
- Taxa de cancelamento = cancelamentos ÷ base aplicável × 100.
- Realização de receita = receita realizada ÷ prevista × 100.
- Resultado líquido = receita reconhecida para a regra adotada − despesas.
- Frequência média = presenças ÷ oportunidades de presença × 100.

Denominador zero resulta em “não aplicável”. A definição deve dizer se a base é inicial, final ou média e qual fonte operacional alimenta o número.

## 7. Tipos e validações

- Contagem: inteiro não negativo.
- Moeda: decimal em BRL, precisão de centavos.
- Percentual: decimal entre 0 e 100, salvo regra documentada.
- Média: escala e arredondamento definidos por métrica.
- Texto: limites razoáveis, sem informação pessoal desnecessária.
- Datas: dentro do contexto esperado ou justificadas.

## 8. Versionamento do catálogo

Cada métrica possui chave estável, nome, descrição, tipo, unidade, fórmula, origem, periodicidade, obrigatoriedade, validação e vigência. Mudança de significado cria nova versão. Relatórios históricos mantêm o snapshot utilizado.

## 9. Status e edição

- Rascunho: editável pelo autor autorizado.
- Enviado: versão congelada, aguardando análise.
- Em análise: Direção revisando.
- Ajuste solicitado: orientação formal aberta.
- Aprovado: versão imutável e apta a PDF.
- Arquivado: encerrado e preservado.

Transições completas estão em [03 - Fluxos](03%20-%20Fluxos.md).

## 10. PDF oficial

O PDF inclui código do relatório, versão, setor, frequência, período, situação, autoria, data de submissão, aprovação, métricas com unidades, resumo, causas, decisões, ações e anexos referenciados. Deve registrar template, hash do arquivo e instante de geração.

Marca d'água diferencia rascunho de aprovado. Somente o documento aprovado é “oficial”. Correção gera nova versão e novo PDF; o anterior não é sobrescrito.

## 11. Privacidade e minimização

Referências de alunos devem usar o mínimo necessário. Nomes completos, dados de saúde, documentos, detalhes financeiros individuais ou observações sensíveis só entram após definição de finalidade, base de acesso e retenção. Dashboards preferem agregados.

## 12. Critérios de aceite

- Os nove conjuntos setor × frequência possuem schema validado pelo dono do processo.
- Fórmulas são reproduzíveis e testadas.
- Nenhum campo muda de sentido retroativamente.
- Relatório enviado preserva fotografia integral.
- PDF coincide com a versão aprovada.

## 13. Pendências de validação

- Fonte operacional de cada indicador.
- Definições oficiais de base ativa, risco, inadimplência e receita.
- Regras de arredondamento e competência financeira.
- Campos obrigatórios e limiares por frequência.
- Calendário de fechamento e tolerância.
- Necessidade de identificação individual de casos.

## Documentos relacionados

- [04 - Banco](04%20-%20Banco.md)
- [06 - Dashboard](06%20-%20Dashboard.md)
- [09 - Regras de Negócio](09%20-%20Regras%20de%20Negócio.md)
- [05 - Design System](05%20-%20Design%20System.md)
