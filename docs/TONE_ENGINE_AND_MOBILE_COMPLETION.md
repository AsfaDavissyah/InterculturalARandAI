# Tone Engine and Mobile Completion

## Scope Decision

- Tone Engine is the current implementation priority.
- Railway will be activated for the client trial period rather than during idle development time.
- Koyeb remains pending and is not a release dependency yet.
- Sticker artwork and broader visual polish remain in progress and are not changed in this work.
- Dashboard UX, especially Scenario Builder, will be redesigned in a separate discussion.
- Facial animation remains excluded by product decision.

## Tone Engine V1

Tone Engine V1 uses `gpt-4o-mini-tts` through the existing `/api/tts` contract. Mobile continues to send `text`, `gender`, and `ai_role`, so no deployed mobile compatibility break is introduced.

The backend now provides:

- Stable persona profiles for Dr Emma, Sarah, Olivia, Michael, and David.
- A generic intercultural partner profile for legacy roles.
- Deterministic intent detection for greeting, question, encouragement, supportive correction, reassurance, closing, and ordinary conversation.
- Character and intent-specific prosody instructions without an additional AI request.
- Per-character speech speed.
- A cache key containing model, voice, speed, instructions, and text so older flat audio is not reused.
- A safe `tts-1`/`tts-1-hd` override that omits unsupported instructions.

Configuration:

```env
OPENAI_TTS_MODEL=gpt-4o-mini-tts
```

## Mobile Pages Required for Completion

1. Login
2. Registration and research consent
3. Home shell and profile
4. Practice source selection
5. Guided topic selection
6. Guided setting selection
7. Setting briefing
8. Legacy scenario selection and detail
9. Learning-module QR scanner
10. AR speaking practice
11. Practice result
12. Practice history
13. Practice history detail
14. Pilot test context
15. Shared loading, empty, permission, offline, retry, and fatal-error states

## Mobile Completion Backlog

### Required Before Client Trial

- Keep AI subtitles visible as soon as response text arrives while neural audio is prepared.
- Validate expressive TTS and local TTS fallback on physical Android devices.
- Measure first-audio latency on Wi-Fi and mobile data.
- Verify microphone start, speech finalization, duplicate-turn protection, and TTS echo prevention.
- Verify camera and microphone denial followed by recovery.
- Verify all six guided settings, ten legacy scenarios, and printed QR launch.
- Complete responsive and overflow review on two Android screen sizes.
- Replace the temporary backend URL when Railway is activated.
- Record client-approved stickers, voice profiles, openings, coaching, and result presentation.

### Required for Final Research Release

- Choose the final application name and Android application ID.
- Create and protect a production signing key.
- Increment application version and build number.
- Build and checksum the final signed ARM64 APK.
- Run fresh-install and update-install acceptance tests.
- Complete device evidence and client sign-off.

### Post-Research or Conditional

- Sentence-based streaming or SSE if measured first-audio latency remains above the accepted target.
- Remote delivery of large visual assets if APK size grows materially.
- Play Store App Bundle and iOS distribution.
- Facial expression, lip-sync, and phoneme-level animation.
