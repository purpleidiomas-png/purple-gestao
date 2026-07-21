# Purple Gestão — Roadmap

**Status:** Proposta para aprovação  
**Horizonte:** longo prazo; datas definidas no planejamento de cada release

## 1. Estratégia de entrega

O produto será desenvolvido por incrementos utilizáveis, com gates de segurança e aceite. Prazo não substitui critério de qualidade. Cada release exige migrações reversíveis, testes, documentação e plano de implantação.

## 2. Fases

### Fase 0 — Arquitetura e documentação

**Objetivo:** aprovar a fonte de verdade antes de implementar.

- Visão, escopo e métricas de sucesso.
- Fluxos e regras de negócio.
- Modelo de dados e matriz de permissões.
- Contratos iniciais de API.
- Design system e especificação dos dashboards.
- Backlog priorizado e critérios de pronto.

**Gate:** aprovação formal dos 12 documentos e resolução dos pontos abertos.

### Fase 1 — Fundação segura

- Estrutura da aplicação, ambientes e CI.
- Autenticação, recuperação de senha e sessões.
- Perfis, setores e autorização no banco.
- Auditoria mínima e observabilidade.
- Testes automatizados da matriz de acesso.

**Gate:** nenhum perfil acessa dados fora do seu escopo.

### Fase 2 — Relatórios operacionais

- Relatórios semanais, quinzenais e mensais.
- Catálogo versionado de métricas.
- Rascunho, envio, histórico e filtros.
- Validações e prevenção de duplicidade.

**Gate:** os nove tipos setor × periodicidade funcionam de ponta a ponta.

### Fase 3 — Governança e decisão

- Revisão da Direção.
- Solicitação de ajuste e reenvio.
- Aprovação e congelamento de versão.
- Planos de ação e notificações.
- Linha do tempo e auditoria completa.

**Gate:** toda transição é autorizada, rastreável e testada.

### Fase 4 — Dashboards e documentos

- Dashboards setoriais e integrado.
- Comparações e metas.
- PDF oficial armazenado.
- Exportações autorizadas.

**Gate:** todo número do dashboard é reconciliável com sua fonte.

### Fase 5 — Homologação e produção controlada

- Testes E2E, acessibilidade, desempenho e segurança.
- Piloto com dados não sensíveis.
- Treinamento, suporte e plano de contingência.
- Implantação gradual e monitoramento.

**Gate:** aceite dos usuários, backup testado e riscos críticos encerrados.

### Fase 6 — Evolução

- Múltiplas unidades, integrações e SSO, se aprovados.
- Importações controladas e BI.
- Automação de lembretes e análises assistidas.
- Aplicativo móvel somente se houver caso de uso validado.

## 3. Organização por sprints

Sprints recomendadas de uma ou duas semanas. Cada sprint deve conter objetivo mensurável, histórias pequenas, demonstração, retrospectiva e atualização documental. O conteúdo inicial está em [11 - Backlog](11%20-%20Backlog.md).

## 4. Dependências

| Capacidade | Depende de |
|---|---|
| Relatórios | autenticação, perfis, setores, catálogo de métricas |
| Aprovação | relatórios versionados e máquina de estados |
| Dashboard | relatórios válidos e consultas agregadas |
| PDF | versão aprovada e armazenamento seguro |
| Notificações | eventos de domínio e preferências |
| Produção | observabilidade, backup, testes e treinamento |

## 5. Política de releases

- `major`: alteração incompatível de processo ou contrato.
- `minor`: capacidade compatível adicionada.
- `patch`: correção compatível.
- Banco evolui por migrações numeradas e revisadas.
- API pública evolui conforme [10 - API](10%20-%20API.md).
- Métricas mantêm versão própria conforme [08 - Relatórios](08%20-%20Relatórios.md).

## 6. Definition of Ready

Uma história entra em sprint quando tem valor, perfil, regra, critérios de aceite, dependências, riscos e desenho suficiente. Alterações em dados ou acesso exigem revisão de [04 - Banco](04%20-%20Banco.md) e [07 - Permissões](07%20-%20Permissões.md).

## 7. Definition of Done

- Critérios de aceite atendidos.
- Revisão de código e testes aplicáveis concluídos.
- Segurança e acessibilidade verificadas.
- Migração e rollback definidos quando necessário.
- Logs sem dados sensíveis.
- Documentação atualizada.
- Homologação do responsável de negócio quando aplicável.

## 8. Pontos de decisão antes da Sprint 1

- Confirmar responsáveis e substitutos de aprovação.
- Definir política final do perfil Consulta.
- Validar catálogo e fórmula de cada indicador.
- Confirmar calendário de fechamento.
- Aprovar retenção de dados e PDFs.
- Definir unidades organizacionais iniciais.

## Documentos relacionados

- [00 - Vision](00%20-%20Vision.md)
- [11 - Backlog](11%20-%20Backlog.md)
- [02 - Funcionalidades](02%20-%20Funcionalidades.md)
