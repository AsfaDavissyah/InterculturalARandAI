# Engora Backend on Vercel

## Create the project

1. Open Vercel and import `AsfaDavissyah/InterculturalARandAI`.
2. Set **Root Directory** to `backend`.
3. Set **Framework Preset** to `Express` (or keep the automatically detected
   Express preset).
4. Do not set an Output Directory.
5. Keep the default install command (`npm install`).

Vercel detects `server.js` and deploys its default CommonJS export as one
Express Function. Do not add a custom build command, output directory, rewrite,
or second API wrapper.

## Environment variables

Copy the values from the local `backend/.env` into Vercel. Never upload the
`.env` file or commit its values.

Required:

- `NODE_ENV=production`
- `MONGODB_URI`
- `JWT_SECRET` (at least 32 characters)
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_TTS_MODEL=gpt-4o-mini-tts`
- `USE_OPENAI=true`
- `CORS_ORIGIN`

Recommended:

- `TTS_CACHE_TTL_HOURS=24`
- `ADMIN_BOOTSTRAP_ENABLED=false`
- `FEATURE_MODULES_ENABLED=false`
- `FEATURE_QR_ENABLED=false`

Do not add `PORT`; Vercel manages the function port.

For `CORS_ORIGIN`, use a comma-separated list when both a production dashboard
and a preview dashboard need access. Avoid `*` in production.

## MongoDB Atlas

Vercel uses dynamic outbound IP addresses on the Hobby plan. MongoDB Atlas must
permit the Vercel deployment to connect. For an initial controlled test, add
`0.0.0.0/0` in Atlas Network Access and require a strong database username and
password. Restrict access further when a fixed-egress option is available.

## Verification

After deployment:

1. Open the deployment root URL and confirm that it returns backend status JSON.
2. Test `GET /api/topics` and `GET /api/scenarios`.
3. Sign in to the dashboard and verify admin and lecturer data.
4. Start one mobile practice and verify chat plus TTS playback.
5. Confirm an `audiocaches` collection appears in MongoDB and old records expire.

The TTS endpoint keeps the existing `audio_url` contract. On Vercel, generated
MP3 data is cached temporarily in MongoDB instead of the function filesystem.
