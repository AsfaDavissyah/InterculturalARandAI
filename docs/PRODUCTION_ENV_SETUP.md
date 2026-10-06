# Engora Production Environment Setup

Replace every uppercase placeholder before deployment. Never commit the resulting `.env` files.

## Backend on the VPS

Copy `backend/.env.example` to `/opt/engora/app/backend/.env`, then insert values owned by the client:

- `MONGODB_URI`: MongoDB Atlas connection string for a dedicated Engora database user.
- `JWT_SECRET`: an unpredictable secret with at least 64 characters.
- `OPENAI_API_KEY`: a client-owned OpenAI project key with billing and limits configured.
- `CORS_ORIGIN`: the final dashboard custom domain and, while needed, its Vercel production URL.
- `ADMIN_BOOTSTRAP_*`: use only during controlled initial admin creation. Disable bootstrap immediately afterward.

`OPENAI_REALTIME_FORCE_VOICE` must stay empty unless one voice must intentionally override every character. With an empty value, Engora uses its scenario and character voice map.

Restart after changing the VPS environment:

```bash
cd /opt/engora/app/backend
npm ci --omit=dev
pm2 restart engora-api --update-env
pm2 save
```

## Dashboard on Vercel

Add this variable to Production and Preview as appropriate:

```env
VITE_API_BASE_URL=https://api.CLIENT_DOMAIN
```

Do not add `OPENAI_API_KEY`, `JWT_SECRET`, or `MONGODB_URI` to the dashboard project. Vite variables are compiled into browser assets and are not secret.

After saving the variable, redeploy the dashboard. Add the final Vercel/custom-domain origin to backend `CORS_ORIGIN` and restart the backend.

## Flutter Android and iOS

Flutter reads the backend URL at build time rather than from a runtime `.env` file:

```powershell
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.CLIENT_DOMAIN --dart-define=APP_BUILD_LABEL=1.0.5+15
```

For iOS, use the same definitions from macOS:

```bash
flutter build ipa --release --dart-define=API_BASE_URL=https://api.CLIENT_DOMAIN --dart-define=APP_BUILD_LABEL=1.0.5+15
```

No OpenAI or MongoDB secret may be included in a mobile build. The mobile client requests a short-lived Realtime session secret from the backend.

## Connection Order

1. Create the MongoDB Atlas database user and obtain `MONGODB_URI`.
2. Create the client OpenAI project key and configure billing limits.
3. Configure the VPS backend `.env`, restart PM2, and verify `https://api.CLIENT_DOMAIN/api/topics`.
4. Configure `VITE_API_BASE_URL` in Vercel and deploy the dashboard.
5. Finalize backend `CORS_ORIGIN` using the deployed dashboard URLs.
6. Build Android and iOS with the final `API_BASE_URL`.
