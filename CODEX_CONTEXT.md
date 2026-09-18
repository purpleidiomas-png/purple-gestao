# Purple Gestão — contexto técnico rápido

## Arquitetura

Aplicação web estática/PWA, sem bundler ou etapa de build: `index.html` carrega CSS e JavaScript modular por scripts globais. O frontend renderiza uma SPA no navegador; `app.js` concentra estado, navegação, telas e regras operacionais, com apoio de `auth/`, `core/` e `modules/`. Autenticação, dados e funções server-side usam Supabase (Auth, PostgreSQL/RLS e Edge Functions). A Vercel serve diretamente a raiz e reescreve rotas amigáveis para `index.html`.

## Arquivos centrais

- `index.html`: shell de login e da aplicação; ordem dos scripts é importante.
- `app.js`: núcleo legado/operacional da SPA — estado, renderização, módulos, permissões e sincronização. Evitar reescritas amplas.
- `styles.css`: design system e estilos responsivos globais.
- `service-worker.js`: cache PWA; usa estratégia network-first para navegação/arquivos críticos e cache-first para demais assets. Ao alterar arquivos versionados, manter versões de cache e query strings coerentes.
- `auth/config.js`: versões da aplicação/cache e configuração pública do cliente Supabase. Não colocar segredos administrativos aqui.

## Dados, acesso e Supabase

- `profiles`: perfil ligado ao Supabase Auth, com `role`, setor, `access_scope`, permissões JSON e status. RLS e funções como `has_permission`, `has_sector_access` e `is_direction` sustentam a autorização.
- `app_records`: armazenamento JSONB compatível com o frontend para relatórios, ações, casos, reuniões, auditoria, configurações e registros operacionais.
- **Regra obrigatória:** alunos ficam em `app_records` com `kind='student'`. O frontend também tenta tabelas normalizadas (`students`, `classes`, `teachers`) quando disponíveis, mas preserva `app_records` como contrato/fallback; não remover nem migrar essa persistência sem plano explícito.
- Roles: `direction` = acesso global e administração; `leader` = operação do próprio setor conforme permissões; `viewer` = consulta restrita. Permissões efetivas e RLS prevalecem sobre suposições baseadas apenas na role.

### Financeiro

O Centro Financeiro cobre contas a receber/pagar, recebimentos, saldos, fluxo de caixa, filtros/exportação e visão financeira do aluno. O formato compatível usa `app_records(kind='financial_entry', sector='financeiro')`. A camada V1/Asaas adiciona `financial_accounts`, `asaas_customers`, `financial_charges`, `financial_payments` e `asaas_webhook_events`; acesso é protegido por RLS/permissões financeiras, principalmente Direção e líderes financeiros autorizados.

### Estoque, patrimônio e livros

- Estoque: `inventory_items` e `inventory_movements`; livros são itens com `item_type='book'`.
- Movimentações de livros: `book_movements`; entradas, entregas, devoluções e ajustes devem passar pelas funções SQL autorizadas para manter saldo e histórico consistentes.
- Patrimônio: `assets` e `asset_movements`.
- Produção editorial, separada do estoque: tabelas `production_books`, especificações gráficas, perfis/faixas de impressão, progressões e ordens/itens/classes/alunos/histórico de produção. `modules/book-production.js` implementa a UI e o acesso é restrito à Direção. Planejar produção não movimenta estoque automaticamente.

## Edge Functions e Asaas

Edge Functions existentes:

- `admin-manage-user`: gestão administrativa de usuários/Auth e perfis.
- `asaas-create-charge`: cria/reutiliza customer, gera cobrança PIX/boleto e persiste o resultado.
- `asaas-webhook`: recebe eventos do Asaas, registra idempotentemente e atualiza cobranças/pagamentos.

O código compartilhado em `supabase/functions/_shared/asaas.ts` concentra autorização, cliente e mapeamento de status. Credenciais e token do webhook devem permanecer em secrets das Edge Functions; não expor no frontend. O endpoint padrão é sandbox quando `ASAAS_API_URL` não está configurada. Não alterar payloads, idempotência, status ou vínculo aluno/customer sem revisar função, migration e webhook juntos.

## Deploy e produção

Deploy Vercel direto da raiz, preset **Other**, sem build command e sem output directory. `vercel.json` define rewrites e headers de cache/segurança. Antes de publicar, validar login, RLS, rotas, PWA e coerência das versões em `auth/config.js`, `index.html` e `service-worker.js`. Produção oficial: `https://gestao.purpleidiomas.com.br`; alias: `https://purple-gestao.vercel.app`. Não executar deploy automaticamente.

## Convenções visuais

Identidade roxa (variáveis `--p950` a `--p100`) com laranja como destaque; fundo claro, cartões brancos, bordas suaves, sombras discretas e cantos arredondados. Fonte: Inter/system sans-serif. Manter sidebar roxa, hierarquia por cards/KPIs, badges semânticos (verde/amarelo/vermelho/azul), responsividade e assets oficiais em `assets/brand/`.

## Não quebrar

- Ordem de carregamento dos scripts e API global `window.App`/módulos.
- Login Supabase, vínculo `auth.users` → `profiles`, roles, permissões e RLS.
- Persistência/fallback de alunos em `app_records(kind='student')` e isolamento por setor.
- Compatibilidade entre dados JSONB legados e tabelas normalizadas.
- Funções SQL de movimentação, saldos, históricos e auditoria.
- Integração Asaas, idempotência do webhook e segredos server-side.
- Versionamento/cache do service worker e funcionamento offline/atualização da PWA.
- Domínio, rewrites e headers da Vercel.

## Normalmente ignorável em tarefas simples

`.git/`, `.vercel/`, `.DS_Store`, `node_modules/`, previews/fontes de marca, documentação histórica em `docs/`, testes, scripts de importação e migrations antigas já aplicadas. Não editar `supabase/`, Edge Functions, `api/`, configuração de deploy ou assets de marca salvo quando a tarefa os envolver explicitamente.
