# Purple Gestão — Backlog Inicial

**Status:** Backlog de produto para refinamento  
**Priorização:** Must, Should, Could, Won't now

## 1. Regras de gestão

Este backlog descreve resultados, não compromissos de data. Antes de entrar em sprint, cada item deve atender à Definition of Ready de [01 - Roadmap](01%20-%20Roadmap.md). IDs são permanentes.

## 2. Épicos

### EP-00 — Governança da Fase 0 — Must

- **US-001:** Como Direção, quero aprovar visão e escopo para alinhar investimento.
- **US-002:** Como dono setorial, quero validar métricas e fórmulas para garantir significado.
- **US-003:** Como responsável de segurança, quero aprovar a matriz de acesso.
- **US-004:** Como Produto, quero registrar pontos abertos e decisões.

**Aceite:** 12 documentos aprovados, responsáveis identificados e pendências bloqueadoras encerradas.

### EP-01 — Fundação e ambientes — Must

- **US-010:** Estrutura versionada, ambientes isolados e configuração segura.
- **US-011:** Migrações de banco reproduzíveis.
- **US-012:** Pipeline de qualidade e implantação em homologação.
- **US-013:** Logs, métricas e tratamento de erros sem dados sensíveis.
- **US-014:** Backup e restauração documentados antes da produção.

### EP-02 — Identidade e acesso — Must

- **US-020:** Login e logout reais.
- **US-021:** Recuperação de senha.
- **US-022:** Convite, ativação e desativação de usuário.
- **US-023:** Papéis e escopos por setor/unidade.
- **US-024:** Direção vê todos os escopos autorizados.
- **US-025:** Líder vê somente o próprio setor.
- **US-026:** Consulta obedece concessões explícitas.
- **US-027:** Testes automatizados de RLS e autoelevação.

### EP-03 — Catálogo e calendário — Must

- **US-030:** Definir schemas versionados dos nove relatórios.
- **US-031:** Configurar calendários e prazos.
- **US-032:** Gerar períodos esperados.
- **US-033:** Configurar metas e limiares com vigência.

### EP-04 — Criação de relatórios — Must

- **US-040:** Criar rascunho por setor/frequência.
- **US-041:** Salvar e retomar rascunho.
- **US-042:** Validar métricas e campos no envio.
- **US-043:** Impedir relatório duplicado.
- **US-044:** Anexar arquivo privado.
- **US-045:** Submeter versão imutável.
- **US-046:** Detectar conflito de edição.

### EP-05 — Histórico e consulta — Must

- **US-050:** Listar relatórios com paginação.
- **US-051:** Filtrar por setor, frequência, período e status.
- **US-052:** Abrir detalhe e schema utilizado.
- **US-053:** Consultar versões e linha do tempo.
- **US-054:** Exportar somente dados autorizados.

### EP-06 — Revisão e aprovação — Must

- **US-060:** Direção acessa fila de análise.
- **US-061:** Iniciar revisão de forma rastreável.
- **US-062:** Solicitar ajuste com orientação obrigatória.
- **US-063:** Líder responder e reenviar nova versão.
- **US-064:** Direção aprovar versão válida.
- **US-065:** Bloquear alteração da versão aprovada.
- **US-066:** Arquivar sem apagar histórico.

### EP-07 — Planos de ação — Must

- **US-070:** Criar ação vinculada ao diagnóstico.
- **US-071:** Definir responsável, prazo, prioridade e resultado.
- **US-072:** Registrar progresso e evidência.
- **US-073:** Concluir ou cancelar com regra adequada.
- **US-074:** Visualizar ações próximas e atrasadas.
- **US-075:** Reatribuir ações de usuário desativado.

### EP-08 — Dashboards — Must

- **US-080:** Dashboard integrado da Direção.
- **US-081:** Dashboard de Retenção.
- **US-082:** Dashboard Pedagógico.
- **US-083:** Dashboard Financeiro.
- **US-084:** Filtros e comparação de períodos.
- **US-085:** Drill-down reconciliável.
- **US-086:** Estados de qualidade e ausência de dados.

### EP-09 — PDF e documentos — Must

- **US-090:** Gerar PDF oficial de versão aprovada.
- **US-091:** Armazenar hash, template e metadados.
- **US-092:** Baixar conforme permissão.
- **US-093:** Retentar falha sem duplicar documento.
- **US-094:** Diferenciar claramente rascunho e oficial.

### EP-10 — Notificações — Should

- **US-100:** Central interna de notificações.
- **US-101:** Notificar envio, ajuste, reenvio e aprovação.
- **US-102:** Alertar prazos de relatório e ação.
- **US-103:** Configurar e-mails transacionais mínimos.
- **US-104:** Marcar leitura por usuário.

### EP-11 — Administração e auditoria — Must

- **US-110:** Consultar auditoria por filtros autorizados.
- **US-111:** Administrar usuários sem obter conteúdo indevido.
- **US-112:** Governar definições de relatório e metas.
- **US-113:** Registrar exportações e acessos excepcionais conforme política.
- **US-114:** Delegar aprovação temporariamente.

### EP-12 — Qualidade e lançamento — Must

- **US-120:** Testes E2E dos fluxos críticos.
- **US-121:** Auditoria de acessibilidade WCAG AA.
- **US-122:** Testes de desempenho e consultas.
- **US-123:** Revisão de segurança e resposta a incidentes.
- **US-124:** Piloto com dados seguros.
- **US-125:** Treinamento e manual operacional.
- **US-126:** Plano de rollback e suporte de lançamento.

### EP-13 — Evoluções — Could

- **US-130:** Múltiplas unidades completas.
- **US-131:** MFA para perfis sensíveis.
- **US-132:** Integrações com fontes operacionais.
- **US-133:** BI externo com dados governados.
- **US-134:** Comentários contextuais e menções.
- **US-135:** Análises assistidas, sem decisão automática.

## 3. Primeira sequência sugerida

1. EP-00 Governança.
2. EP-01 Fundação e EP-02 Identidade.
3. EP-03 Catálogo.
4. EP-04 Relatórios e EP-05 Histórico.
5. EP-06 Aprovação.
6. EP-07 Ações.
7. EP-08 Dashboards.
8. EP-09 PDF.
9. EP-10/11 Notificações, administração e auditoria.
10. EP-12 Homologação e lançamento.

## 4. Dívidas e riscos a acompanhar

- Fórmulas ainda não validadas pelos setores.
- Política de Consulta pendente.
- Retenção de dados e RPO/RTO pendentes.
- Possível necessidade de dupla aprovação financeira.
- Volume e tipo de anexos desconhecidos.
- Integrações podem mudar origem e qualidade das métricas.

## 5. Won't now

- Aplicativo nativo.
- ERP, LMS ou CRM completos.
- Aprovação automática.
- Dados reais em desenvolvimento.
- Customização visual por usuário.
- API pública sem consumidor e governança definidos.

## 6. Métricas do backlog

Acompanhar lead time, itens bloqueados, defeitos escapados, cobertura dos fluxos críticos e valor entregue. Pontos ou velocidade não serão usados isoladamente como medida de produtividade.

## Documentos relacionados

- [00 - Vision](00%20-%20Vision.md)
- [01 - Roadmap](01%20-%20Roadmap.md)
- [02 - Funcionalidades](02%20-%20Funcionalidades.md)
- [09 - Regras de Negócio](09%20-%20Regras%20de%20Negócio.md)
