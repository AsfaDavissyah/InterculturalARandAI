# Phase 10 - Experience, Assets, and Performance Closure

Status: implementation complete, pending physical-device acceptance

Date: 2026-08-15

## Approved Scope Decisions

1. Facial expressions and facial animation are not part of the current product scope.
2. Existing body-animation avatar files remain the production prototype assets.
3. Final 2D setting stickers are still being produced and do not block Phase 10.
4. Until those files arrive, all six guided settings use a keyed, nonblank visual fallback.
5. Adding final stickers must only require registering asset paths against the existing `sticker_asset_key` values.

## Completed Implementation

- Six setting keys are registered and resolve to stable fallback visuals.
- The guided-setting briefing always displays a setting visual before AR practice.
- AR response timing is captured per completed student turn:
  - speech recognition finalized
  - thinking status visible
  - chat request started
  - AI text received
  - TTS ready
  - audio playback started
- Session history persists raw timing traces and median/P95 first-audio summaries.
- Practice Result displays measured median and P95 response-audio timing.
- Backend history normalization, MongoDB storage, and serialization preserve timing data.
- CI produces split APKs for ARMv7, ARM64, and x86_64 instead of one universal APK.

## Verified Release Build

Local release build completed on 2026-08-15 with the production Railway API URL:

- ARMv7: 46.6 MB
- ARM64: 50.7 MB
- x86_64: 52.7 MB

The target-phone package is `mobile_beta/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`.

## Performance Decision

SSE is intentionally not enabled yet. The current JSON response path remains simpler and more reliable for Flutter TTS. Real-device traces now show whether delay is dominated by OpenAI text generation, neural TTS preparation, or playback startup. Streaming should only be introduced when repeated device sessions exceed either threshold:

- median first audio greater than 2.5 seconds
- P95 first audio greater than 5 seconds

## Device Acceptance Checklist

- Install `app-arm64-v8a-release.apk` on the target phone.
- Run at least three complete sessions across different guided settings.
- Confirm thinking status appears immediately after speech finalization.
- Confirm subtitles appear when audio playback begins.
- Confirm controls, subtitle, coaching banner, and avatar do not overlap.
- Confirm Result shows a nonzero timing sample count.
- Record median and P95 from each test session.

The implementation and automated contract are complete before Phase 11. Physical-device measurements are acceptance evidence, not unfinished application code.
