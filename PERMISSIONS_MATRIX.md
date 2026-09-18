# Purple Gestão — Permissions Matrix

Data de referência: 2026-08-28

Critério:

- UI = o que o frontend checa com `can(...)` / navegação / botões;
- Backend = RLS, grants, RPCs e edge functions observados;
- Divergência = quando esconder botão não garante o mesmo contrato no banco.

## 1. Perfis existentes

Perfis atuais:

- `direction`
- `leader`
- `viewer`

Escopo:

- `direction`: `all_sectors`
- `leader`: `own_sector`
- `viewer`: leitura restrita

## 2. Módulos e ações

| Módulo | Ação | UI | Backend atual | Divergência |
|---|---|---|---|---|
| Home/Dashboard | visualizar | `panel.view` / `indicators.view` | snapshots e tabelas com RLS por permissão/setor | baixa |
| Reports | visualizar/criar/editar/aprovar | `reports.*` | `app_records(kind='report')` com RLS por permissão | baixa |
| Actions | visualizar/criar/editar/excluir | `actions.*` | `app_records(kind='action')` com RLS por permissão | baixa |
| Meetings | visualizar/editar | `meetings.*` | `app_records(kind='meeting')` com RLS por permissão | baixa |
| Cases | visualizar/salvar | `cases.view` + wrappers seguros | RPC segura + RLS forte | baixa |
| Students | visualizar | navegação usa `panel.view` | `students` tipada com `select using (true)`; `app_records(student)` por `reports.view` | alta |
| Students | criar/editar/excluir | não-viewer + ações na tela | tipada permite qualquer autenticado não-viewer; `app_records` depende de `reports.*` | alta |
| Classes | visualizar | `panel.view` | `classes` tipada com `select using (true)` | alta |
| Classes | criar/editar/excluir | não-viewer | tipada permite qualquer autenticado não-viewer | alta |
| Teachers | visualizar | `panel.view` | `teachers` tipada com `select using (true)` | alta |
| Teachers | criar/editar/excluir | não-viewer | tipada permite qualquer autenticado não-viewer | alta |
| Financial | visualizar centro | `financial.receipts.view` / correlatas | `financial_charges` e `financial_payments` hoje só `public.is_direction()` | crítica |
| Financial | criar/editar/excluir cobrança | `financial.transactions.*` | Edge functions e RLS tipado hoje praticamente direction-only | crítica |
| Inventory | visualizar/operar | `inventory.*` | RPCs + RLS por permissão | baixa |
| Assets | visualizar/operar | `assets.*` | RPCs + RLS por permissão | baixa |
| Operational Diary | visualizar/escrever | `reports.view/create/edit` | tabela própria com RLS por perfil/setor | baixa |
| TWR | visualizar | `panel.view` | sem backend próprio; hoje grava em `settings` | média |
| TWR | criar bloco/publicar | `twr.manage`, `twr.submit.own` | backend não materializa esse contrato | crítica |
| Class Opening | visualizar/registrar | `class_opening.manage` | sem backend próprio; hoje grava em `settings` | crítica |
| Class Opening | exceção | `class_opening.exception` | backend não materializa esse contrato | crítica |
| Book Production | visualizar | nav usa `users.view` + módulo exige `direction` | tabelas/RPCs direction-only | média |
| Users | visualizar/editar | `users.view` / `users.edit` | `profiles_read`, `profiles_direction_update`, edge admin | baixa |
| Audit | visualizar/exportar | `audit.view/export` | `app_records(audit)` + `permission_audit` + `financial_charge_audit` | média |
| Settings | visualizar/editar | `settings.*` | `app_records(settings)` + RLS por permissão | baixa |

## 3. Divergências críticas

### A. Diretórios acadêmicos

Problema:

- UI mostra Students/Classes/Teachers para qualquer perfil com `panel.view`;
- backend tipado libera `SELECT` com `using (true)` para autenticados;
- `app_records` do mesmo domínio já exige permissões diferentes (`reports.*`).

Resultado:

- o mesmo domínio tem dois contratos de acesso diferentes.

Recomendação:

- alinhar `students/classes/teachers` ao contrato funcional real;
- remover a duplicidade de critério entre tipado e `app_records`.

### B. Financeiro

Problema:

- frontend admite líder financeiro com permissões financeiras;
- backend tipado de `financial_charges`/`financial_payments` está direction-only.

Resultado:

- UI e regras locais permitem ações que o banco pode negar.

Recomendação:

- alinhar RLS financeiro às permissões `financial.*`.

### C. TWR / Class Opening

Problema:

- frontend usa permissões específicas (`twr.manage`, `twr.submit.own`, `class_opening.manage`, `class_opening.exception`);
- essas permissões não são backbone do domínio no Supabase atual.

Resultado:

- contrato funcional incompleto.

Recomendação:

- adicionar esses permission keys ao modelo padrão e ao backend antes da tipagem definitiva.

## 4. Policy matrix por domínio tipado

| Tabela | SELECT atual | INSERT/UPDATE atual | DELETE atual | Recomendação |
|---|---|---|---|---|
| `profiles` | próprio usuário ou direção com `users.view` | direção com `users.edit`; `update_my_last_login` por RPC | n/a | manter |
| `students` | qualquer autenticado | autenticado não-viewer | autenticado não-viewer | restringir por permissão explícita |
| `classes` | qualquer autenticado | autenticado não-viewer | autenticado não-viewer | restringir por permissão explícita |
| `teachers` | qualquer autenticado | autenticado não-viewer | autenticado não-viewer | restringir por permissão explícita |
| `financial_charges` | direção | direção | sem delete grant | alinhar a `financial.*` |
| `financial_payments` | direção | não observado para escrita direta no frontend | n/a | alinhar a `financial.*` |
| `integrated_cases` | por RPC/policy dedicada | por RPC segura | bloqueado direto | manter |
| `operational_diary_entries` | por perfil/setor | por perfil/setor | controlado | manter |
| `production_*` | direção | direção | geralmente sem delete | manter |

## 5. Decisão recomendada

Modelo-alvo:

- permissões explícitas por domínio;
- UI e backend usando o mesmo contrato;
- nenhum módulo depender apenas de “esconde botão”.
