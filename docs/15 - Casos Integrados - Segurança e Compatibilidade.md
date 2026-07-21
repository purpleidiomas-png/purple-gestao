# Casos Integrados — Segurança e Compatibilidade

## Objetivo

Esta alteração elimina a exposição dos resumos de outros setores na resposta da API para líderes. A interface permanece com o mesmo contrato de dados, mas leitura e escrita passam pelas funções `list_integrated_cases()` e `save_integrated_case(...)`.

## Preservação de dados

- Os registros `kind = 'case'` de `app_records` não são alterados nem apagados.
- A primeira execução copia apenas casos ainda ausentes para `integrated_cases` e `integrated_case_sector_details`.
- Reexecuções usam `ON CONFLICT DO NOTHING`, portanto não substituem edições feitas na estrutura nova.
- Cada caso possui três linhas setoriais independentes: Retenção, Pedagógico e Financeiro.

## Compatibilidade por perfil

| Perfil | Leitura | Escrita |
| --- | --- | --- |
| Direção com `cases.view` | Núcleo e três resumos completos | Núcleo e qualquer setor |
| Consulta com `cases.view` | Núcleo e três resumos completos | Nenhuma |
| Líder com `cases.view` | Núcleo, níveis necessários à interface e resumo somente do próprio setor | Núcleo compartilhado com controle de versão e resumo somente do próprio setor |
| Usuário sem `cases.view` | Nenhuma | Nenhuma |

Mesmo em consulta direta às tabelas, RLS impede líderes de ler detalhes de outro setor. O JSON legado integral fica inacessível a líderes por políticas restritivas em `app_records`.

## Concorrência

- O núcleo compartilhado usa `coreUpdatedAt` para controle otimista.
- Cada resumo usa seu próprio `expectedUpdatedAt`.
- Atualizações de setores diferentes modificam linhas diferentes e não se sobrescrevem.
- Uma edição concorrente do mesmo núcleo ou setor retorna `CASE_CORE_CONFLICT` ou `CASE_SECTOR_CONFLICT`; a interface recarrega a versão atual antes de permitir nova tentativa.

## Ordem segura de publicação

1. Aplicar `20260724_integrated_cases_privacy.sql`.
2. Validar tabelas, políticas e RPCs no Supabase.
3. Publicar o `app.js` correspondente.

Entre os passos 1 e 3, o frontend legado pode exibir Casos vazios para líderes e não conseguirá gravar o JSON legado. Os demais módulos continuam usando `app_records` normalmente. Essa indisponibilidade temporária é intencional e evita reabrir o vazamento.

## Rollback operacional

O JSON original permanece disponível para recuperação administrativa. Não é necessário apagar a estrutura normalizada. Qualquer rollback de interface deve manter as guardas de leitura do JSON legado; removê-las reintroduziria a exposição comprovada.
