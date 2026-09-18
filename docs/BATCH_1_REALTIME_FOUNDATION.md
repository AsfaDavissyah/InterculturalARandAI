# Batch 1 - Realtime Foundation

Batch 1 adds an isolated OpenAI Realtime audio pilot without replacing Engora's
existing conversation engine.

## Pilot scope

- Setting: `ACADEMIC-LECTURER-OFFICE`
- Character: Dr Emma Collins
- Transport: WebRTC audio and data channel
- Access: authenticated student accounts only
- Standard conversation flow: unchanged and retained as fallback

## Backend configuration

Configure these values only in the VPS environment. Never place the OpenAI API
key in Flutter, an APK, or the repository.

```dotenv
OPENAI_REALTIME_ENABLED=true
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_REALTIME_MAX_OUTPUT_TOKENS=160
OPENAI_REALTIME_PILOT_SETTING_IDS=ACADEMIC-LECTURER-OFFICE
```

`POST /api/realtime/session` validates the Engora JWT and pilot setting before
requesting a short-lived client secret from OpenAI. The production API key is
used only by the backend and is never returned to the app.

## Device smoke test

1. Deploy the backend with `OPENAI_REALTIME_ENABLED=true` and restart PM2.
2. Install the current Android debug build and sign in with a student account.
3. Open Guided Topics, Academic Communication, Lecturer's Office Consultation.
4. Open the overflow menu and select `Realtime audio pilot`.
5. Select `Connect` and wait for `Connected` and `Audio channel ready`.
6. Tap the microphone, speak one English sentence, and pause.
7. Confirm that the microphone stops after server VAD detects the turn and that
   Dr Emma's streamed audio is audible.
8. Leave the screen and confirm the microphone indicator turns off.

## Batch boundary

The pilot screen proves session issuance, microphone capture, WebRTC
negotiation, the Realtime data channel, and remote audio playback. Batch 2 will
move the verified connection into the primary AR conversation UI, hide the
mandatory transcript correction step, and connect transcript events to the
normal Engora conversation state.
