# API Contract Baseline (Phase 0)

**Project:** Intercultural AR and AI Speaking Practice
**Recorded:** 2026-08-04
**Status:** Verified against `backend/server.js` and regression tests

This document records the backward-compatible API surface used by the current Flutter application before guided topics and settings are exposed publicly.

## General Conventions

- JSON request and response fields use `snake_case` at the mobile API boundary.
- Scenario IDs are case-insensitive on input and uppercase on output.
- Authenticated endpoints require `Authorization: Bearer <JWT>`.
- Additive response fields are allowed. Existing fields must not be renamed or removed without a versioned migration.

## `GET /api/scenarios`

Returns all active legacy scenario summaries, sorted by `scenario_id`.

### Response `200`

```json
[
  {
    "scenario_id": "G-ICC-008",
    "scenario_version": 1,
    "title": "Meeting an International Student on Campus",
    "scenario_type": "Global Intercultural",
    "level": "B1",
    "ar_scene": "In front of the International Office on campus",
    "student_role": "Rina, a student volunteer welcoming an international student",
    "ai_role": "David, an exchange student from Melbourne, Australia",
    "task_instruction": "Meet David in front of the International Office, get acquainted, answer his campus and cultural questions, and begin the campus tour."
  }
]
```

The baseline installation contains ten legacy scenarios.

## `GET /api/scenarios/:scenario_id`

Returns the complete Scenario Engine V2 JSON for one active scenario.

### Required top-level fields

```json
{
  "schema_version": "2.0",
  "scenario": {},
  "context": {},
  "characters": [],
  "prototype_scope": {},
  "session_rules": {},
  "conversation_objectives": [],
  "conversation_stages": [],
  "initial_conversation_state": {},
  "fallback_responses": {},
  "rubric": {}
}
```

### Response `404`

```json
{
  "error": true,
  "message": "Scenario UNKNOWN is not available."
}
```

## `POST /api/chat/respond-turn`

Fast conversational response endpoint. Detailed scoring may be finalized separately.

### Request

```json
{
  "session_id": "session_12345",
  "scenario_id": "G-ICC-008",
  "student_response_count": 1,
  "conversation_history": [
    {
      "speaker": "AI",
      "message": "Hi, excuse me. Are you Rina?"
    }
  ],
  "student_response": "Yes, welcome to our university.",
  "student_display_name": "Alya",
  "student_id": "student_001"
}
```

### Response `200`

```json
{
  "session_id": "session_12345",
  "scenario_id": "G-ICC-008",
  "turn_number": 1,
  "ai_message": "...",
  "detected_category": "ACCEPTABLE",
  "scores": {},
  "feedback": "...",
  "cultural_note": "...",
  "improved_response": "...",
  "continue_conversation": true,
  "completed_objective_ids": [],
  "session_progress": {},
  "session_memory": {},
  "end_reason": null,
  "source": "local_fast_fallback",
  "fallback_reason": "openai_not_configured"
}
```

`source` can be `openai_chat` or `local_fast_fallback`.

## `POST /api/chat/evaluate-turn`

Evaluates one student response while preserving the same conversation progress contract.

### Request

The request fields are the same as `respond-turn`. `scenario_id` and `student_response` are required. `student_response_count` must be an integer from 1 through the scenario maximum.

### Response `200`

The response has the same fields as `respond-turn`. `source` can be `openai`, `local_fallback`, or another explicitly reported fallback source configured by the service.

### Response `400`

```json
{
  "error": true,
  "message": "scenario_id and student_response are required."
}
```

## `POST /api/history`

Creates or updates a practice session for the authenticated student. Upsert identity is the combination of authenticated `userId` and `session_id`.

### Request

```json
{
  "session_id": "session_guided_001",
  "student": {
    "student_id": "student_001",
    "display_name": "Alya"
  },
  "scenario": {
    "scenario_id": "ACADEMIC-LECTURER-OFFICE",
    "title": "Lecturer's Office Consultation",
    "scenario_version": 1
  },
  "started_at": "2026-08-04T01:55:00.000Z",
  "completed_at": "2026-08-04T02:00:00.000Z",
  "duration_seconds": 300,
  "status": "completed",
  "end_reason": "objectives_completed",
  "student_response_count": 7,
  "transcript": [],
  "evaluations": [],
  "average_scores": {},
  "overall_score": 4.2,
  "completed_objective_ids": [],
  "experience_type": "guided_topic",
  "topic_id": "academic-communication",
  "topic_title": "Academic Communication",
  "setting_id": "ACADEMIC-LECTURER-OFFICE",
  "setting_title": "Lecturer's Office Consultation",
  "avatar_key": "female_lecturer_v1",
  "launch_source": "browse",
  "module_id": null,
  "unit_id": null,
  "page_id": null,
  "coaching_events": []
}
```

### Response `201`

Returns the serialized session using the same `snake_case` fields. Optional guided-topic and module fields are returned as `null` or empty arrays for legacy sessions.

### Response `400`

```json
{
  "error": "session_id is required"
}
```

## `GET /api/history`

Returns authenticated student sessions ordered by `completed_at` descending. Every item follows the `POST /api/history` response contract.

## `DELETE /api/history/:session_id`

Deletes only a session owned by the authenticated user.

### Response `200`

```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

### Response `404`

```json
{
  "error": "Session record not found"
}
```

## `POST /api/tts`

### Request

```json
{
  "text": "Thank you. Shall we begin?",
  "gender": "female",
  "ai_role": "Foreign lecturer"
}
```

### Response `200`

```json
{
  "success": true,
  "audio_url": "https://backend.example/audio_cache/generated-file.mp3",
  "file_name": "generated-file.mp3"
}
```

## Regression Enforcement

`backend/test/session_flow.test.js` verifies:

- all ten legacy scenarios remain listed and loadable;
- every legacy scenario can evaluate its first response;
- `respond-turn` keeps the fast chat contract;
- legacy history fields survive normalization and serialization;
- guided topic, setting, avatar, launch source, module, and coaching fields survive the same round trip.
