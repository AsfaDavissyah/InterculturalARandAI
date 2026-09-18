# Batch 3: Realtime Research Session

Batch 3 connects the Realtime conversation to Engora's existing research-session pipeline.

## Runtime flow

1. Flutter creates the Engora `session_id` before requesting a Realtime client secret.
2. The backend validates that ID, includes it in the audit event, and returns it with the OpenAI Realtime session ID.
3. Learner transcription deltas are shown while the learner is speaking. The completed transcript is committed once per OpenAI item ID.
4. Agent transcript deltas drive the subtitle. The completed transcript is committed once per agent item ID.
5. Each completed learner turn starts `/api/chat/evaluate-turn` in the background. The conversation audio is not blocked by this request.
6. Background results update rubric evidence and the union of completed objective IDs.
7. Finishing the practice writes one `PracticeSession` locally and to `/api/history`, including both speakers, message timestamps, duration, learner turns, latency traces, completion status, and end reason.

## Persisted linkage

- `session_id`: Engora research record identity.
- `conversation_mode`: `realtime` when Realtime was used, otherwise `standard`.
- `realtime_session_id`: OpenAI session identity for operational correlation; it is not a credential.
- `setting_id`, `topic_id`, and scenario data: research context.

Ephemeral client secrets and the server API key are never stored in the practice record.

## Completion behavior

The learner starts the conversation. Objective coverage only unlocks the completion action; it does not force the agent to close the conversation. The flag action records `ended_manually`, while the objective completion action records `completed` with `objectives_completed` as the end reason.
