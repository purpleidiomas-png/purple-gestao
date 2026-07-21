# PROJECT_DOCUMENTATION.md

## 1. Contas utilizadas

### 1.1 E-mails encontrados no código e documentação local

Contas legadas/demonstrativas, ainda referenciadas no frontend local e em documentação:

- `direcao@purple.com`
- `retencao@purple.com`
- `pedagogico@purple.com`
- `financeiro@purple.com`
- `consulta@purple.com`

Essas contas aparecem em:

- [README.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/README.md)
- [app.js](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/app.js)
- [supabase/migrations/20260719_production_v1.sql](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/migrations/20260719_production_v1.sql)

### 1.2 Contas observadas no projeto Supabase em operação

Usuários observados no Supabase Auth em 2026-07-17:

- `direcao@purple.com.br`
- `pedagogico@purple.com.br`
- `financeiro@purple.com.br`
- `retencao@purple.com.br`
- `consulta@purple.com`

Perfis observados em `public.profiles`:

- Raphael Moraes -> `direcao@purple.com.br`
- Victor -> `pedagogico@purple.com.br`
- Waleska Costa -> `financeiro@purple.com.br`
- Déborah -> `retencao@purple.com.br`
- consulta -> `consulta@purple.com`

### 1.3 Qual conta está conectada em cada serviço

Informação confirmada no workspace:

- Supabase Auth: usa as contas listadas acima.
- Vercel: projeto vinculado ao time `team_fxoPl9t68NjTOmNpJgajIZOS`; nenhum e-mail de usuário/owner está exposto no workspace.
- DNS/cPanel: o repositório local não contém e-mail da conta administrativa; apenas foi confirmado operacionalmente que o DNS autoritativo está em JoinVix.

### 1.4 Dependência por conta

Contas `@purple.com.br` / `consulta@purple.com` dependem de:

- Supabase Auth
- Tabela `public.profiles`
- Regras de acesso/RLS
- Interface de login do frontend

Contas `@purple.com` dependem de:

- `defaultDB()` em [app.js](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/app.js)
- Recovery Mode / login local de diagnóstico
- Documentação antiga e fluxo demonstrativo

## 2. Serviços utilizados

Serviços confirmados:

- Vercel
- Supabase
- Domínio próprio `gestao.purpleidiomas.com.br`
- DNS autoritativo em JoinVix
- PostgreSQL gerenciado pelo Supabase
- Supabase Auth
- Supabase Edge Functions
- PWA Manifest
- Service Worker
- Hospedagem estática do frontend

Serviços não encontrados/sem evidência no código:

- GitHub: sem repositório Git funcional no workspace atual
- Supabase Storage: não há buckets ou uso de `storage` no código/migrations
- Analytics: nenhum traço de GA, GTM, Plausible, PostHog, Mixpanel ou similar
- Sentry/monitoramento de erros externo: não encontrado
- Provedor de e-mail: apenas previsto em documentação, não implementado
- APIs externas adicionais: não encontradas além do Supabase

## 3. Projetos

### 3.1 Projeto local

- Nome local da pasta: `Purple_Gestao_Completo`
- Caminho: `/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo`
- Ambiente: desenvolvimento/local

### 3.2 Projeto Vercel

- Nome do projeto: `purple-gestao`
- Project ID: `prj_SNd04OTkZdi4QSowfMLl2gNoyX1r`
- Org/Team ID: `team_fxoPl9t68NjTOmNpJgajIZOS`
- Arquivo de vínculo: [.vercel/project.json](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/.vercel/project.json)
- URL Vercel alias: [https://purple-gestao.vercel.app](https://purple-gestao.vercel.app)
- Ambiente confirmado: produção publicada

### 3.3 Projeto Supabase

- Nome do projeto: `purpleidiomas-png's Project`
- Project ID/Ref: `qqlymzyvvgmbyuhswipp`
- URL base: [https://qqlymzyvvgmbyuhswipp.supabase.co](https://qqlymzyvvgmbyuhswipp.supabase.co)
- Organization ID: `lusewpmrqwoqmppfrfwv`
- Arquivo de vínculo local: [supabase/.temp/linked-project.json](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/.temp/linked-project.json)
- Ambiente confirmado: produção

### 3.4 Projeto publicado no domínio oficial

- URL oficial: [https://gestao.purpleidiomas.com.br](https://gestao.purpleidiomas.com.br)
- Infraestrutura HTTP: Vercel
- Ambiente: produção

## 4. Deploy

### 4.1 Como o deploy acontece

O projeto atual é um site estático:

- `index.html`
- `styles.css`
- `app.js`
- `service-worker.js`
- `manifest.webmanifest`
- assets estáticos

Não há:

- `package.json`
- pipeline de build
- bundler configurado
- output directory gerado

O deploy é compatível com publicação direta da raiz no Vercel.

### 4.2 De onde o Vercel publica

Com base em [vercel.json](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/vercel.json) e no estado local:

- Framework preset: `Other`
- Build command: não necessário
- Output directory: raiz do projeto

### 4.3 Branch ligada à produção

Não foi possível confirmar branch de produção porque:

- o workspace atual não é um repositório Git
- não há `.git/`
- não há remote configurado
- não existe metadado local de integração Git/Vercel

Conclusão técnica:

- há forte evidência de deploy manual por diretório/CLI, não de CI por branch

### 4.4 Preview

Status:

- Vercel suporta preview por padrão
- não há evidência local de branch previews ativos
- não há URL preview persistida no workspace

### 4.5 Beta

Status:

- [DEPLOY_BETA.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/DEPLOY_BETA.md) recomenda `beta-gestao.purpleidiomas.com.br`
- não há evidência local de beta ativo hoje

### 4.6 Como publicar uma nova versão

Fluxo atual recomendado:

1. Atualizar arquivos estáticos na pasta do projeto.
2. Se houver cache de shell, versionar `app.js`, `styles.css` e `service-worker.js`.
3. Publicar pelo Vercel:
   - via painel, enviando a pasta
   - ou via Vercel CLI a partir desta raiz
4. Validar:
   - `purple-gestao.vercel.app`
   - `gestao.purpleidiomas.com.br`
5. Confirmar PWA, Service Worker e login.

## 5. Banco

### 5.1 Projeto Supabase

- Ref: `qqlymzyvvgmbyuhswipp`
- URL: [https://qqlymzyvvgmbyuhswipp.supabase.co](https://qqlymzyvvgmbyuhswipp.supabase.co)
- Projeto local vinculado em [supabase/.temp/linked-project.json](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/.temp/linked-project.json)

### 5.2 Tabelas existentes no banco lógico do projeto

Baseadas em [supabase/schema.sql](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/schema.sql) e migrations:

- `public.profiles`
- `public.app_records`
- `public.permission_audit`
- `public.tasks`
- `public.pulse_entries`
- `public.achievements`
- `public.announcements`
- `public.inventory_items`
- `public.inventory_movements`
- `public.book_movements`
- `public.assets`
- `public.asset_movements`
- `public.intelligence_snapshots`
- `public.operational_diary_entries`

Tabela nativa usada por referência:

- `auth.users`

### 5.3 Policies/RLS

Policies principais identificadas:

- `profiles_read`
- `profiles_direction_update`
- `records_read`
- `records_insert`
- `records_update`
- `records_delete`
- `permission_audit_read`
- `tasks_select`
- `tasks_insert`
- `tasks_update`
- `tasks_delete`
- `pulse_select`
- `pulse_insert`
- `achievements_select`
- `achievements_insert`
- `announcements_select`
- `announcements_insert`
- `announcements_update`
- `announcements_delete`
- `inventory_items_select`
- `inventory_items_insert`
- `inventory_items_update`
- `inventory_movements_select`
- `book_movements_v2_select`
- `assets_select`
- `assets_insert`
- `assets_update`
- `asset_movements_select`
- `intelligence_snapshots_read`
- `operational_diary_entries_read`
- `operational_diary_entries_insert`
- `operational_diary_entries_update`

Todas as principais tabelas operacionais do projeto usam RLS.

### 5.4 Functions principais

Functions identificadas:

- `touch_updated_at()`
- `handle_new_user()`
- `is_direction()`
- `is_viewer()`
- `my_sector()`
- `default_permissions()`
- `has_permission()`
- `has_sector_access()`
- `audit_profile_permissions()`
- `guard_inventory_item_update()`
- `guard_inventory_item_insert()`
- `record_inventory_movement()`
- `guard_asset_update()`
- `record_book_movement()`
- `inactivate_inventory_item()`
- `delete_unmoved_book()`
- `record_asset_movement()`
- `update_my_profile()`
- `try_uuid()`
- `intelligence_metric_number()`
- `build_intelligence_derived_metrics()`
- `build_intelligence_goal_status()`
- `rebuild_intelligence_snapshot_from_report()`
- `rebuild_all_report_intelligence_snapshots()`
- `sync_intelligence_snapshots()`
- `hydrate_operational_diary_responsible()`
- `build_operational_diary_derived_metrics()`
- `build_operational_diary_goal_status()`
- `rebuild_intelligence_snapshot_from_operational_diary()`
- `rebuild_all_operational_diary_intelligence_snapshots()`
- `sync_operational_diary_intelligence_snapshots()`

### 5.5 Storage

Status:

- não há buckets definidos no workspace
- não há migrations de `storage.buckets`
- não há uso de Supabase Storage no frontend atual

### 5.6 Auth

Status:

- implementado com Supabase Auth
- sincronizado com `public.profiles`
- gatilho `handle_new_user()` cria perfil na inserção em `auth.users`

## 6. Domínio

### 6.1 Domínio principal

- `purpleidiomas.com.br`

### 6.2 Subdomínios relevantes

- `gestao.purpleidiomas.com.br` -> produção oficial do Purple Gestão
- `purple-gestao.vercel.app` -> alias Vercel do projeto
- `beta-gestao.purpleidiomas.com.br` -> apenas sugerido em documentação, não confirmado ativo

### 6.3 Onde o DNS está hospedado

Nameservers públicos atuais:

- `ns1.joinvix.com.br`
- `ns2.joinvix.com.br`

Conclusão:

- a zona DNS está hospedada na JoinVix

### 6.4 Para onde cada domínio aponta

Registros públicos confirmados em 2026-07-17:

- `gestao.purpleidiomas.com.br` CNAME -> `8acd968624c00f83.vercel-dns-017.com.`
- `gestao.purpleidiomas.com.br` resolve para:
  - `64.29.17.1`
  - `216.198.79.1`
- `https://gestao.purpleidiomas.com.br` responde com `server: Vercel`
- `https://purple-gestao.vercel.app` responde com `server: Vercel`

## 7. Repositório

### 7.1 Estado atual

O diretório atual não é um clone Git funcional.

Confirmações:

- `git rev-parse --is-inside-work-tree` falha
- não existe `.git/`

### 7.2 Nome do repositório

Não identificável a partir do workspace atual.

### 7.3 Organização

Não identificável a partir do workspace atual.

### 7.4 Branch principal

Não identificável a partir do workspace atual.

### 7.5 Branches existentes

Não identificável a partir do workspace atual.

### 7.6 Último commit

Não identificável a partir do workspace atual.

### 7.7 Como clonar

Não há URL remota de Git armazenada localmente. Para reconstruir a clonagem, é necessário:

- obter a URL remota do repositório verdadeiro
- reconstituir o histórico a partir da fonte Git correta

## 8. Variáveis de ambiente

### 8.1 Variáveis realmente usadas no código/serviços

Frontend:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` ou publishable key equivalente

Edge Function `admin-manage-user`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Variáveis previstas em documentação, mas não comprovadas em uso:

- `APP_URL`
- `EMAIL_FROM`
- `RESEND_API_KEY`

### 8.2 Onde estão configuradas

Confirmado:

- No frontend atual, `SUPABASE_URL` e a publishable/anon key estão hardcoded em [app.js](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/app.js), não em `.env`.
- Na Edge Function, as variáveis são lidas do ambiente do Supabase em [supabase/functions/admin-manage-user/index.ts](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/functions/admin-manage-user/index.ts).

### 8.3 Valores secretos

Não documentados aqui por segurança.

## 9. Estrutura do projeto

```text
.
├── .DS_Store
├── .gitignore
├── .vercel
│   ├── README.txt
│   └── project.json
├── DEPLOY_BETA.md
├── INTEGRACAO.md
├── PROJECT_DOCUMENTATION.md
├── README.md
├── app.js
├── assets
│   ├── .DS_Store
│   ├── brand
│   │   ├── .DS_Store
│   │   ├── apple-touch-icon.png
│   │   ├── favicon-16.png
│   │   ├── favicon-32.png
│   │   ├── favicon-64.png
│   │   ├── favicon.ico
│   │   ├── icon-purple-gestao-1024.png
│   │   ├── icon-purple-gestao-192.png
│   │   ├── icon-purple-gestao-512.png
│   │   ├── logo-purple-gestao-white.png
│   │   ├── logo-purple-gestao.png
│   │   ├── previews
│   │   │   ├── preview-black.png
│   │   │   ├── preview-red.png
│   │   │   └── preview-white.png
│   │   ├── process_brand.py
│   │   ├── purple-gestao-dark.png
│   │   ├── purple-gestao-light.png
│   │   ├── purple-gestao-symbol.png
│   │   └── source
│   │       ├── .DS_Store
│   │       ├── source-icon.png
│   │       ├── source-logo-purple.png
│   │       └── source-logo-white.png
│   └── vendor
│       └── supabase-js-2.min.js
├── docs
│   ├── 00 - Vision.md
│   ├── 01 - Roadmap.md
│   ├── 02 - Funcionalidades.md
│   ├── 03 - Fluxos.md
│   ├── 04 - Banco.md
│   ├── 05 - Design System.md
│   ├── 06 - Dashboard.md
│   ├── 07 - Permissões.md
│   ├── 08 - Relatórios.md
│   ├── 09 - Regras de Negócio.md
│   ├── 10 - API.md
│   ├── 11 - Backlog.md
│   └── 12 - Diagnóstico de Segurança.md
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── styles.css
├── supabase
│   ├── .temp
│   │   └── linked-project.json
│   ├── functions
│   │   └── admin-manage-user
│   │       └── index.ts
│   ├── migrations
│   │   ├── 20260716_access_control.sql
│   │   ├── 20260716_meu_painel.sql
│   │   ├── 20260717_inventory.sql
│   │   ├── 20260718_books_assets.sql
│   │   ├── 20260719_production_cleanup.sql
│   │   ├── 20260719_production_v1.sql
│   │   ├── 20260720_purple_intelligence_v1.sql
│   │   └── 20260721_operational_diary_v1.sql
│   └── schema.sql
└── vercel.json
```

## 10. Dependências

### 10.1 Frontend

- HTML estático
- CSS estático
- JavaScript vanilla
- PWA Manifest
- Service Worker

### 10.2 Bibliotecas identificadas

- `@supabase/supabase-js` vendorizado localmente em `assets/vendor/supabase-js-2.min.js`
  - comentário do arquivo indica origem: `@supabase/supabase-js@2.110.7`

### 10.3 Edge Function

- `@supabase/supabase-js@2` via `esm.sh`

### 10.4 Python

Arquivo [assets/brand/process_brand.py](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/assets/brand/process_brand.py) usa:

- `Pillow`
- `ImageCms`

### 10.5 Dependências ausentes

Não existem no workspace:

- `package.json`
- `node_modules`
- lockfile npm/pnpm/yarn
- `deno.json`
- `tsconfig.json`

## 11. Como reconstruir o projeto do zero

### 11.1 Recuperar código

1. Obter a pasta atual ou o repositório Git verdadeiro.
2. Se houver repositório oficial, clonar a URL correta.
3. Se não houver repositório, copiar integralmente este diretório.

### 11.2 Rodar localmente

Sem instalação:

1. Abrir [index.html](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/index.html) diretamente no navegador.

Com servidor estático:

1. Na raiz do projeto, executar:
   ```bash
   python -m http.server 8080
   ```
2. Abrir `http://localhost:8080`

### 11.3 Preparar Supabase

1. Criar um projeto Supabase.
2. Criar/linkar o projeto local.
3. Executar [supabase/schema.sql](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/supabase/schema.sql).
4. Aplicar migrations em ordem:
   - `20260716_access_control.sql`
   - `20260716_meu_painel.sql`
   - `20260717_inventory.sql`
   - `20260718_books_assets.sql`
   - `20260719_production_cleanup.sql`
   - `20260719_production_v1.sql`
   - `20260720_purple_intelligence_v1.sql`
   - `20260721_operational_diary_v1.sql`
5. Publicar a Edge Function `admin-manage-user`.
6. Configurar variáveis de ambiente da função:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 11.4 Ajustar frontend

1. Garantir que o frontend aponte para o `SUPABASE_URL` correto.
2. Garantir que a publishable key/anon key esteja correta.
3. Validar login, sessão e regras de acesso.

### 11.5 Publicar em produção

1. Criar ou reutilizar o projeto Vercel `purple-gestao`.
2. Linkar a raiz do projeto ao Vercel.
3. Publicar como site estático.
4. Apontar o domínio `gestao.purpleidiomas.com.br` para a Vercel.
5. No Supabase Auth, configurar:
   - Site URL
   - Redirect URLs
6. Testar:
   - login
   - refresh
   - service worker
   - manifest
   - permissões

## 12. Pendências

Pendências técnicas ou lacunas observadas:

- Workspace atual sem histórico Git e sem remote identificável.
- Branch de produção não documentada.
- Não há pipeline CI/CD versionado no projeto local.
- Frontend ainda hardcodeia `SUPABASE_URL` e publishable key em `app.js`.
- Há divergência entre e-mails legados `@purple.com` no código local e contas reais `@purple.com.br` no Supabase em produção.
- Não existe `.env.example`.
- Não há camada formal de testes automatizados.
- Não há analytics implementado.
- Não há integração de e-mail implementada.
- Não há Storage operacional configurado para anexos.
- Geração de PDF é basicamente `window.print()`, não renderização server-side.
- Parte da documentação histórica em [README.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/README.md) e [INTEGRACAO.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/INTEGRACAO.md) está desatualizada frente ao estado atual do sistema.
- O projeto atual depende de um único `app.js` grande, sem modularização por arquivo.

## 13. Documentação existente no projeto

Documentos já existentes:

- [README.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/README.md)
- [INTEGRACAO.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/INTEGRACAO.md)
- [DEPLOY_BETA.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/DEPLOY_BETA.md)
- [docs/00 - Vision.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/00%20-%20Vision.md)
- [docs/01 - Roadmap.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/01%20-%20Roadmap.md)
- [docs/02 - Funcionalidades.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/02%20-%20Funcionalidades.md)
- [docs/03 - Fluxos.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/03%20-%20Fluxos.md)
- [docs/04 - Banco.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/04%20-%20Banco.md)
- [docs/05 - Design System.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/05%20-%20Design%20System.md)
- [docs/06 - Dashboard.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/06%20-%20Dashboard.md)
- [docs/07 - Permissões.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/07%20-%20Permiss%C3%B5es.md)
- [docs/08 - Relatórios.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/08%20-%20Relat%C3%B3rios.md)
- [docs/09 - Regras de Negócio.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/09%20-%20Regras%20de%20Neg%C3%B3cio.md)
- [docs/10 - API.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/10%20-%20API.md)
- [docs/11 - Backlog.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/11%20-%20Backlog.md)
- [docs/12 - Diagnóstico de Segurança.md](/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo/docs/12%20-%20Diagn%C3%B3stico%20de%20Seguran%C3%A7a.md)

### Resumo executivo

O Purple Gestão hoje é um frontend estático em produção na Vercel, conectado a um backend Supabase já relativamente rico em Auth, RLS, inventário, patrimônio, Purple Intelligence e Diário Operacional. O maior risco operacional atual não é infraestrutura, e sim governança de código:

- ausência de repositório Git local verificável
- documentação parcialmente defasada
- configuração híbrida entre demo legado e operação real
- segredo/configuração pública ainda embutida no frontend

