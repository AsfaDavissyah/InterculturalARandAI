# Phase 8 QA and Client Acceptance

**Project:** Intercultural AR and AI Speaking Practice  
**Technical QA date:** 2026-08-10  
**Engineering status:** Complete  
**External validation:** Physical-device and client acceptance pending

## 1. Completed Automated Verification

- Backend test suite: 53/53 passed.
- Dashboard test suite: 11/11 passed.
- Flutter test suite: 18/18 passed.
- Flutter static analysis: no issues found.
- Dashboard production build: passed.
- Dashboard lint: passed with six non-blocking Fast Refresh warnings in shared UI files.
- Backend dependency audit: zero known vulnerabilities after updating transitive dependencies.
- Android debug APK: built successfully.
- Android release-candidate APK: built successfully.
- Guided runtime coverage includes all three topics and all six settings.
- Regression coverage includes all ten legacy scenarios.
- Module QR coverage includes valid, invalid, inactive, and attributed launch data.

## 2. Android Artifacts

- Debug APK: `mobile_beta/build/app/outputs/flutter-apk/app-debug.apk`
- Release-candidate APK: `mobile_beta/build/app/outputs/flutter-apk/app-release.apk`

Build fingerprints:

- Debug: 204,804,871 bytes; SHA-256 `FADE9033E4897BE6825707EE7FFA83539FBC2591A9108E2456C4B85A4F6DEE11`
- Release candidate: 96,157,120 bytes; SHA-256 `A7F4B56BF863C005D7111FCAB7228F46FAA0BA652BD4C2C571D8775B5A47A028`

The release-candidate currently uses the Android debug signing key. It is appropriate for internal testing but must be rebuilt with a protected production keystore before public distribution.

## 3. Physical Android Acceptance Checklist

Run these checks on the target student phone against the deployed backend.

### Installation and Authentication

- [ ] A fresh install opens without a red Flutter error screen.
- [ ] Registration, login, logout, and lecturer-code assignment work.
- [ ] Reopening the app preserves the expected authenticated state and practice history.

### Guided Topics and Avatars

- [ ] Academic Lecturer Office opens Dr Emma.
- [ ] Academic After Class opens Dr Emma.
- [ ] Social London Restaurant opens Sarah.
- [ ] Social Melbourne Cafe opens Olivia.
- [ ] Professional Interview Room opens Michael/HR.
- [ ] Professional Career Fair opens Michael/HR.
- [ ] Each avatar is framed correctly and changes between Idle and Talking.
- [ ] No avatar remains in a bind pose or separates from its mesh during animation.

### Legacy Regression

- [ ] All ten legacy scenarios remain selectable.
- [ ] A legacy scenario starts, continues, closes, and saves a result.
- [ ] The AI does not move to another scenario, role, or location.

### Camera, Speech, and Conversation

- [ ] Rear-camera permission and preview work on first launch and relaunch.
- [ ] Camera framing is not excessively zoomed or distorted.
- [ ] Microphone permission and speech recognition start reliably.
- [ ] The listening, thinking, and speaking states are visible and accurate.
- [ ] Subtitle appears when AI speech starts and does not remain stale.
- [ ] TTS starts promptly after the AI text is received.
- [ ] Short student answers receive natural continuation.
- [ ] Silent coaching appears only when useful and is never spoken by the avatar.
- [ ] Natural closing occurs after objectives and minimum response count are satisfied.
- [ ] Manual session ending remains available.

### Error and Network Handling

- [ ] OpenAI timeout produces a quick in-character fallback.
- [ ] Temporary backend failure produces a visible retryable error.
- [ ] Wi-Fi loss during a turn does not corrupt the saved session.
- [ ] Invalid and inactive QR codes show clear user-facing messages.
- [ ] The app recovers after connectivity returns.

### Research Records

- [ ] Result page shows score, transcript, duration, and coaching details.
- [ ] History persists after the application is closed.
- [ ] Lecturer Dashboard receives the student, topic, setting, source, and session details.
- [ ] A QR-launched session retains module, unit, and page attribution.
- [ ] Lecturer ownership boundaries remain enforced.

## 4. Client Acceptance

- [ ] Client approves the guided topic and briefing wording.
- [ ] Client approves avatar appearance, scale, and animation quality.
- [ ] Client approves live coaching frequency and result-page explanations.
- [ ] Client approves response latency on the target network.
- [ ] Client approves the final 2D setting stickers when those finishing assets are supplied.
- [ ] Client signs off the printed-module QR flow using the real module structure.

## 5. Deferred Finishing Inputs

The following items do not block the implemented Phase 5-8 runtime but are required before visual/content lock:

- Final 2D sticker illustrations for all six settings.
- Real printed-module hierarchy and page mappings.
- Production Android application ID, keystore, versioning, and secure signing credentials.
- Final client acceptance on a representative Android device and network.
