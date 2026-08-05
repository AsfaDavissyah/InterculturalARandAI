# Project Completion Plan (Excluding Final 3D Characters)

## 1. Document Purpose

This document defines the remaining work required to complete the Intercultural AR and AI Speaking Practice System, excluding the production of final 3D character models.

The project currently has:

- A deployed Node.js backend.
- OpenAI-powered role-play conversations with a local fallback.
- Legacy Scenario Engine V2 scenarios.
- Three guided communication topics and six settings in the database.
- Topic and Setting public APIs.
- Session history and lecturer-linked student accounts.
- A Flutter mobile application with camera, speech recognition, TTS, subtitles, and a prototype AR avatar.
- An Admin and Lecturer web dashboard foundation.

The final 3D character assets may be developed in parallel. Until they are ready, the application must continue using prototype avatars and stable `avatar_key` values.

## 2. Delivery Principles

1. Existing legacy scenarios must remain available and functional.
2. New features must use the current white, clean, and consistent dashboard visual system.
3. Topic, setting, character, coaching, and scoring data must come from the backend instead of being hardcoded in mobile.
4. Conversation replies and detailed scoring must remain separate to protect response speed.
5. Every phase must include automated tests and physical Android device verification when relevant.
6. Student research data must remain attributable to the correct student and lecturer while respecting consent.

## 3. Workstream 1: Dashboard Topic and Setting Builder

### Objective

Allow an administrator to manage guided practice content without editing backend files.

### Scope

- Add Topic management to the Admin Dashboard.
- Add Setting management beneath each Topic.
- Support create, view detail, edit, activate, deactivate, and archive behavior.
- Preserve the current dashboard sidebar and visual language.
- Display visible success and error notifications for every mutation.
- Add search, status filters, and topic filters.
- Prevent accidental deletion of settings that already have research sessions; archive them instead.

### Topic Fields

- `topic_id`
- `title`
- `description`
- `icon_key`
- `display_order`
- `language_objectives`
- `icc_objectives`
- `is_active`

### Setting Fields

- `setting_id`
- `topic_id`
- `title`
- `location`
- `briefing`
- `sticker_asset_key`
- `student_role`
- AI display name
- AI role
- AI cultural background
- `avatar_key`
- `task_instruction`
- `conversation_stages`
- `constraints`
- `rubric`
- minimum, target, and maximum student responses
- `display_order`
- `is_active`
- version

### Acceptance Criteria

- An admin can create a new setting without changing backend source files.
- Invalid response-count ranges and missing required fields cannot be saved.
- Detail and edit dialogs display complete data.
- Deactivated content disappears from the public mobile API.
- Existing sessions remain readable after a setting is archived.

## 4. Workstream 2: Mobile Integration for Three Topics

### Objective

Make Academic, Social, and Professional Communication available in the student application while preserving legacy scenarios.

### Scope

- Add a practice-source selection between guided topics and existing scenarios.
- Fetch topics from `GET /api/topics`.
- Fetch settings from `GET /api/topics/:topic_id/settings`.
- Fetch setting details from `GET /api/settings/:setting_id`.
- Add a topic selection page.
- Add a setting selection page.
- Add a briefing page before the AR session.
- Send `topic_id` and `setting_id` to chat and session-history APIs.
- Keep legacy scenario selection in a separate, clearly labelled section.
- Add loading, empty, retry, and offline states.

### Acceptance Criteria

- All three topics and six settings can be opened from one APK.
- Legacy scenarios remain accessible.
- Mobile content reflects dashboard changes without rebuilding the APK, unless application code or bundled assets change.
- The selected topic and setting remain consistent through briefing, AR, result, and history screens.

## 5. Workstream 3: Setting-Based AR Experience

### Objective

Render the correct visual experience for each selected setting.

### Scope

- Map `avatar_key` to a local or remotely versioned GLB asset.
- Map `sticker_asset_key` to the correct 2D setting illustration.
- Place the 2D setting interface over the rear-camera view.
- Keep only the character as the 3D element.
- Standardize avatar scale, distance, vertical alignment, and camera framing.
- Slightly enlarge the avatar without covering subtitles or controls.
- Remove distracting dark overlays and inconsistent green backgrounds.
- Add model-loading progress and a fallback avatar.
- Handle missing, corrupt, or unsupported GLB files.
- Preserve idle and talking animation state transitions.

### Acceptance Criteria

- Every setting loads the intended sticker and avatar key.
- Camera framing is comfortable on the target Android phone.
- UI controls, subtitles, coaching, and avatar never overlap incoherently.
- A missing model does not crash the session.

## 6. Workstream 4: Silent Live Coaching

### Objective

Provide short intercultural or pragmatic guidance without turning the avatar into an evaluator.

### Scope

- Define coaching-trigger categories such as excessive directness, inappropriate informality, stereotyping, dismissiveness, and personal-boundary issues.
- Show at most one short coaching hint above the AR scene.
- Do not send coaching text to TTS.
- Do not add coaching text to role-play dialogue or transcript.
- Avoid coaching every grammar error or every short response.
- Hide hints automatically after a readable interval.
- Store coaching events with the student utterance, category, short hint, detailed explanation, and improved response.

### Acceptance Criteria

- The AI remains in character when coaching appears.
- Coaching is silent and visually distinct from subtitles.
- Important coaching events appear again on the result page.
- Normal short responses do not trigger unnecessary correction.

## 7. Workstream 5: Practice Result Redesign

### Objective

Provide a useful learning summary that visually matches the mobile Home experience.

### Scope

- Redesign the result page using the same typography, spacing, colors, and component language as Home.
- Display overall score and scores for grammar, vocabulary, fluency, politeness, pragmatic appropriateness, and intercultural awareness.
- Display completed and incomplete conversation objectives.
- Display coaching-event details and improved response examples.
- Display topic, setting, duration, response count, and practice time.
- Add transcript review.
- Add a retry action for the same setting and a return-to-practice action.
- Explain fallback or incomplete evaluation states without exposing technical errors.

### Acceptance Criteria

- The result page is readable on the target phone without overflow.
- Every visible value comes from persisted session data.
- Coaching shown during the session is represented in the result.
- A session can still finish gracefully when detailed OpenAI scoring fails.

## 8. Workstream 6: Lecturer Research Dashboard

### Objective

Give lecturers a focused interface for monitoring students and collecting research data.

### Scope

- Restrict lecturers to students registered with their lecturer code.
- Add filters for student, date range, topic, setting, scenario, completion status, and launch source.
- Add summary metrics for total sessions, completion rate, average duration, average response count, and average score.
- Add score trends per student and per assessment category.
- Add frequently observed coaching categories.
- Add session-detail views containing transcript, scores, objectives, coaching, duration, and technical metadata.
- Add CSV/XLSX export that respects current filters.
- Show consent status and prevent research export for students whose consent does not permit it.

### Acceptance Criteria

- A lecturer cannot see another lecturer's students.
- Filters produce consistent totals and session lists.
- Exported data matches the filtered dashboard data.
- Legacy and guided sessions can be compared without losing their original identifiers.

## 9. Workstream 7: Session Data Quality

### Objective

Ensure practice progress remains complete, reliable, and research-ready.

### Scope

- Persist `session_id`, experience type, scenario, topic, setting, avatar, and launch source.
- Persist start time, completion time, duration, response count, transcript, turn evaluations, final scores, objectives, and coaching events.
- Add session statuses: `started`, `in_progress`, `completed`, and `abandoned`.
- Make history upserts idempotent to avoid duplicate sessions.
- Record manual and automatic end reasons.
- Recover or finalize interrupted sessions after application restart.
- Store schema and content versions used by each session.
- Define retention, anonymization, and deletion behavior for research data.

### Acceptance Criteria

- Closing and reopening the mobile application does not erase completed progress.
- Repeated save requests do not create duplicate sessions.
- Dashboard and mobile history show the same session values.
- Old sessions remain readable after content is edited.

## 10. Workstream 8: AI Response Performance

### Objective

Reduce perceived and actual delay after the student finishes speaking.

### Scope

- Measure speech-finalization, network, OpenAI, parsing, TTS startup, and animation latency separately.
- Show the AI thinking state immediately after speech finalization.
- Show subtitles as soon as AI text is available.
- Start TTS immediately after text is received.
- Keep the prompt concise and send only recent turns plus session memory.
- Keep responses to one or two short sentences.
- Maintain a fast OpenAI timeout and in-character fallback.
- Evaluate whether response streaming materially improves subtitle latency.
- Cache predictable opening and closing audio where appropriate.
- Add structured latency metrics without logging sensitive transcript content unnecessarily.

### Acceptance Criteria

- The screen never appears frozen while waiting for AI.
- Timeout fallback appears quickly and remains in the selected role and setting.
- Median and upper-percentile latency can be measured from logs.
- Detailed scoring does not delay the conversational response.

## 11. Workstream 9: Speech Recognition and TTS

### Objective

Make spoken interaction feel closer to a natural video call.

### Scope

- Tune silence detection and end-of-speech timing.
- Display accurate listening, processing, speaking, and retry states.
- Handle empty, unclear, and very short recognition results.
- Prevent duplicate submission of one utterance.
- Prevent the microphone from recognizing the application's own TTS output.
- Select TTS voice using character metadata.
- Tune voice rate, pitch, volume, and locale.
- Synchronize talking animation with real TTS playback state.
- Stop TTS cleanly when a session is manually ended.

### Acceptance Criteria

- The microphone begins listening predictably and stops without excessive delay.
- One utterance creates exactly one student turn.
- AI speech does not re-enter the conversation as student speech.
- Subtitle visibility matches the spoken AI response.

## 12. Workstream 10: Conversation Quality Assurance

### Objective

Verify that every scenario behaves naturally and respects its instructional boundaries.

### Scope

- Create test scripts for polite, casual, overly direct, unclear, off-topic, and culturally inappropriate responses.
- Test all six guided settings and all legacy scenarios.
- Verify fixed character identity, role, relationship, location, and goals.
- Verify real student-name personalization without overuse.
- Verify that corrections never appear as avatar speech.
- Verify minimum 5, target 6–8, and maximum 10 student responses.
- Verify natural closing and manual session ending.
- Conduct lecturer review of language and ICC feedback.
- Record accepted prompt and rubric versions for research reproducibility.

### Acceptance Criteria

- No tested conversation changes role or location unexpectedly.
- No AI dialogue contains scores, correction language, or fabricated student dialogue.
- Session completion follows response count and objective rules.
- Lecturer reviewers approve the language and ICC behavior for client testing.

## 13. Workstream 11: Stability and Error Handling

### Objective

Prevent recoverable failures from becoming broken or confusing user experiences.

### Scope

- Add visible mobile errors for network, OpenAI, TTS, speech recognition, camera, and asset failures.
- Add visible dashboard notifications for API failures.
- Add bounded retries with idempotency protection.
- Handle offline mode and reconnection where practical.
- Add server health and dependency-status endpoints suitable for monitoring.
- Add request IDs to user-facing support errors.
- Ensure errors never expose API keys, database credentials, JWTs, or internal stack traces.
- Test interrupted session recovery.

### Acceptance Criteria

- Common failures have a clear retry or exit path.
- Retrying does not duplicate turns or sessions.
- The application remains usable through OpenAI or TTS fallback where supported.
- Production errors can be traced through request IDs.

## 14. Workstream 12: Production Security

### Objective

Protect user identities, research data, administrative functions, and paid API resources.

### Scope

- Replace long-lived dashboard JWT storage in `localStorage` with a safer session strategy, preferably secure `HttpOnly`, `Secure`, and `SameSite` cookies.
- Add refresh-token rotation or short-lived sessions.
- Add rate limiting for authentication, chat, evaluation, TTS, and administrative mutations.
- Validate and sanitize all API request bodies.
- Enforce role and ownership checks on every protected endpoint.
- Keep OpenAI and database secrets only on the backend.
- Add account lockout or throttling for repeated failed logins.
- Define consent, data access, export, retention, anonymization, and deletion policies.
- Add security headers and a strict CORS production configuration.
- Review dependency vulnerabilities before release.

### Acceptance Criteria

- Students, lecturers, and admins can access only their authorized data and actions.
- Browser scripts cannot directly read long-lived authentication tokens.
- Expensive endpoints are protected against simple abuse.
- Research data handling follows the client's approved consent policy.

## 15. Workstream 13: Automated Testing

### Objective

Protect the complete system against regression as dashboard and mobile features expand.

### Scope

- Add backend tests for Topic and Setting CRUD, authorization, inactive content, archived content, and validation.
- Add dashboard component and integration tests for forms, dialogs, filters, notifications, and role restrictions.
- Add Flutter unit tests for API mapping, session state, scoring data, and error handling.
- Add Flutter widget tests for topic, setting, briefing, AR state, result, and history screens.
- Add API contract tests shared between backend expectations and mobile models.
- Add timeout and fallback tests for OpenAI and TTS.
- Add end-to-end tests covering login through completed-session history.
- Add a regression checklist for physical-device camera, microphone, speech, TTS, and GLB behavior.

### Acceptance Criteria

- CI rejects code that breaks API contracts or role permissions.
- Topic and Setting CRUD flows have automated coverage.
- Mobile can parse every current public API response.
- Critical student journeys have automated or repeatable device tests.

## 16. Workstream 14: Learning Module and QR Foundation

### Objective

Allow printed modules or books to launch the correct conversation experience through scanning.

### Scope

- Define Module, Unit, Page, and Launch Token models.
- Associate a module page with a guided setting or legacy scenario.
- Generate opaque, revocable launch tokens rather than exposing raw database IDs.
- Add a public token-resolution endpoint with rate limiting.
- Add a mobile QR scanner and permission flow.
- Show the same briefing screen used by manual selection after a successful scan.
- Save `launch_source`, module, unit, page, and token metadata in the session.
- Add dashboard QR generation, activation, revocation, and download.
- Add scan and completion analytics after the basic flow is stable.
- Keep manual topic and scenario selection available.

### Acceptance Criteria

- A printed test QR opens the correct briefing and AR conversation.
- Invalid, expired, or inactive tokens show a safe error.
- QR and manual launch paths use the same conversation runtime.
- Lecturer analytics can distinguish manual and module-based practice.

## 17. Recommended Implementation Phases

### Phase 4: Content Management Dashboard

- Workstream 1: Dashboard Topic and Setting Builder.
- Backend CRUD and authorization tests from Workstream 13.
- Initial Lecturer filters from Workstream 6.

**Deliverable:** Admin-manageable topics and settings with stable public APIs.

### Phase 5: Guided Topic Mobile Flow

- Workstream 2: Mobile topic integration.
- Workstream 3: Setting-based AR experience.
- Essential session fields from Workstream 7.

**Deliverable:** Students can launch all six guided settings and all legacy scenarios.

### Phase 6: Coaching, Result, and Research Views

- Workstream 4: Silent live coaching.
- Workstream 5: Practice Result redesign.
- Workstream 6: Lecturer Research Dashboard.
- Complete Workstream 7 session persistence.

**Deliverable:** A complete learning and research feedback loop.

### Phase 7: Performance and Reliability

- Workstream 8: AI response performance.
- Workstream 9: Speech recognition and TTS.
- Workstream 10: Conversation QA.
- Workstream 11: Stability and error handling.

**Deliverable:** A natural and resilient physical-device conversation experience.

### Phase 8: Security, Coverage, and Module QR

- Workstream 12: Production security.
- Workstream 13: Complete automated testing.
- Workstream 14: Module and QR foundation.

**Deliverable:** A controlled research release ready for client acceptance testing.

## 18. Cross-Phase Definition of Done

A phase is complete only when:

1. The implementation is committed with a clear commit message.
2. Relevant automated tests pass.
3. Existing legacy scenarios still work.
4. API changes are documented and backward-compatible where required.
5. Error, loading, empty, and permission-denied states are implemented.
6. Data needed by mobile history and Lecturer Dashboard is persisted.
7. Physical Android testing is completed for camera, microphone, TTS, AR, or QR changes.
8. No credentials or personal research data are exposed in logs or client bundles.

## 19. Immediate Next Action

Begin Phase 4 with the Topic and Setting CRUD backend contract, then connect it to the existing Admin Dashboard using the current white dashboard layout. This work can proceed with prototype avatars because all settings already reference stable `avatar_key` values.
