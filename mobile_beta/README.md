# AI Speaking Practice Beta

This folder is a beta duplicate of the original `mobile` Flutter app.

The beta direction is an AI speaking practice system for scenario-based
intercultural English learning. Students choose an intercultural scenario,
practice with an AI conversation partner, and receive scores plus feedback.

## Current Beta Scope

- Dynamic scenario library with a local fallback.
- Full-screen rear-camera speaking session with an animated AR avatar overlay.
- English speech-to-text input and text input fallback.
- Spoken AI responses with listening, thinking, and speaking avatar states.
- Optional subtitles and an in-session transcript.
- Scenario-aware post-session scoring, feedback, and conversation history.
- Android app identity separated from the original app.
- Configurable backend address for Android Emulator and physical phones.

## Future Development Scope

- Add login and student session storage.
- Replace the animated prototype avatar with a production 3D avatar asset.
- Add lip-sync blend shapes to the production avatar.
- Add lecturer dashboard for student progress and transcripts.

## Run

Start the backend first, then run this Flutter app from this folder:

```bash
flutter pub get
flutter run
```

The default backend is the online Engora VPS:

```text
https://api.202-10-37-3.sslip.io
```

For local development, override the endpoint at build time. The application
does not expose server configuration to students:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.8:3000
```

The same value can be supplied when starting Flutter:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.8:3000
```
