# Batch 4 - Realtime Reliability

## Scope

Realtime remains limited to `ACADEMIC-LECTURER-OFFICE`. All other settings use
the standard conversation engine. Expansion is allowed only after the pilot
passes the physical-device checks below.

## Implemented safeguards

- A dropped WebRTC connection is retried twice with bounded backoff.
- A replacement Realtime session receives up to the latest 12 conversation
  turns before practice continues.
- If recovery fails, Android STT and the standard conversation engine are
  initialized and continue with the transcript already collected.
- Only one `response.create` can be outstanding for a learner turn.
- A Realtime response is cancelled after 15 seconds without completion.
- Starting a new learner turn cancels unfinished model audio and response work.
- `response.done` usage is aggregated per research session and stored as
  `realtime_usage`, including an estimated response cost in USD.
- Research CSV exports include the response count, estimated cost, reconnect
  attempts, and whether the standard-engine fallback was used.
- The estimate excludes input-transcription charges and is research telemetry,
  not a billing invoice.

## Physical-device acceptance

Run each check on the approved Android phone using Wi-Fi and mobile data.

1. **Camera and AR**: open the pilot, rotate once, background and resume the
   app, and verify that the rear-camera preview and avatar recover without a
   blank frame.
2. **Microphone**: record one short and one long utterance with pauses. Each
   press-to-talk cycle must create exactly one complete learner turn.
3. **Speaker**: disconnect all headsets, complete three turns, and verify that
   agent audio uses the phone speaker without echo being added to the learner
   transcript.
4. **Wired or Bluetooth headset**: connect before launching practice, complete
   three turns, and verify microphone input plus agent output. Disconnect it
   during idle state and verify that audio returns to the phone speaker.
5. **Network recovery**: disable connectivity while idle, restore it within ten
   seconds, and verify a reconnect notice followed by a usable microphone.
6. **Fallback**: keep connectivity unavailable through both reconnect attempts.
   Verify `Standard fallback`, Android STT, and the existing conversation engine
   continue without losing the visible transcript.
7. **Timeout**: interrupt or throttle the network after submitting a turn. The
   UI must leave the thinking state after the bounded timeout and recover or
   enter standard fallback without producing a duplicate agent message.
8. **Session evidence**: finish practice and verify duration, learner turns,
   end reason, transcript, latency, `reconnect_attempts`, `fallback_used`, token
   usage, and `estimated_response_cost_usd` in the stored history record.

## Pass criteria

- No crash, frozen microphone, duplicate agent response, or lost confirmed turn.
- Recovery succeeds within two attempts or standard fallback becomes usable.
- One learner submission maps to one agent response.
- Device routing works for speaker and the available wired/Bluetooth headset.
- Stored research evidence matches the observed session.
