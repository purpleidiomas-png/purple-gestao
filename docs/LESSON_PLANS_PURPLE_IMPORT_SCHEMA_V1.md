# LESSON PLANS — PURPLE IMPORT SCHEMA v1

This contract imports Purple pedagogical packages into the existing Lesson Plans workspace without creating a parallel system.

## Schema

```json
{
  "schemaVersion": "lesson-plans-purple-import-v1",
  "collection": {"id": "purple-way", "name": "Purple Way"},
  "book": {"id": "connect", "name": "Connect — 2ª Edição"},
  "curriculum": {
    "id": "connect-2026-2",
    "semester": "2026.2",
    "totalHours": 42,
    "totalMeetings": 21,
    "meetingDuration": "120 pedagogical minutes + 10-minute break"
  },
  "units": [
    {
      "id": "connect-u01",
      "title": "Unit 01",
      "theme": "Yesterday",
      "bookRange": "6-17",
      "classroomPages": "10,12,14,16",
      "homework": "8-9",
      "objective": "...",
      "language": ["..."],
      "vocabulary": ["..."],
      "communicativeFunctions": ["..."],
      "skills": ["..."],
      "expectedOutcome": "...",
      "unitMastery": "..."
    }
  ],
  "meetings": [
    {
      "id": "connect-m05",
      "meetingNumber": 5,
      "meetingType": "transition",
      "status": "RASCUNHO",
      "title": "Meeting 05",
      "theme": "When Something Happened -> I’m Totally Lost",
      "curriculumHours": "9-10",
      "duration": 120,
      "breakMinutes": 10,
      "unitRelations": [
        {"unitId": "connect-u02", "pages": "28-30"},
        {"unitId": "connect-u03", "pages": "36-38"}
      ],
      "objective": "...",
      "teacherPreparation": "...",
      "rapidSummary": "...",
      "learningArcs": [
        {"title": "ARC A", "unitId": "connect-u02", "pages": "28-30", "duration": 55, "steps": ["..."]}
      ],
      "lessonFlow": {
        "presentation": {"duration": 10, "objective": "...", "instructions": "..."},
        "practice": {"duration": 40, "objective": "...", "instructions": "..."},
        "review": {"duration": 16, "objective": "...", "instructions": "..."},
        "production": {"duration": 28, "objective": "...", "instructions": "..."},
        "closing": {"duration": 6, "objective": "...", "instructions": "..."}
      },
      "resources": ["connect-res-directions-map"],
      "bookReferences": [{"bookId": "connect", "pages": "36-38", "action": "OPEN_BOOK_AT_PAGE"}]
    }
  ],
  "resources": [
    {
      "id": "connect-res-core-questions",
      "title": "Connect Core Questions Bank U01–03",
      "type": "Material complementar",
      "status": "TO_BE_CREATED",
      "priority": "ESSENTIAL",
      "url": ""
    }
  ]
}
```

## Valid Example

The first real package is `Purple Way -> Connect — 2ª Edição -> Connect 2026.2`, importing Units 01-03 and Class Meetings 02-06. Meeting 05 is valid because `meetingType` is `transition` and `unitRelations` contains both Unit 02 and Unit 03.

## Validation

Required validations before import:

- `schemaVersion` must equal `lesson-plans-purple-import-v1`.
- `collection.id`, `book.id`, `curriculum.id`, every `unit.id`, every `meeting.id` and every `resource.id` must be stable IDs.
- A meeting must have `duration`, `breakMinutes`, `objective`, `unitRelations`, `lessonFlow` or `learningArcs`.
- A transition meeting must have at least two `unitRelations`.
- External URLs are optional and must never be invented by the importer.
- Imported meetings must default to draft status and `baseVersion:false`.

## Import Mechanism

The current implementation imports the Connect Units 01-03 package idempotently through the Lesson Plans workspace normalizer. Future UI import should use the same contract:

1. Upload or paste package.
2. Validate schema.
3. Show preview by collection, book, unit, meeting, resources and warnings.
4. Import as draft only.
5. Preserve existing cover/PDF storage paths, history, contributions, permissions, R.A.P.I.D. checks and version metadata.
6. Save through the existing persistent workspace record.

## Duplicate Protection

The importer must upsert by stable IDs, not by names. Re-importing the same package updates matching records and does not duplicate units, meetings, plans, resources or cycles.

## Error Report

Preview/import must return clear errors grouped by:

- Missing required fields.
- Invalid unit references.
- Invalid transition meeting relations.
- Duplicate IDs inside the package.
- Unsupported resource URLs or files.
- Persistence/security failures.
