# Purple Gestão — Academic Migration V2 Plan

Data de referência: 2026-08-28

## Resumo

Fonte real observada:

- 159 students legados
- 5 classes legadas
- 7 teachers legados

Tabelas tipadas reais em produção:

- `students`: não existe
- `classes`: não existe
- `teachers`: não existe

## Modelagem definitiva proposta

### teachers

Colunas canônicas:

- `id uuid`
- `legacy_record_id text unique`
- `name text not null`
- `email text null`
- `phone text null`
- `workload text null`
- `classes_count integer not null default 0`
- `score numeric(6,2) null`
- `status text not null`
- `data jsonb not null default '{}'::jsonb`
- `created_at`
- `updated_at`

Campos observados:

| campo legado | tipo observado | frequência | nullable | destino tipado | observação |
|---|---:|---:|---|---|---|
| `id` | string | 7/7 | não | `legacy_record_id` | identificador legado |
| `name` | string | 7/7 | não | `name` | obrigatório |
| `status` | string | 7/7 | não | `status` | obrigatório |
| `updatedAt` | string | 7/7 | não | `data.updatedAt` + `updated_at` | manter histórico |
| `workload` | string | 5/7 | sim | `workload` | opcional |
| `phone` | string | 2/7 | sim | `phone` | opcional |
| `email` | string | 0/7 preenchido | sim | `email` | opcional/ausente |
| `classesCount` | number | 7/7 | não | `classes_count` | derivado/operacional |
| `score` | number | 7/7 | não | `score` | opcional |
| `history` | array | 7/7, 0 não-vazio | sim | `data.history` | legado |
| `feedbacks` | string | 0/7 preenchido | sim | `data.feedbacks` | legado |
| `occurrences` | string | 0/7 preenchido | sim | `data.occurrences` | legado |
| `indicators` | string | 0/7 preenchido | sim | `data.indicators` | legado |

### classes

Colunas canônicas:

- `id uuid`
- `legacy_record_id text unique`
- `name text not null`
- `course text not null`
- `category text not null`
- `level text null`
- `class_number integer not null default 1`
- `teacher_id uuid null references teachers(id)`
- `room text null`
- `schedule_label text null`
- `capacity integer not null default 0`
- `students_count integer not null default 0`
- `module_hours integer null`
- `class_type text null`
- `book_legacy_ref text null`
- `start_date date null`
- `projected_end_date date null`
- `status text not null`
- `data jsonb not null default '{}'::jsonb`
- `created_at`
- `updated_at`

Campos observados:

| campo legado | tipo observado | frequência | nullable | destino tipado | observação |
|---|---:|---:|---|---|---|
| `id` | string | 5/5 | não | `legacy_record_id` | identificador legado |
| `name` | string | 5/5 | não | `name` | obrigatório |
| `course` | string | 5/5 | não | `course` | obrigatório |
| `category` | string | 5/5 | não | `category` | obrigatório |
| `teacherId` | string | 5/5 | não | `teacher_id` | FK segura |
| `bookId` | string | 5/5 | não | `book_legacy_ref` | sem FK nesta fase |
| `classNumber` | number | 5/5 | não | `class_number` | obrigatório |
| `capacity` | number | 5/5 | não | `capacity` | obrigatório |
| `studentsCount` | number | 5/5 | não | `students_count` | obrigatório |
| `moduleHours` | number | 5/5 | sim | `module_hours` | opcional |
| `classType` | string | 5/5 | sim | `class_type` | opcional |
| `level` | string | 3/5 preenchido | sim | `level` | opcional |
| `room` | string | 5/5 | não | `room` | obrigatório no estado real |
| `schedule` | string | 5/5 | não | `schedule_label` | denormalizado útil |
| `scheduleBlocks` | array | 5/5 | não | `data.scheduleBlocks` | legado estrutural |
| `recessPeriods` | array | 1/5 não-vazio | sim | `data.recessPeriods` | legado estrutural |
| `startDate` | string | 2/5 preenchido | sim | `start_date` | opcional |
| `projectedEndDate` | string | 2/5 preenchido | sim | `projected_end_date` | opcional |
| `status` | string | 5/5 | não | `status` | obrigatório |

### students

Colunas canônicas:

- `id uuid`
- `legacy_record_id text unique`
- `code text not null`
- `name text not null`
- `full_name text null`
- `social_name text null`
- `document text null`
- `rg text null`
- `birth_date date null`
- `sex text null`
- `email text null`
- `phone text null`
- `whatsapp text null`
- `contact_phone text null`
- `guardian_name text null`
- `responsible_name text null`
- `class_id uuid null references classes(id)`
- `status text not null`
- `registration_date date null`
- `address_line text null`
- `address_number text null`
- `district text null`
- `city text null`
- `state text null`
- `zip_code text null`
- `data jsonb not null default '{}'::jsonb`
- `created_at`
- `updated_at`

Decisões:

- não criar `teacher_id` canônico em `students`
- `timeline`, `responsibles`, `addressData`, `responsibleFinancial` e demais estruturas ricas permanecem em `data`

Campos observados principais:

| campo legado | tipo observado | frequência | nullable | destino tipado | observação |
|---|---:|---:|---|---|---|
| `id` | string | 159/159 | não | `legacy_record_id` | identificador legado |
| `code` | string | 159/159 | não | `code` | obrigatório |
| `name` | string | 159/159 | não | `name` | obrigatório |
| `fullName` | string | 159/159 | não | `full_name` | manter por compatibilidade |
| `guardian` | string | 159/159 | não | `guardian_name` | obrigatório no estado real |
| `responsible` | string | 159/159 | não | `responsible_name` | obrigatório no estado real |
| `status` | string | 159/159 | não | `status` | obrigatório |
| `situation` | string | 159/159 | não | `data.situation` | legado paralelo |
| `birthDate` | string | 159/159 | não | `birth_date` | preferir camelCase como fonte |
| `birth_date` | string | 159/159 | não | `data.birth_date` | legado redundante |
| `document` | string | 116/159 preenchido | sim | `document` | opcional |
| `cpf` | string | 116/159 preenchido | sim | `data.cpf` | legado redundante/sensível |
| `email` | string | 127/159 preenchido | sim | `email` | opcional |
| `phone` | string | 159/159 preenchido | não | `phone` | obrigatório no estado real |
| `whatsapp` | string | 159/159 preenchido | não | `whatsapp` | obrigatório no estado real |
| `contactPhone` | string | 88/159 preenchido | sim | `contact_phone` | opcional |
| `classId` | string | 23/159 preenchido | sim | `class_id` | FK opcional |
| `registrationDate` | string | 159/159 | não | `registration_date` | obrigatório no estado real |
| `address` | string | 158/159 preenchido | sim | `address_line` | opcional |
| `number` | string | 154/159 preenchido | sim | `address_number` | opcional |
| `bairro` / `neighborhood` | string | 157/159 preenchido | sim | `district` | consolidar |
| `cidade` / `city` | string | 158/159 preenchido | sim | `city` | consolidar |
| `state` / `uf` | string | 158/159 preenchido | sim | `state` | consolidar |
| `cep` / `zip` | string | 159/159 | não | `zip_code` | consolidar |
| `responsibles` | array | 159/159 não-vazio | não | `data.responsibles` | legado rico |
| `responsibleFinancial` | object | 159/159 não-vazio | não | `data.responsibleFinancial` | legado rico |
| `addressData` | object | 159/159 não-vazio | não | `data.addressData` | legado rico |
| `timeline` | array | 23/159 não-vazio | sim | `data.timeline` | base para follow-up |

## Campos obrigatórios / opcionais / legados / derivados

### Obrigatórios

- teachers: `legacy_record_id`, `name`, `status`
- classes: `legacy_record_id`, `name`, `course`, `category`, `teacher_id`, `class_number`, `capacity`, `students_count`, `status`
- students: `legacy_record_id`, `code`, `name`, `guardian_name`, `responsible_name`, `status`, `registration_date`

### Opcionais

- students: `document`, `email`, `class_id`, `address_number`, `district`, `city`, `state`
- classes: `level`, `module_hours`, `class_type`, `start_date`, `projected_end_date`
- teachers: `email`, `phone`, `workload`, `score`

### Legados

- students: `birth_date`, `cpf`, `situation`, `responsibles`, `responsibleFinancial`, `addressData`, `timeline`
- teachers: `history`, `feedbacks`, `occurrences`, `indicators`
- classes: `scheduleBlocks`, `recessPeriods`

### Derivados

- `students_count`
- `classes_count`
- relatórios de presença, timeline e saúde acadêmica

### Desconhecidos / não promover agora

- qualquer campo de aluno não observado no payload real de produção
- vínculo direto `student.teacher`

## Estratégia de backfill acadêmico

- chave primária de reconciliação: `legacy_record_id`
- nunca usar nome como chave
- classes entram antes de students
- teachers entram antes de classes
- alunos sem `classId` permanecem com `class_id = null`
- ambiguidades vão para relatório, não para heurística automática
