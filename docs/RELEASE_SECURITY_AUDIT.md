# Engora Release Security Audit

Run from `backend`:

```powershell
npm run audit:release
```

The automated audit fails on tracked secret files, signing/private-key material, likely embedded OpenAI keys, insecure Android production traffic, or missing required environment contracts.

## Controls Implemented

- Production security validation requires a long JWT secret and explicit CORS origins.
- Production Express trusts one reverse proxy so rate limiting can safely use the Nginx-forwarded client address.
- HTTP logs redact passwords and avoid full conversation/transcript output.
- Android production traffic rejects cleartext HTTP; debug and profile builds may use local HTTP.
- OpenAI API keys stay on the backend. Realtime clients receive short-lived client secrets.
- Deleted production accounts are rejected during authenticated API requests.
- Student account deletion is password-confirmed and transacted with dependent records.
- AI reports are scoped to the student's own saved session and deduplicated per response.
- Public deletion requests require identity verification before administrative action.
- Basic response headers disable MIME sniffing and restrict referrer leakage and browser permissions.

## Client-Dependent Warnings

These warnings remain until client onboarding and are intentional release blockers:

- Android application ID still uses the developer namespace.
- Android release build falls back to debug signing because the client keystore does not exist.
- iOS bundle ID is still `com.example.mobile`.
- iOS dependencies and signing have not been generated and tested on macOS.
- Public legal documents still contain client legal-name, email, retention, and provider placeholders.
- Production service credentials must be rotated after ownership migration.

No store artifact should be submitted while these warnings remain unresolved.
