# Phase 11 Device and Client Acceptance

## Current Status

Engineering verification is complete when the repository test, lint, build, and online smoke commands pass. Physical-device evidence and client approval must be recorded by a real tester; they are intentionally not marked as passed by automation.

## Engineering Verification Result

- Backend: 63 tests passed.
- Dashboard: 11 tests passed; lint completed with shadcn fast-refresh warnings only; production build passed.
- Mobile: 26 tests passed; `flutter analyze` reported no issues.
- Railway smoke: 3 topics, 6 guided settings, 10 legacy scenarios, and safe invalid-QR rejection passed.
- Open Blocker/High defects in the engineering register: 0.

## Phase 11 APK Artifacts

- Build label: `phase11-2026.08.15`
- ARM64 APK: `mobile_beta/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`
- ARM64 size: 53,181,267 bytes (50.7 MB)
- ARM64 SHA-256: `38CE4359B44D71E48901FD1E27AB0087F6412923E99C24F3BD51DC670D20D1A0`
- ARMv7 APK: `mobile_beta/build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk`
- ARMv7 SHA-256: `738EA73E66DE4A5B6EFA18A39F280C0CF3C8CBA11FA3B677651E7C844E693046`
- x86_64 APK: `mobile_beta/build/app/outputs/flutter-apk/app-x86_64-release.apk`
- x86_64 SHA-256: `C495022E2203AAFD4CF3AA65F287D6E4D164F616A76404A7FDD1D1D8B52BC396`

## Test Preparation

1. In the mobile profile menu, open **Pilot Test Context**.
2. Enter the exact phone model, selected network profile, and install type.
3. Use one dedicated student account linked to the intended lecturer code.
4. Create a short-lived launch token from `PHASE11_PILOT_MODULE_FIXTURE.json`, print the QR, and retain the page as research evidence.
5. After each run, confirm that **Pilot Evidence** appears in the lecturer session detail.

## Device Records

### Device A: Primary Android

- Test date:
- Tester:
- Device/model:
- Android version:
- App build:
- Network profile:
- Install type:
- Result: Pending
- Evidence links/files:

### Device B: Secondary Android

- Test date:
- Tester:
- Device/model:
- Android version:
- App build:
- Network profile:
- Install type:
- Result: Pending
- Evidence links/files:

## Student Acceptance Run

- Registration, consent, lecturer code, login, logout, and login persistence
- Three guided topics and all six settings
- Ten legacy scenarios
- Valid QR, invalid QR, inactive QR, and network retry
- Camera/microphone denial followed by recovery
- Short, normal, and unclear speech input
- AI role, identity, and location remain consistent
- Minimum 5 responses, normal target 6-8, maximum 10
- Natural closing and manual session ending
- Silent coaching shown during practice and retained in results
- Transcript, score, duration, session status, and history persist after restart

## Lecturer and Admin Acceptance Run

- Lecturer sees only linked students
- Session detail shows scenario, topic, setting, source, module, unit, and page
- Pilot Evidence shows device, OS, viewport, network, install type, build, and latency
- Filters, transcript detail, coaching detail, rubric, and CSV export work
- Scenario/topic/setting/module CRUD retains validation and error feedback
- Historical sessions remain readable after content is archived

## Failure and Recovery Run

- OpenAI timeout produces a quick, natural fallback
- TTS failure uses the local fallback path
- Temporary backend/network loss can be retried
- Repeated save does not duplicate a session
- Invalid or expired QR never opens an unrelated setting
- App restart does not erase local practice history

## Release Gate

Phase 11 is accepted only when:

- both device records are dated and marked Pass;
- all checklist items have evidence;
- there are no open Blocker or High defects;
- ownership and attribution are verified with real research accounts;
- one printed QR completes the module-to-session-to-dashboard flow;
- the client signs below.

## Client Sign-Off

- Client name:
- Role:
- Decision: Pending
- Notes:
- Date:
- Signature/approval reference:
