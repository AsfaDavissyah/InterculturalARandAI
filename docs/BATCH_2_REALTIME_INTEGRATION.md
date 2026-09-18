# Batch 2 - Realtime AR Integration

Batch 2 promotes the verified Lecturer's Office Realtime connection from a
diagnostic screen into Engora's primary AR conversation experience.

## Runtime behavior

- `ACADEMIC-LECTURER-OFFICE` connects to OpenAI Realtime while the AR scene is
  prepared.
- The main microphone button controls the WebRTC audio track directly.
- Server VAD closes the learner turn and creates the agent response.
- Agent audio and transcript stream into the normal avatar and subtitle state.
- Completed learner and agent transcripts are added once to Engora's session
  history using their Realtime item IDs.
- Turn evaluation runs in the background and does not delay agent audio.
- The mandatory transcript correction sheet is not part of the live path.

## Reliability boundary

If WebRTC setup, the data channel, or the live microphone fails, Engora disposes
the live connection and keeps the existing Android STT, HTTP response, and TTS
pipeline available as a fallback. Other scenarios remain on the standard path
until Realtime rollout acceptance is complete.

## Acceptance checks

1. Open Lecturer's Office Consultation and remain on the normal AR screen.
2. Confirm the status includes `Live`; no pilot menu or second screen is needed.
3. Tap the primary microphone, speak once, and pause.
4. Confirm there is no correction modal and streamed agent audio starts promptly.
5. Open `View transcript` and confirm each learner and agent turn appears once.
6. Ask `Could you repeat that?` and confirm the previous reply is repeated.
7. Disable connectivity before entering the scenario and confirm standard fallback
   remains usable.
