# Diagnóstico de segurança de acesso

## Causa original

O vazamento foi causado pela combinação de autorização excessiva no Supabase e regras permissivas no frontend:

- A política `records_read` de `app_records` continha `public.is_viewer()` como condição suficiente. Portanto, qualquer usuário Consulta recebia relatórios, ações, casos, reuniões, auditorias e configurações de todos os setores.
- `sectorAllowed()` e `userReports()` tratavam o perfil Consulta como global.
- O seletor de setor era liberado para todo usuário que não fosse líder, permitindo que Consulta alternasse entre Retenção, Pedagógico e Financeiro.
- A aplicação consultava coleções completas (`select('*')`) e confiava exclusivamente nas políticas existentes para reduzir o resultado.
- Não havia modelo persistido de permissões granulares; decisões de acesso eram baseadas somente em `role` e `sector` no JavaScript.
- Configurações eram legíveis por todos por meio de `kind = 'settings'`, incluindo limites e indicadores potencialmente sensíveis.

## Superfícies afetadas

- Consulta: relatórios, dashboards, ações, casos, reuniões, configurações e dados financeiros de todos os setores.
- Líderes: protegidos parcialmente por setor no RLS, mas sem autorização granular por ação ou módulo.
- Ações no frontend: páginas podiam ser abertas chamando `App.go()` diretamente, mesmo quando o menu estava oculto.

## Estratégia de correção

- Negação por padrão com permissões persistidas em `profiles.permissions`.
- Escopo persistido em `profiles.access_scope`.
- Função `has_permission()` no banco, usada pelas políticas RLS.
- Remoção do acesso global implícito de Consulta.
- Bloqueio de navegação, troca de setor, exportação e mutações também no frontend.
- Auditoria específica e imutável para alterações de acesso.

