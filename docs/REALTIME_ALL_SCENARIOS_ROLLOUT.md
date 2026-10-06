# Realtime All-Scenario Rollout

## Coverage

- Every active Guided Topic setting attempts Realtime first.
- Every active Scenario Library item attempts Realtime first.
- Module and QR launches inherit the same behavior.
- Failed connection or recovery uses Android STT and the standard conversation
  engine without discarding confirmed transcript history.

## Voice mapping

- Scenario Library: `alloy`.
- Female Guided Topic characters: `marin`.
- Male Guided Topic characters: `cedar`.

Realtime does not currently support the TTS-only `nova` and `fable` voices.
Character identity, tone, pace, and role remain part of the session
instructions.

## Production configuration

```dotenv
OPENAI_REALTIME_ENABLED=true
OPENAI_REALTIME_SCOPE=all
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_REALTIME_MAX_OUTPUT_TOKENS=320
```

`OPENAI_REALTIME_PILOT_SETTING_IDS` is no longer required in `all` mode. To
roll back without a code deployment:

```dotenv
OPENAI_REALTIME_SCOPE=allowlist
OPENAI_REALTIME_SCENARIO_IDS=ACADEMIC-LECTURER-OFFICE
```

Restart PM2 with `--update-env` after changing these values.

## Acceptance matrix

Test one full session for each row before Play Store release.

| Experience | Required sample | Expected voice |
| --- | --- | --- |
| Academic Guided Topic | Lecturer office or after class | `marin` |
| Social Guided Topic | Restaurant or cafe | `marin` |
| Professional Guided Topic | Interview room or career fair | `cedar` |
| Scenario Library | Any published scenario | `alloy` |
| Module/QR | Any active linked setting | Character mapping above |

For every sample verify complete learner transcripts, one response per turn,
objective progress, assessment evidence, duration, latency, end reason,
reconnect behavior, fallback behavior, and stored Realtime usage.
