# Purple Gestão — Design System

**Status:** Diretrizes propostas a partir da identidade do protótipo

## 1. Princípios de experiência

- Clareza antes de decoração.
- Status nunca depende apenas de cor.
- Formulários explicam o significado dos dados.
- Ação primária é única e previsível por contexto.
- Informações sensíveis aparecem apenas quando necessárias.
- Desktop e celular preservam as mesmas regras de acesso.

## 2. Identidade

A identidade Purple usa roxos como eixo institucional e laranja como destaque controlado. Verde, amarelo, vermelho e azul são semânticos. Os valores finais serão extraídos e consolidados do protótipo durante a implementação, mantendo contraste WCAG 2.2 AA.

### Tokens obrigatórios

- Cores: `brand`, `surface`, `text`, `border`, `success`, `warning`, `danger`, `info`.
- Tipografia: família, tamanhos, pesos, altura de linha.
- Espaçamento em escala consistente.
- Bordas, raios, sombras e elevação.
- Breakpoints e largura máxima de conteúdo.
- Duração e curva de movimento, respeitando redução de animação.

Tokens são semânticos; componentes não devem depender de valores hexadecimais dispersos.

## 3. Tipografia

- Títulos curtos e hierarquia previsível.
- Corpo com no mínimo 16 px em formulários essenciais quando necessário para legibilidade móvel.
- Valores financeiros usam números tabulares quando disponível.
- Caixa alta apenas em rótulos breves.
- Datas, moedas e percentuais seguem localização brasileira.

## 4. Layout

- Navegação lateral no desktop e painel modal no móvel.
- Cabeçalho informa página, contexto setorial e ações globais.
- Conteúdo usa grid responsivo e largura legível.
- Tabelas extensas permitem rolagem e possuem alternativa em cards no móvel quando necessário.
- Ações de formulário permanecem visíveis sem encobrir conteúdo.

## 5. Componentes base

- Botão: primário, secundário, discreto, sucesso e destrutivo.
- Campo: texto, número, moeda, percentual, data, seleção e área de texto.
- Checkbox, radio, switch e seletor de período.
- Card, painel, modal, drawer, tooltip e popover.
- Tabela, paginação, filtros e busca.
- Badge de status e prioridade com ícone/texto.
- Toast para confirmação não crítica; banner para falhas persistentes.
- Skeleton, spinner, vazio, erro e acesso negado.
- Gráfico com legenda, descrição textual e tabela alternativa.

## 6. Padrões de formulário

- Rótulo sempre visível; placeholder não substitui rótulo.
- Ajuda explica conceito e unidade.
- Obrigatoriedade é indicada antes do envio.
- Erro aparece junto ao campo e em resumo acessível.
- Valores calculados são somente leitura e mostram fórmula.
- Rascunho informa último salvamento.
- Saída com alterações pendentes pede confirmação.
- Ações destrutivas exigem confirmação proporcional ao impacto.

## 7. Estados semânticos

Status oficiais: Rascunho, Enviado, Em análise, Ajuste solicitado, Aprovado e Arquivado. Cada estado terá texto, ícone e cor consistentes em todo o produto. Prioridades: Alta, Média e Baixa.

## 8. Gráficos

- Não usar gráfico 3D.
- Escalas não devem distorcer diferenças.
- Eixo, unidade, período e origem devem estar visíveis.
- Cor não é o único diferenciador de séries.
- Tooltip é complemento, não única forma de leitura.
- Usuário consegue abrir os dados de origem.
- Séries financeiras e percentuais não compartilham eixo sem explicação explícita.

## 9. Acessibilidade

- Navegação completa por teclado.
- Foco visível e ordem lógica.
- HTML semântico e nomes acessíveis.
- Modais retêm e devolvem foco.
- Contraste AA e alvos de toque adequados.
- Mensagens dinâmicas anunciadas quando necessário.
- Preferência `prefers-reduced-motion` respeitada.
- PDFs devem ter estrutura acessível quando a tecnologia escolhida permitir.

## 10. Conteúdo e linguagem

- Português direto, respeitoso e orientado à ação.
- Evitar termos técnicos para usuários finais.
- Botões usam verbo: “Enviar para análise”, “Solicitar ajuste”.
- Confirmações descrevem efeito real.
- Datas evitam ambiguidade; períodos exibem início e fim.
- Mensagens de erro orientam correção sem culpar o usuário.

## 11. PDF e impressão

O PDF oficial contém identidade, setor, frequência, período, status, versão, autoria, aprovação, métricas, análise e planos associados. Layout não depende da tela e segue template versionado. Regras detalhadas em [08 - Relatórios](08%20-%20Relatórios.md).

## 12. Governança

- Componentes novos exigem caso de uso não atendido pelos existentes.
- Mudanças visuais passam por revisão de acessibilidade.
- Estados e tokens são documentados junto à implementação.
- O protótipo é referência visual, não contrato absoluto.

## Documentos relacionados

- [06 - Dashboard](06%20-%20Dashboard.md)
- [08 - Relatórios](08%20-%20Relatórios.md)
- [02 - Funcionalidades](02%20-%20Funcionalidades.md)
