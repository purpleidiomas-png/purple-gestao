# Purple Gestão — Protótipo Completo

Sistema demonstrativo criado para centralizar os relatórios de Retenção, Pedagógico e Financeiro da Purple Idiomas.

## Como abrir

### Opção 1 — teste local simples
1. Extraia o arquivo ZIP.
2. Abra `index.html` no Chrome, Edge, Safari ou Firefox.
3. O visual e as funções básicas funcionam sem internet.

### Opção 2 — teste como site local
Na pasta do projeto, execute:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Contas de demonstração

Senha inicial de todas: `123456`

- Direção: `direcao@purple.com`
- Retenção: `retencao@purple.com`
- Pedagógico: `pedagogico@purple.com`
- Financeiro: `financeiro@purple.com`
- Consulta: `consulta@purple.com`

## Módulos já incluídos

- Login demonstrativo por perfil e setor.
- Visão integrada da direção.
- Dashboard específico de cada departamento.
- Relatórios semanais, quinzenais e mensais.
- Formulários autoexplicativos por campo.
- Indicadores calculados automaticamente.
- Fluxo: rascunho, enviado, em análise, ajuste, aprovado e arquivado.
- Histórico de relatórios com filtros.
- Exportação em CSV, JSON e impressão/PDF.
- Planos de ação com prioridade, responsável, prazo e progresso.
- Casos integrados de alunos entre os três departamentos.
- Privacidade simulada: líderes não veem o conteúdo detalhado dos outros setores.
- Agenda de reuniões individuais.
- Notificações e alertas automáticos.
- Gestão de usuários e permissões.
- Registro de auditoria.
- Configurações de metas, limites e prazos.
- Backup e importação dos dados locais.
- Manifesto e service worker para futura instalação como aplicativo web.

## Onde os dados ficam agora

Nesta versão, os dados ficam no `localStorage` do navegador. Isso é ideal para validar o fluxo e o design, mas não é adequado para uso oficial com dados reais e confidenciais.

## O que falta conectar para produção

- Supabase/PostgreSQL ou outro banco de dados.
- Autenticação real e recuperação de senha.
- Row Level Security por setor.
- Armazenamento de anexos.
- Geração de PDF no servidor.
- E-mails e notificações reais.
- Domínio e hospedagem.
- Backups automáticos.
- Logs de auditoria imutáveis.

A pasta `supabase` contém um modelo inicial de banco e políticas para a etapa de implantação.
