# Purple Gestão — Fluxos

**Status:** Proposta para aprovação

## 1. Convenções

- Toda operação protegida exige sessão válida.
- A autorização é conferida no servidor e no banco.
- Eventos relevantes geram auditoria.
- Horários são armazenados em UTC e apresentados em `America/Sao_Paulo`.
- Erros de validação preservam os dados já digitados sempre que seguro.

## 2. Ciclo do usuário

### Convite e ativação

1. Direção ou administrador autorizado cadastra nome, e-mail, papel e escopo.
2. O sistema envia convite de uso único com validade.
3. O usuário define senha e aceita os termos aplicáveis.
4. O perfil torna-se ativo.
5. A ativação é auditada.

### Login e recuperação

1. Usuário informa credenciais.
2. O provedor valida identidade e estado do perfil.
3. O sistema carrega somente o escopo autorizado.
4. Em recuperação, um link de uso único permite redefinir a senha.
5. Sessões anteriores podem ser revogadas após redefinição.

## 3. Ciclo principal do relatório

```text
RASCUNHO -> ENVIADO -> EM_ANALISE -> APROVADO -> ARQUIVADO
                         |
                         v
                AJUSTE_SOLICITADO -> RASCUNHO/REENVIADO
```

### Criação e envio

1. Líder escolhe frequência e período do próprio setor.
2. Sistema carrega o schema vigente no início do período.
3. Líder preenche métricas, análise e ações.
4. Rascunho pode ser salvo incompleto.
5. No envio, todas as regras obrigatórias são validadas.
6. Uma versão submetida é congelada e a Direção é notificada.

### Análise e ajuste

1. Direção abre a fila e assume a análise.
2. Pode aprovar ou solicitar ajuste.
3. Ajuste exige orientação clara e itens afetados.
4. O líder recebe notificação e cria nova versão a partir da anterior.
5. A versão anterior permanece preservada.
6. O reenvio retorna à fila da Direção.

### Aprovação e PDF

1. Direção confirma que dados e justificativas estão completos.
2. Servidor valida papel, estado e versão corrente.
3. Relatório passa a aprovado com aprovador e data.
4. PDF é gerado da versão congelada.
5. Arquivo, hash e template usado são registrados.
6. Falha no PDF não desfaz silenciosamente a aprovação; fica como pendência operacional com retentativa segura.

### Arquivamento

Somente relatório aprovado pode ser arquivado. Arquivamento remove o item das filas ativas, mas não apaga dados, versões, PDF ou auditoria.

## 4. Plano de ação

1. Usuário autorizado cria ação a partir de um achado ou relatório.
2. Define responsável, prazo, prioridade e resultado esperado.
3. Responsável aceita/inicia a ação e publica atualizações.
4. Sistema alerta proximidade e atraso.
5. Conclusão exige resultado obtido e, quando aplicável, evidência.
6. Cancelamento exige justificativa.

## 5. Dashboard para detalhe

1. Usuário seleciona filtros.
2. Sistema calcula indicadores apenas sobre dados autorizados.
3. Cada cartão informa período e atualização.
4. Clique abre a listagem filtrada que explica o valor.
5. Exportação mantém o mesmo filtro e escopo.

## 6. Anexos

1. Cliente solicita autorização de upload.
2. Servidor valida relatório, perfil, extensão e limite.
3. Arquivo é enviado para área privada.
4. Metadados e hash são registrados.
5. Download usa URL temporária após nova autorização.
6. Exclusão lógica é permitida apenas antes do envio; anexos submetidos permanecem no histórico.

## 7. Administração de usuário

1. Administrador autorizado altera papel ou escopo.
2. Sistema impede autoelevação e preserva ao menos um responsável de Direção ativo.
3. Mudança sensível revoga sessões existentes.
4. Desativação bloqueia novo login sem apagar autoria histórica.

## 8. Falhas e concorrência

- Envios usam chave de idempotência.
- Atualizações usam versão de registro para detectar conflito.
- Conflito oferece recarregar ou revisar diferenças; nunca sobrescreve silenciosamente.
- Indisponibilidade mostra estado recuperável e não declara sucesso antes da confirmação.
- Jobs de PDF e notificações têm retentativa e fila de falhas.

## 9. Fluxos excepcionais

- **Prazo vencido:** relatório continua permitido, marcado como atrasado.
- **Aprovador ausente:** delegação temporária previamente auditada.
- **Indicador corrigido após aprovação:** nova revisão; PDF anterior continua preservado.
- **Usuário desativado com ações abertas:** Direção deve reatribuir responsabilidades.
- **Período sem movimento:** relatório é enviado com zeros e justificativa, não omitido.

## 10. Critérios de aceite dos fluxos

- Nenhuma transição inválida é aceita por chamada direta à API.
- Repetir uma requisição segura não duplica efeitos.
- Estado, versão, ator e data são sempre reconciliáveis.
- Notificação não é fonte de verdade; o estado do domínio é.

## Documentos relacionados

- [08 - Relatórios](08%20-%20Relatórios.md)
- [09 - Regras de Negócio](09%20-%20Regras%20de%20Negócio.md)
- [10 - API](10%20-%20API.md)
- [07 - Permissões](07%20-%20Permissões.md)
