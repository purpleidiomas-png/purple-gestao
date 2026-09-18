# Purple Gestão — Book Production Upgrade Plan

Data de referência: 2026-08-28

## Estado real confirmado

- `production_books`: 15
- `production_book_orders`: 2
- `production_book_order_items`: 12
- `production_book_order_recipients`: não existe
- `create_production_book_order_v3`: não existe
- `create_production_book_order`: existe

## O que V3 adiciona

A migration V3 adiciona:

- `production_book_order_recipients`
- `order_source`
- `source_context`
- flexibilização de `next_book_id`
- RPC `create_production_book_order_v3`
- suporte explícito a pedidos:
  - `STOCK`
  - `CLASS`
  - `STUDENT`

## O que a produção real já suporta

Com V1/V2 parcial:

- cadastro/configuração de livros
- status de ordens
- itens de pedido
- pedidos legados
- fluxo de estoque via RPC antiga

## Análise

V3 não é automaticamente obrigatória.

Ela é necessária apenas se quisermos manter em produção, de forma tipada e nativa:

- pedidos por aluno específico
- recipients separados do vínculo por turma
- `order_source` explícito como contrato persistido

Se o objetivo imediato for apenas manter compatibilidade com o que já existe em produção real, o frontend pode continuar compatível com V2.

## Recomendação

Curto prazo:

- manter compatibilidade com V2 real
- não assumir V3 no carregamento
- tratar V3 como upgrade opcional e não como pré-requisito de leitura

Médio prazo:

- aplicar V3 apenas quando houver necessidade funcional comprovada de `STUDENT`/`CLASS` flexível em produção

## Condições para upgrade V3

- preservar obrigatoriamente 15 books, 2 orders, 12 items
- validar que os 2 pedidos atuais continuam legíveis
- validar ausência de impacto no carregamento inicial
- testar fallback para RPC antiga quando aplicável
