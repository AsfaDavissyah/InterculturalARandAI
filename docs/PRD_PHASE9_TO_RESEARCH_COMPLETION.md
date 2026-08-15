# Product Requirements Document: Phase 9 to Research Completion

**Product:** Intercultural AR and AI Speaking Practice System  
**Document status:** Ready for implementation review  
**Prepared:** 2026-08-10  
**Scope end:** Research-ready client handover, excluding Play Store and App Store publication

## 1. Purpose

This PRD defines the work required after Phase 8 to finish the application as a stable research product. It covers production security, automated delivery checks, visual finishing, physical Android validation, client acceptance, and final handover.

The goal is not to redesign the implemented product or introduce a new architecture. The goal is to protect the completed feature set, finish the learner experience, and produce a version that can be used reliably by lecturers and students in the research setting.

## 2. Current Baseline

The system currently includes:

- A Railway-hosted Node.js backend with MongoDB and OpenAI integration.
- A Vercel-hosted Admin and Lecturer Dashboard.
- A Flutter Android application with rear-camera practice, speech recognition, neural/local TTS, subtitles, 3D avatars, silent coaching, results, and local/server history.
- Ten legacy Scenario Engine V2 scenarios.
- Three guided communication topics with six settings.
- Four final guided avatar assets: Dr Emma, Sarah, Olivia, and Michael/HR.
- Topic and Setting CRUD, Lecturer research views, and Learning Module QR management.
- Secure hashed launch tokens and mobile QR scanning.
- Automated verification currently passing: backend 54 tests, dashboard 11 tests, mobile 19 tests, and Flutter static analysis.

Known completion gaps:

- Production backend still contains a fallback JWT secret and default admin credentials.
- GitHub Actions builds an APK without first running all project checks.
- Final six 2D setting stickers are not supplied.
- Current GLBs contain body animation but no facial bones or morph targets.
- Physical Android and client acceptance checklists are not signed off.
- The Android release build still uses debug signing and the example application ID.
- The latest opening and startup-latency improvements must be deployed and installed for final validation.

## 3. Product Goals

1. Protect deployed research data and administrative access.
2. Prevent untested code from producing a client APK.
3. Complete a coherent visual and conversational experience for all guided settings.
4. Verify the complete learner-to-lecturer data flow on real Android devices.
5. Deliver a stable, reproducible, signed research build and operating guide.
6. Preserve all legacy scenarios and completed Phase 0-8 behavior.

## 4. Non-Goals

The following are explicitly outside this completion scope:

- Play Store or App Store submission.
- iOS deployment.
- Full phoneme-level facial lip-sync.
- OpenAI Realtime migration.
- Mandatory SSE or WebSocket migration without measured latency justification.
- Moving bundled avatars to cloud storage.
- Splitting the project into multiple Git repositories.
- Turborepo or pnpm workspace adoption.
- Large-scale rewrite of `backend/server.js` or `dashboard/src/App.jsx`.

These items may be evaluated after research handover.

## 5. Users and Roles

### Student

- Registers with identity, consent, and lecturer code.
- Selects a guided topic, legacy scenario, or module QR activity.
- Speaks with an in-character avatar in the rear-camera view.
- Receives silent coaching and a saved practice result.

### Lecturer

- Sees only students associated with the lecturer's code.
- Reviews sessions, scores, transcripts, objectives, and coaching events.
- Filters and exports permitted research data.

### Administrator

- Manages lecturers, topics, settings, scenarios, modules, units, pages, and QR launch tokens.
- Maintains content without editing backend source files.

## 6. Delivery Principles

- Security fixes take priority over visual polishing.
- Existing API contracts remain backward-compatible.
- Legacy and guided practice continue using one shared conversation runtime.
- Student corrections remain silent and separate from avatar dialogue.
- Detailed scoring remains outside the critical chat-response path.
- No final asset or refactor may remove passing regression coverage.
- Secrets, signing files, passwords, and production keys must never enter Git.
- Every phase must leave a rollback point and a documented verification result.

## 7. Phase 9: Security and Delivery Hardening

### Objective

Remove known production credential risks and make automated tests mandatory before Android artifacts are produced.

### 7.1 Backend Security Requirements

- Remove the production fallback value for `JWT_SECRET`.
- In production, fail startup with a clear error when `JWT_SECRET` is missing or shorter than the approved minimum.
- Use a minimum 32-byte random JWT secret stored only in Railway variables.
- Remove hardcoded `admin@icc.com` and `Admin123!` creation from normal startup.
- Add an explicit one-time admin bootstrap mechanism controlled by environment variables.
- Disable admin bootstrap by default after the first administrator exists.
- Never print a password or full secret in application logs.
- Require a non-empty `CORS_ORIGIN` allowlist in production.
- Keep authentication and role authorization tests for Admin, Lecturer, and Student endpoints.
- Rotate the deployed JWT secret and administrator password after the code is updated.
- Document that JWT rotation signs all current users out.

Recommended environment contract:

```text
JWT_SECRET=<random secret, minimum 32 bytes>
CORS_ORIGIN=https://intercultural-ar-and-ai.vercel.app
ADMIN_BOOTSTRAP_ENABLED=false
ADMIN_BOOTSTRAP_NAME=<initial administrator name>
ADMIN_BOOTSTRAP_EMAIL=<initial administrator email>
ADMIN_BOOTSTRAP_PASSWORD=<strong temporary password>
```

### 7.2 CI Quality Gate Requirements

Update GitHub Actions so a release artifact is created only after:

1. Backend dependency installation and `npm test`.
2. Dashboard dependency installation, tests, lint, and production build.
3. Flutter dependency installation, static analysis, and tests.
4. Android build after every previous step succeeds.
5. Upload of the generated artifact with commit SHA and build metadata.

CI must not contain production OpenAI, MongoDB, JWT, or signing secrets unless a specific protected deployment job later requires them.

### 7.3 Phase 9 Acceptance Criteria

- Production startup refuses a missing or weak JWT secret.
- No default password is present in runtime source or logs.
- Initial admin creation requires an explicit, temporary bootstrap switch.
- Production CORS accepts the approved dashboard and rejects an unapproved browser origin.
- All existing backend tests pass after security changes.
- A deliberately failing backend, dashboard, or Flutter test prevents APK generation.
- Railway variables are updated and existing administrator access is verified.

## 8. Phase 10: Experience and Asset Finishing

> Scope amendment (2026-08-15): facial animation is excluded by product decision. Final 2D stickers are deferred as finishing assets; keyed nonblank fallbacks are accepted for Phase 10 closure. See `PHASE10_EXPERIENCE_AND_ASSET_CLOSURE.md`.

### Objective

Finish the visible learner experience without changing the completed conversation architecture.

### 8.1 Facial Animation

Use Olivia as the pilot before modifying the other three avatars.

Required minimum facial behavior:

- Natural blink included in `Idle` and `Talking` clips.
- Simple mouth-open movement included in `Talking`.
- Subtle neutral smile where appropriate.
- No facial mesh tearing, texture distortion, exposed eye geometry, or detached skinning.

Preferred asset structure:

- Morph targets: `Blink`, `MouthOpen`, and `Smile`, or an equivalent facial-bone implementation.
- Facial animation baked into the existing `Idle` and `Talking` clips so the current O3D integration remains stable.
- Optional `Greeting` clip where the source avatar supports it.
- Exact animation names preserved: `Idle`, `Talking`, and optional `Greeting`.
- GLB retains texture, skeleton, scale, and orientation.
- Target GLB size remains below 10 MB per avatar unless a documented quality review approves otherwise.

Rollout order:

1. Olivia pilot and in-app validation.
2. Sarah.
3. Dr Emma.
4. Michael/HR.

Full phoneme lip-sync is not required for research completion.

### 8.2 Setting Stickers

Create one final illustration for each setting:

- `sticker_lecturer_office`
- `sticker_after_class`
- `sticker_london_restaurant`
- `sticker_melbourne_cafe`
- `sticker_interview_room`
- `sticker_career_fair`

Asset requirements:

- Consistent illustration style and perspective.
- No embedded student or fictional learner name.
- No copyrighted logo or unlicensed brand mark.
- PNG or WebP with transparent background where appropriate.
- Recommended master size: 1024 x 1024 pixels.
- Legible at mobile card size without depending on small text.
- Optimized file size and included through stable `sticker_asset_key` mapping.

### 8.3 Mobile Visual Finishing

- Verify avatar scale, vertical position, and camera framing on the target phone.
- Keep controls, silent coaching, status, subtitle, and avatar from overlapping.
- Use the current Home visual language on AR and Practice Result screens.
- Preserve visible listening, thinking, speaking, error, and retry states.
- Ensure subtitles appear when audio begins, not while neural audio is still being prepared.
- Confirm all six guided openings are context-specific.

### 8.4 APK Size Optimization

Use low-risk optimization only:

- Produce an ARM64 APK with `flutter build apk --split-per-abi` for direct device testing.
- Remove prototype male/female GLBs only after registry and missing-asset fallback tests prove they are no longer required.
- Evaluate 1K texture variants visually before replacing 2K textures.
- Keep avatar assets bundled for research reliability and offline predictability.
- Defer AAB generation until store distribution is in scope.

### 8.5 Latency Measurement and SSE Decision Gate

Record these timestamps for representative turns:

- Student speech final result.
- Chat request started.
- AI text received or first streamed token available.
- TTS request completed.
- Audio playback started.

Experience targets:

- A visible thinking state appears within 200 ms after speech finalization.
- The interface never appears frozen while waiting for AI or TTS.
- Cached guided opening audio normally begins within 1.5 seconds of entering AR.
- Conversational audio begins within a target median of 2.5 seconds and target 95th percentile of 5 seconds on the approved test network.

Decision rule:

- If targets are met, keep the stable JSON chat endpoint.
- If AI text is the main bottleneck, prototype text streaming while preserving the existing endpoint as fallback.
- If TTS is the main bottleneck, evaluate sentence-buffered TTS and an ordered audio queue.
- Do not stream individual tokens directly to TTS.
- Subtitle timing must continue matching actual speech, even if text is received earlier.

### 8.6 Phase 10 Acceptance Criteria

- All four avatars pass visual review in `Idle` and `Talking`.
- Olivia pilot proves facial animation survives GLB export and Android playback before the remaining avatars are changed.
- Six approved stickers map to the correct settings.
- All six guided settings show the correct avatar, setting, opening, and briefing.
- APK size and latency measurements are recorded rather than estimated.
- No Phase 0-8 regression is introduced.

## 9. Phase 11: Device Pilot and Client Acceptance

### Objective

Validate the entire product in realistic student and lecturer conditions.

### 9.1 Test Matrix

Test at minimum:

- The primary client Android phone.
- One additional Android phone with a different screen size or Android version.
- Approved Wi-Fi network.
- Mobile data or a deliberately slower connection.
- Fresh installation and update installation.

### 9.2 Student Flow Validation

- Registration, consent, lecturer code, login, logout, and session persistence.
- All three guided topics and all six settings.
- All ten legacy scenarios.
- Learning Module QR scan, invalid token, inactive token, and retry.
- Camera and microphone permission denial followed by recovery.
- Speech recognition for short, normal, and unclear utterances.
- AI identity, role, and location consistency.
- Minimum, target, and maximum student response rules.
- Natural closing and manual ending.
- Silent coaching behavior.
- Result, transcript, score, duration, and history persistence.

### 9.3 Lecturer and Admin Validation

- Lecturer sees only linked students.
- Session metadata includes scenario/topic/setting/source and module attribution.
- Filters, session details, and permitted export match stored records.
- Admin Topic, Setting, Scenario, Lecturer, and Module workflows work without direct database changes.
- Archived content remains readable in historical sessions.

### 9.4 Failure Validation

- OpenAI timeout returns an in-character fallback.
- TTS failure uses the local fallback without crashing.
- Backend or network failure produces visible retry guidance.
- Interrupted sessions do not create duplicate completed records.
- App restart preserves completed history.
- Invalid QR data cannot expose prompts, secrets, or unrestricted content.

### 9.5 Defect Policy

- **Blocker:** crash, data loss, cross-lecturer data exposure, login failure, or inability to start practice. Must be fixed before acceptance.
- **High:** wrong avatar/setting, role drift, missing session result, broken microphone/TTS, or unusable layout. Must be fixed before acceptance.
- **Medium:** visible inconsistency with a viable workaround. Fix before handover when feasible or document client approval.
- **Low:** cosmetic issue that does not affect research tasks. May enter the post-handover backlog.

### 9.6 Phase 11 Acceptance Criteria

- Every required flow has a dated pass/fail record and device information.
- No open Blocker or High defect remains.
- Lecturer ownership and research attribution are verified with real test accounts.
- Client approves content, avatar appearance, coaching, result presentation, and measured latency.
- Real module structure and at least one printed QR page complete an end-to-end session.

## 10. Phase 12: Research Release and Handover

### Objective

Create a reproducible final research release and transfer operational knowledge to the client.

### 10.1 Release Requirements

- Choose a final Android application ID before signing; changing it later requires a separate installation.
- Create a protected Android release keystore outside Git.
- Store signing credentials securely and document the custodian.
- Increment application version and build number.
- Build a signed ARM64 research APK against the production Railway URL.
- Record APK size, SHA-256 checksum, source commit, API URL, build date, and signing certificate fingerprint.
- Tag the accepted source commit in Git.
- Confirm Railway and Vercel deployments correspond to the accepted commit.
- Take a verified database backup before the research pilot begins.

### 10.2 Handover Deliverables

- Signed Android research APK.
- Backend and Dashboard deployment guide.
- Environment-variable inventory without secret values.
- Database backup and rollback guide.
- Administrator bootstrap and password-rotation procedure.
- Student, Lecturer, and Admin usage guide.
- Scenario, Topic, Setting, and Module content-management guide.
- QR generation and printed-module guide.
- Physical-device QA and client acceptance report.
- Known limitations and post-research backlog.
- Test summary and final checksums.

### 10.3 Operational Readiness

- Identify who owns Railway, Vercel, MongoDB, OpenAI billing, domain configuration, and signing credentials.
- Define the support contact during the research period.
- Define backup frequency and incident response for data-access issues.
- Confirm consent wording and research-data retention with the client/research owner.
- Do not expose participant data in logs, public exports, screenshots, or issue reports.

### 10.4 Phase 12 Acceptance Criteria

- The client can install or update the signed APK on approved devices.
- The production services pass health and end-to-end checks.
- The final APK and deployed services reference the accepted source commit.
- Backup and rollback procedures are tested.
- All required documents and credentials have an identified owner.
- Client signs the research release acceptance record.

## 11. Success Metrics

- 100% of six guided settings start with the correct context and avatar.
- 100% of ten legacy scenarios remain available and functional.
- 100% of completed pilot sessions retain student, lecturer, transcript, score, duration, and source attribution.
- Zero cross-lecturer data exposure in acceptance testing.
- Zero open Blocker or High defects at handover.
- No default production credentials or fallback production secret remain.
- CI passes before every accepted Android artifact.
- Target median first-audio latency is at most 2.5 seconds on the approved test network.
- At least one real printed-module QR activity completes end to end.

## 12. Client Inputs Required

- Approval of six sticker concepts and final assets.
- Approval of minimum facial-expression quality.
- Final research module/unit/page hierarchy.
- Lecturer accounts, lecturer codes, and test student identities.
- Consent and data-retention decisions.
- Final Android application name and application ID.
- Custodian for Android signing credentials.
- Representative Android devices and test network.
- Formal acceptance authority and sign-off date.

## 13. Risks and Mitigations

### Facial animation damages generated topology

Mitigation: complete and approve Olivia first; preserve the current working GLB; use simple baked expressions instead of a full facial-rig rewrite.

### Security rotation locks out existing users

Mitigation: schedule rotation, prepare the bootstrap administrator, notify users that JWT rotation requires login again, and verify access immediately.

### Large refactor introduces regression near delivery

Mitigation: defer broad MVC/component restructuring; extract modules incrementally only after research acceptance.

### Neural AI or TTS remains network-dependent

Mitigation: keep visible status, bounded timeout, in-character response fallback, and local TTS fallback; record latency before adopting streaming.

### QR content changes after printing

Mitigation: QR stores an opaque stable token; page mapping remains server-managed and can be deactivated without exposing scenario content.

### Signing key is lost

Mitigation: use protected offline backup and assign a named custodian. Losing the key prevents seamless updates to the same installed application identity.

## 14. Post-Research Backlog

These items begin only after research release acceptance unless a measured issue promotes them:

- Incrementally split backend routes and controllers from `server.js`.
- Split Dashboard pages and feature state from `App.jsx`.
- Add text streaming or sentence-based neural TTS after latency analysis.
- Evaluate remote asset delivery only when character count or APK size materially increases.
- Evaluate App Bundle and Play Store distribution.
- Evaluate iOS compatibility and App Store requirements.
- Evaluate phoneme-level lip-sync or a dedicated facial-animation pipeline.

## 15. Definition of Done

The project is complete for research when:

1. Phase 9 security and CI requirements pass.
2. Final avatars and stickers are approved and integrated.
3. All guided, legacy, QR, session, result, history, and dashboard flows pass physical-device testing.
4. No Blocker or High defect remains.
5. Latency is measured and accepted, or the approved streaming improvement is completed.
6. Production services and the signed APK correspond to one accepted Git commit.
7. Research data access, consent, ownership, backup, and rollback are verified.
8. Documentation and credential ownership are handed over.
9. The client signs the research release acceptance record.
