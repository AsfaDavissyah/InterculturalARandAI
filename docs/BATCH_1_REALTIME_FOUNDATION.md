# Batch 1 - Realtime Foundation

Batch 1 introduced the isolated OpenAI Realtime audio pilot. After client
acceptance, the same connection now covers every active Guided Topic and
Scenario Library item while retaining the existing engine as fallback.

## Current scope

- Settings: all active Guided Topic settings
- Scenarios: all active Scenario Library items
- Transport: WebRTC audio and data channel
- Access: authenticated student accounts only
- Standard conversation flow: unchanged and retained as fallback

## Backend configuration

Configure these values only in the VPS environment. Never place the OpenAI API
key in Flutter, an APK, or the repository.

```dotenv
OPENAI_REALTIME_ENABLED=true
OPENAI_REALTIME_SCOPE=all
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_REALTIME_MAX_OUTPUT_TOKENS=320
```

`OPENAI_REALTIME_VOICE` is the fallback voice. Scenario Library uses `alloy`,
female Guided Topic partners use `marin`, and male Guided Topic partners use
`cedar`. Set `OPENAI_REALTIME_FORCE_VOICE` only when one supported voice must
override every character.

The `320` token ceiling leaves enough room for a complete short spoken answer.
Lower values can end an audio response in the middle of a sentence.

For emergency rollback, set `OPENAI_REALTIME_SCOPE=allowlist` and provide a
comma-separated `OPENAI_REALTIME_SCENARIO_IDS` value.

`POST /api/realtime/session` validates the Engora JWT and active scenario before
requesting a short-lived client secret from OpenAI. The production API key is
used only by the backend and is never returned to the app.

## Device smoke test

1. Deploy the backend with `OPENAI_REALTIME_ENABLED=true` and restart PM2.
2. Install the current Android debug build and sign in with a student account.
3. Test at least one setting from each Guided Topic category and one Scenario
   Library item.
4. Confirm the status shows `Live`, then complete three microphone turns.
5. Confirm each full learner transcript and each agent response is stored once.
6. Leave the screen and confirm the microphone indicator turns off.

## Batch boundary

The original pilot screen proved session issuance, microphone capture, WebRTC
negotiation, the Realtime data channel, and remote audio playback. The verified
connection now runs in the primary AR conversation UI for all scenarios.
