# Purple Gestão Next — Fase 0

## 1. Objetivo desta fase

Esta fase serve para congelar o estado funcional do frontend legado antes de qualquer reconstrução.

O foco é:

- preservar o backend exatamente como está;
- documentar tudo o que o frontend atual já faz;
- mapear dependências e permissões;
- transformar o inventário em checklist de migração;
- evitar perda de comportamento na transição para o Purple Gestão Next.

## 2. Backup do frontend legado

Backup integral criado em:

- `/private/tmp/Purple_Gestao_Legado_Backup_2026-07-18/`

Regras observadas:

- nenhum arquivo foi apagado;
- o frontend legado continua disponível como referência funcional;
- o backup não altera Supabase, Vercel, domínio ou dados.

## 3. Visão geral do frontend legado

O frontend atual é um app estático em HTML/CSS/JavaScript, sem framework.

Arquivos centrais:

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `manifest.webmanifest`
- `auth/config.js`
- `auth/bootstrap.js`
- `assets/vendor/supabase-js-2.min.js`

Dependências de backend e dados:

- `supabase/schema.sql`
- `supabase/migrations/*.sql`
- `supabase/functions/admin-manage-user/index.ts`

Não há evidência de:

- `package.json`
- Vite
- React
- Next.js
- build pipeline frontend formal

## 4. Inventário funcional consolidado

### 4.1 Autenticação e conta

- Login por e-mail e senha.
- Logout.
- Sessão persistente.
- Restauração de sessão após refresh.
- Recovery Mode / diagnóstico.
- Login local demonstrativo para diagnóstico.
- Redefinição de senha pelo próprio usuário.
- Gerenciamento administrativo de perfil.

### 4.2 Dashboard / Meu Painel

- Painel integrado da Direção.
- Visão por setor.
- Purple Assist.
- Purple DNA.
- Prioridades de hoje.
- Meu Dia.
- Tarefas automáticas.
- Compromissos.
- Pulse.
- Indicadores resumidos.
- Feed da Direção.

### 4.3 Relatórios

- Criação de relatório.
- Edição de relatório.
- Rascunho.
- Envio.
- Em análise.
- Solicitação de ajuste.
- Reenvio.
- Aprovação.
- Arquivamento.
- Histórico.
- Filtros.
- Paginação.
- Exportação CSV/JSON/PDF.
- Download e impressão.

### 4.4 Diário Operacional

- Entrada por setor.
- Criação e edição por data/unidade.
- Campos por setor:
  - Financeiro
  - Comercial
  - Pedagógico
  - Retenção
  - Direção
- Consolidação diária.
- Integração com dashboard e indicadores.

### 4.5 Indicadores / Purple Intelligence

- Leitura de snapshots consolidados.
- Métricas semanais.
- Métricas quinzenais.
- Métricas mensais.
- Dashboard derivado de snapshot.
- Fallback local quando a migração não está disponível.

### 4.6 Planos de ação

- Criação.
- Edição.
- Atualização de status.
- Exclusão.
- Priorização.
- Prazo.
- Progresso.
- Evidências.

### 4.7 Reuniões

- Café com Raphael.
- Criação.
- Edição.
- Conclusão.
- Reabertura.
- Exclusão.

### 4.8 Mural e notificações

- Criar comunicado.
- Editar comunicado.
- Excluir comunicado.
- Visualizar comunicados.
- Notificações individuais.
- Marcar como lida.
- Marcar todas como lidas.

### 4.9 Casos integrados

- Registro de visão cruzada do aluno.
- Relação entre retenção, pedagógico e financeiro.
- Edição controlada por permissão.

### 4.10 Estoque e patrimônio

- Cadastro de livros.
- Cadastro de bens.
- Movimentações.
- Entradas.
- Baixas.
- Transferências.
- Ajustes.
- Histórico.
- Exportação.

### 4.11 Usuários e permissões

- Listagem de usuários.
- Edição de perfil.
- Alteração de e-mail.
- Alteração de senha.
- Alteração de cargo.
- Alteração de permissões.
- Ativação/desativação.
- Preservação do último administrador.

### 4.12 Configurações

- Meu Perfil.
- Segurança.
- Preferências.
- Sistema.
- Exportação de backup.
- Importação de backup.
- Regras e metas.

### 4.13 Auditoria

- Histórico de ações.
- Feed de alterações.
- Exportação de auditoria.

### 4.14 PWA / branding

- Manifest.
- Service worker.
- Ícones.
- Apple touch icon.
- Favicons.
- Logos clara e escura.

## 5. Dependências técnicas do frontend legado

### 5.1 Arquivos que sustentam a interface

- `index.html`
- `styles.css`
- `app.js`
- `auth/config.js`
- `auth/bootstrap.js`
- `service-worker.js`
- `manifest.webmanifest`

### 5.2 Bibliotecas e SDKs

- Supabase JS local em `assets/vendor/supabase-js-2.min.js`

### 5.3 Pontos de integração com o backend

- Supabase Auth
- `public.profiles`
- `public.app_records`
- `tasks`
- `pulse_entries`
- `achievements`
- `announcements`
- `inventory_items`
- `book_movements`
- `assets`
- `asset_movements`
- `intelligence_snapshots`
- `operational_diary_entries`
- Edge Function `admin-manage-user`

## 6. Permissões observadas no frontend legado

### 6.1 Direção

- Acesso geral.
- Pode ver todos os setores.
- Pode aprovar e solicitar ajuste.
- Pode gerenciar usuários e configurações.
- Pode exportar dados sensíveis quando autorizado.

### 6.2 Líder

- Acesso ao próprio setor.
- Pode criar, editar e enviar relatórios do setor.
- Pode responder tarefas, Pulse e itens operacionais autorizados.
- Não deve acessar setores alheios.

### 6.3 Consulta

- Somente leitura.
- Acesso limitado ao que for concedido.
- Não deve editar relatórios, planos ou perfis.

## 7. Estrutura dos arquivos atuais

### 7.1 Frontend

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `manifest.webmanifest`
- `auth/config.js`
- `auth/bootstrap.js`

### 7.2 Marca

- `assets/brand/logo-purple-gestao.png`
- `assets/brand/logo-purple-gestao-white.png`
- `assets/brand/purple-gestao-light.png`
- `assets/brand/purple-gestao-dark.png`
- `assets/brand/purple-gestao-symbol.png`
- `assets/brand/icon-purple-gestao-1024.png`
- `assets/brand/icon-purple-gestao-512.png`
- `assets/brand/icon-purple-gestao-192.png`
- `assets/brand/favicon-64.png`
- `assets/brand/favicon-32.png`
- `assets/brand/favicon-16.png`
- `assets/brand/favicon.ico`
- `assets/brand/apple-touch-icon.png`

### 7.3 Backend / Supabase

- `supabase/schema.sql`
- `supabase/migrations/20260716_access_control.sql`
- `supabase/migrations/20260716_meu_painel.sql`
- `supabase/migrations/20260717_inventory.sql`
- `supabase/migrations/20260718_books_assets.sql`
- `supabase/migrations/20260719_production_v1.sql`
- `supabase/migrations/20260719_production_cleanup.sql`
- `supabase/migrations/20260720_purple_intelligence_v1.sql`
- `supabase/migrations/20260721_operational_diary_v1.sql`
- `supabase/functions/admin-manage-user/index.ts`

## 8. Tabela de migração executável

| Funcionalidade | Tela | Perfil | Arquivos envolvidos | Dependências Supabase | Status | Prioridade | Validado |
|---|---|---|---|---|---|---|---|
| Login | Login | Todos | `index.html`, `auth/*`, `app.js` | Auth | Migrar | Crítica | ☑ Sim |
| Logout | App shell | Todos | `auth/*`, `app.js` | Auth | Migrar | Crítica | ☑ Sim |
| Sessão persistente | Bootstrap | Todos | `auth/*`, `app.js`, `service-worker.js` | Auth | Migrar | Crítica | ☑ Sim |
| Dashboard / Meu Painel | Dashboard | Direção | `app.js` | `profiles`, `app_records`, `intelligence_snapshots` | Migrar | Crítica | ☑ Sim |
| Indicadores | Dashboard | Direção/Líder | `app.js` | `intelligence_snapshots` | Migrar | Crítica | ☑ Sim |
| Relatórios | Relatórios | Direção/Líder | `app.js` | `app_records`, `profiles`, `reports` | Migrar | Crítica | ☐ Não |
| Novo relatório | Novo relatório | Direção/Líder | `app.js` | `app_records`, `reports` | Migrar | Crítica | ☐ Não |
| Aprovação / ajuste | Relatórios | Direção | `app.js`, `supabase/functions/admin-manage-user/index.ts` | `profiles`, `app_records` | Migrar | Crítica | ☐ Não |
| PDF / impressão | Relatórios | Autorizados | `app.js`, `service-worker.js` | `generated_documents` | Migrar | Alta | ☐ Não |
| Diário Operacional | Diário Operacional | Direção/Líder | `app.js`, `supabase/migrations/20260721_operational_diary_v1.sql` | `operational_diary_entries` | Migrar | Alta | ☐ Não |
| Planos de ação | Planos de ação | Direção/Líder | `app.js` | `app_records`, `tasks` | Migrar | Alta | ☐ Não |
| Tarefas automáticas | Meu Dia | Direção/Líder | `app.js` | `tasks`, `app_records` | Migrar | Alta | ☐ Não |
| Pulse | Meu Painel | Todos autorizados | `app.js` | `pulse_entries` | Migrar | Média | ☐ Não |
| Mural | Comunicação | Direção/Líder | `app.js` | `announcements` | Migrar | Alta | ☐ Não |
| Notificações | Topbar | Todos autorizados | `app.js` | `notification_reads`, `notifications` | Migrar | Média | ☐ Não |
| Casos integrados | Casos integrados | Direção/Líder | `app.js` | `app_records`, `cases` | Migrar | Média | ☐ Não |
| Reuniões | Reuniões | Direção | `app.js` | `app_records`, `meetings` | Migrar | Média | ☐ Não |
| Estoque de livros | Estoque e Patrimônio | Autorizados | `app.js`, `supabase/migrations/20260717_inventory.sql`, `supabase/migrations/20260718_books_assets.sql` | `inventory_items`, `book_movements` | Migrar | Alta | ☐ Não |
| Patrimônio | Estoque e Patrimônio | Autorizados | `app.js`, `supabase/migrations/20260718_books_assets.sql` | `assets`, `asset_movements` | Migrar | Alta | ☐ Não |
| Usuários | Usuários | Direção | `app.js`, `supabase/functions/admin-manage-user/index.ts` | `profiles`, Auth | Migrar | Crítica | ☑ Sim |
| Histórico / auditoria | Histórico | Direção | `app.js` | `app_records`, `audit_logs` | Migrar | Alta | ☐ Não |
| Configurações | Configurações | Direção | `app.js` | `app_settings` | Migrar | Alta | ☐ Não |
| Meu Perfil | Configurações | Todos | `app.js` | `profiles` | Migrar | Alta | ☑ Sim |
| Segurança / senha | Configurações | Todos | `app.js` | Auth, `profiles` | Migrar | Alta | ☑ Sim |
| Backup / importação | Configurações | Direção | `app.js` | `app_records` | Migrar | Média | ☐ Não |
| Branding / PWA | Shell | Todos | `index.html`, `manifest.webmanifest`, `service-worker.js`, `assets/brand/*` | — | Manter | Média | ☑ Sim |
| Recovery Mode / diagnóstico | Shell | Todos | `auth/bootstrap.js`, `app.js` | Auth | Remover do frontend legado | Baixa | ☑ Sim |

## 9. Pendências de migração identificadas

- Definir a arquitetura do Next sem depender do monólito atual.
- Separar autenticação, sessão e permissões em módulos independentes.
- Reimplementar as telas uma por uma.
- Reduzir a dependência de estado global do frontend legado.
- Padronizar observabilidade e erros do novo frontend.
- Garantir que a nova interface consuma o backend intacto sem alterar contratos.

## 10. Próximo passo

Somente depois de validar este inventário, a reconstrução do frontend Purple Gestão Next pode começar.

