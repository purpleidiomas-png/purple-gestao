# Purple Gestão — Visão do Produto

**Documento:** 00  
**Status:** Proposta para aprovação  
**Versão:** 0.1  
**Última atualização:** 16/07/2026  
**Responsáveis:** Produto e Direção Purple

## 1. Propósito

O Purple Gestão será a fonte oficial para criação, análise, aprovação e preservação dos relatórios gerenciais da Purple Idiomas. O produto transformará dados periódicos de Retenção, Pedagógico e Financeiro em decisões rastreáveis e planos de ação acompanháveis.

O sistema deve substituir documentos dispersos, mensagens e controles locais por um fluxo seguro, simples e auditável, preservando a confidencialidade de cada setor e dando à Direção uma visão integrada.

## 2. Problema

O processo atual pode gerar versões conflitantes, perda de contexto, indicadores sem histórico, atrasos de aprovação, ausência de responsáveis e exposição indevida de informações. O protótipo existente valida conceitos e interface, mas não oferece autenticação, autorização ou persistência adequadas para uso oficial.

## 3. Visão

> Permitir que cada liderança informe o que ocorreu, que a Direção compreenda por que ocorreu e que a organização acompanhe o que será feito em seguida.

## 4. Objetivos

- Padronizar relatórios semanais, quinzenais e mensais.
- Isolar dados detalhados por setor e consolidar a visão da Direção.
- Garantir aprovação, ajustes, versionamento e auditoria.
- Transformar achados em planos de ação com prazo e responsável.
- Apresentar tendências por dashboards e gráficos confiáveis.
- Gerar PDF oficial correspondente à versão aprovada.
- Construir uma base extensível para novas unidades e módulos.

## 5. Usuários

- **Direção:** acompanha todos os setores, revisa, solicita ajustes, aprova e administra o domínio gerencial.
- **Líder de setor:** cria e acompanha relatórios do próprio setor e executa planos de ação autorizados.
- **Consulta:** lê somente o escopo explicitamente concedido.
- **Administrador técnico:** mantém a plataforma sem obter, por padrão, autoridade gerencial para aprovação.

Detalhes em [07 - Permissões](07%20-%20Permissões.md).

## 6. Escopo inicial

A primeira entrega contempla autenticação real, acesso setorial, relatórios dos três setores nas três periodicidades, dashboards, histórico, aprovação, ajustes, planos de ação, notificações internas, auditoria e PDF.

Ficam fora do primeiro MVP: folha de pagamento, cobrança automática, diário acadêmico, CRM completo, comunicação com responsáveis, BI externo, aplicativo nativo e automações decisórias por IA. Integrações futuras devem entrar pelo processo do [01 - Roadmap](01%20-%20Roadmap.md).

## 7. Princípios do produto

1. **Segurança no servidor:** a interface nunca é a única barreira de acesso.
2. **Menor privilégio:** acesso concedido apenas ao necessário.
3. **Versão aprovada imutável:** correções posteriores criam nova versão.
4. **Dados explicáveis:** indicadores exibem definição, período e origem.
5. **Ação vinculada ao diagnóstico:** pendências relevantes geram acompanhamento.
6. **Simplicidade operacional:** o fluxo deve caber na rotina das lideranças.
7. **Auditoria por padrão:** eventos relevantes são registrados automaticamente.
8. **Evolução por configuração:** métricas mudam com versão, não por edição silenciosa.

## 8. Indicadores de sucesso

- 100% dos relatórios obrigatórios entregues no sistema.
- 100% das aprovações e ajustes com autoria e data registradas.
- Zero leitura cruzada indevida nos testes automatizados de permissão.
- Pelo menos 95% dos relatórios entregues dentro do prazo após estabilização.
- PDF reproduzível e idêntico à versão aprovada.
- Redução do tempo entre fechamento e decisão da Direção.
- Planos críticos sem responsável ou prazo igual a zero.

## 9. Premissas e restrições

- A primeira versão atende uma organização, preparada para múltiplas unidades.
- Português do Brasil, moeda BRL e fuso `America/Sao_Paulo` são os padrões iniciais.
- Dados pedagógicos e financeiros são confidenciais.
- O sistema não deve receber dados reais antes da homologação de segurança.
- O desenvolvimento será iniciado somente após aprovação desta documentação.

## 10. Riscos estratégicos

| Risco | Mitigação |
|---|---|
| Métricas sem definição comum | Catálogo versionado em [08 - Relatórios](08%20-%20Relatórios.md) |
| Permissões excessivas | RLS, testes de matriz e revisão em [07 - Permissões](07%20-%20Permissões.md) |
| Prazo curto reduzir qualidade | Entregas graduais e gates no [01 - Roadmap](01%20-%20Roadmap.md) |
| Baixa adesão | Formulários claros, piloto e treinamento |
| PDF divergir do banco | Documento gerado no servidor a partir de versão congelada |
| Crescimento desorganizado | ADRs, versionamento de API e backlog governado |

## 11. Governança documental

Os documentos de `docs/` formam a arquitetura oficial. Mudanças relevantes devem registrar motivo, impacto, responsável e data. Decisões técnicas irreversíveis deverão futuramente ter Architecture Decision Records (ADRs).

## 12. Critério de aprovação da Fase 0

A Fase 0 termina quando Direção, Produto e Tecnologia concordarem com escopo, fluxos, dados, permissões, relatórios, regras, contrato de API, design e backlog. Pontos abertos devem ser resolvidos ou formalmente adiados antes da Sprint 1.

## Documentos relacionados

- [01 - Roadmap](01%20-%20Roadmap.md)
- [02 - Funcionalidades](02%20-%20Funcionalidades.md)
- [09 - Regras de Negócio](09%20-%20Regras%20de%20Negócio.md)
- [11 - Backlog](11%20-%20Backlog.md)
