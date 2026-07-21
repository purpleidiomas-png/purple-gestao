# Plano de integração — Purple Gestão

## Arquitetura sugerida

- Front-end: Next.js ou adaptação deste protótipo para React.
- Banco e autenticação: Supabase/PostgreSQL.
- Hospedagem: Vercel.
- Arquivos: Supabase Storage.
- E-mails: Resend ou provedor equivalente.
- PDF: geração no servidor a partir do relatório aprovado.

## Perfis

### Direção
- Acesso a todos os setores.
- Aprova, solicita ajustes, arquiva e administra usuários.
- Visualiza dashboard integrado e auditoria.

### Líder de setor
- Acesso apenas ao próprio departamento.
- Cria, edita rascunhos e responde ajustes.
- Não lê dados detalhados de outros setores.

### Consulta
- Acesso somente leitura ao conteúdo autorizado.

## Etapas de conexão

1. Criar o projeto Supabase.
2. Executar `supabase/schema.sql`.
3. Criar os usuários no Supabase Auth.
4. Vincular cada usuário à tabela `profiles`.
5. Configurar as variáveis de ambiente.
6. Substituir o armazenamento local por chamadas ao banco.
7. Conectar anexos ao Storage.
8. Publicar a versão beta.
9. Validar com os líderes por duas ou três quinzenas.
10. Migrar para o domínio oficial.

## Variáveis previstas

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=
EMAIL_FROM=
RESEND_API_KEY=
```

Nunca coloque a `SERVICE_ROLE_KEY` no navegador. Ela deve existir somente no servidor.
