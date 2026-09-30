# Purple Academy — R.A.P.I.D.

Módulo de treinamento e certificação interna de professores da Purple Idiomas.

## Rotas

- `https://gestao.purpleidiomas.com.br/rapid`
- O `vercel.json` também prepara a raiz de `rapid.purpleidiomas.com.br` para servir esta experiência quando o domínio for adicionado ao projeto na Vercel/DNS.

## Backend

Usa o mesmo Supabase/Auth do Purple Gestão e mantém tabelas próprias:

- `rapid_enrollments`
- `rapid_module_progress`
- `rapid_microclasses`
- `rapid_module_media`

Aplicar a migration `supabase/migrations/20260923111500_rapid_training.sql` antes de liberar o módulo em produção.

## Perfis

- `direction`: painel administrativo, cadastro de professores, atribuição de trilha, vídeos e avaliação de microaulas.
- `teacher`: trilha, checkpoints, progresso, envio de microaula e certificado.

O cadastro de novos professores reutiliza a Edge Function segura `admin-manage-user`, já existente no Purple Gestão.
