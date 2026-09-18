# Purple Gestão — Follow-up Migration Plan

Data de referência: 2026-08-28

## Estado real

- 23 alunos possuem `timeline`
- 23 eventos totais em `timeline`
- 0 alunos possuem `followUpEntries`
- `student_followups` não existe em produção

## Estrutura real dos eventos

Campos observados nos 23 eventos:

- `at`
- `title`
- `detail`

## Classificação semântica agregada

Resultado da leitura real:

- `ACOMPANHAMENTO_HUMANO`: 0
- `ALTERACAO_ACADEMICA`: 23
- `FINANCEIRO`: 0
- `SISTEMA`: 0
- `WHATSAPP`: 0
- `REPOSIÇÃO/REFORÇO`: 0
- `OUTRO`: 0

## Decisão arquitetural

`student_followups` não deve receber todo evento de timeline.

Nesta fotografia de produção:

- migráveis para `student_followups`: 0
- não migráveis: 23
- ambíguos: 0

Logo:

- `timeline` continua necessária como trilha geral do aluno
- `student_followups` nasce para acompanhamento humano real futuro
- backfill inicial de follow-up = zero linhas

## Estrutura recomendada de `student_followups`

- `id uuid`
- `student_id uuid not null`
- `legacy_record_id text null`
- `source_module text not null`
- `source_ref text null`
- `contact_at timestamptz not null`
- `employee_name text null`
- `subject text not null`
- `result text null`
- `next_contact_date date null`
- `done boolean not null default true`
- `notes text null`
- `payload jsonb not null default '{}'::jsonb`
- `created_by uuid null`
- `updated_by uuid null`
- `created_at`
- `updated_at`

## Regras de backfill

- ler de `app_records(kind='student').data.timeline`
- classificar semanticamente
- inserir apenas itens classificados como acompanhamento humano
- preservar evento original intocado em `data.timeline`
- registrar itens excluídos do backfill em relatório

## Regras para futuro cutover

- WhatsApp/TWR não escrevem mais direto em `student.timeline`
- passam por RPC única que grava:
  - `student_followups` quando for acompanhamento
  - `timeline` quando for evento geral

Até lá:

- manter legado
- não executar dual-write cego
