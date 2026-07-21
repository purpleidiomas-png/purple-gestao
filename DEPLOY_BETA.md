# Publicação beta

Este pacote pode ser publicado como site estático para validação visual e de fluxo.

## Vercel

1. Crie um novo projeto.
2. Envie esta pasta ou conecte um repositório Git contendo os arquivos.
3. Framework preset: `Other`.
4. Build command: deixe vazio.
5. Output directory: deixe vazio ou use a raiz do projeto.
6. Publique.
7. Depois, configure um subdomínio como `beta-gestao.purpleidiomas.com.br`.

## Atenção

A versão beta ainda usa armazenamento local e login demonstrativo. Não utilize dados pessoais, financeiros ou acadêmicos reais até a conexão com autenticação e banco de dados.

## Atualizações futuras

A publicação pode ser atualizada quantas vezes forem necessárias. O endereço permanece o mesmo; basta gerar um novo deployment. Recomenda-se manter:

- ambiente beta para validação;
- ambiente oficial para produção;
- histórico de versões em Git;
- migrações de banco versionadas.
