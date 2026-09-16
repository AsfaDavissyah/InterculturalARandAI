# Batch 2: Audio delivery and playback

## Changes

- Mobile prewarming and playback share the same TTS request manager.
- Concurrent requests with identical text, voice context, and backend reuse one pending request.
- Successful audio URLs are cached in memory for five minutes, up to 32 entries. Failures are not cached.
- Audio preparation starts before media cleanup and background scoring.
- Neural audio preparation retains its eight-second timeout. Player startup has a five-second timeout; device TTS has a sixty-second completion limit.
- A visible notice identifies device-voice fallback; this does not guarantee the same character voice as neural TTS.
- Replay uses the last AI response without submitting a new conversation turn or evaluation.
- Playback preparation blocks microphone/replay races. Opening-audio errors no longer masquerade as scenario-server failures.

## Verification

Focused suite: 20 tests passed, including shared requests, replay cache reuse, retry after failure, context isolation, invalid URLs, timeouts, Batch 1 transcript delivery, latency metadata, and existing stabilization tests. Static analysis of changed Dart files passed.

## Device acceptance still required

1. Play a guided-topic opening and a Scenario Library opening; verify the expected neural voices.
2. Replay a response twice; confirm no additional turns or objectives are recorded.
3. Interrupt connectivity during audio preparation; check device fallback notice and readable text.
4. Disable device TTS as well; check that an audio error does not close the practice session.
5. Repeatedly tap replay/microphone during preparation; verify no overlapping playback or recordings.
6. Compare first-audio latency over multiple turns on the same phone/network using existing latency records.

No measured production speedup is claimed. This batch does not introduce audio streaming or change AI conversation rules, scoring, backend voice mappings, or model configuration. A new APK is needed to apply mobile changes; no production deployment has been performed.
