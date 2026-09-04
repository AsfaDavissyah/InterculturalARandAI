# Learning Module QR Contract

## Runtime Flow

1. An administrator creates a module, unit, and page in the dashboard.
2. Each page references one active guided speaking `setting_id`.
3. The dashboard requests a launch token and receives a downloadable QR image.
4. The QR contains `engora://launch?token=<secret>`.
5. The mobile scanner submits the complete scanned value to `POST /api/launch/resolve`.
6. The resolver validates the token, module, unit, page, setting, topic, active state, and expiry.
7. Mobile opens the existing guided briefing and AR runtime with `launch_source=module_qr`.
8. Session history stores `module_id`, `unit_id`, and `page_id` for Lecturer research views.

## Security

- Launch secrets are generated from 32 cryptographically random bytes.
- MongoDB stores only a SHA-256 hash and an eight-character display prefix.
- The full launch secret is returned only when a QR is generated.
- Tokens expire, can be deactivated, and are invalidated when their parent content is archived.
- Invalid tokens return `404`, expired tokens return `410`, and unavailable linked content returns `409`.

## Public Endpoint

### `POST /api/launch/resolve`

Request:

```json
{
  "token": "engora://launch?token=<secret>"
}
```

Successful responses include normalized `module`, `unit`, `page`, `topic`, `setting`, and launch attribution.

## Admin Endpoints

- `GET /api/admin/modules`
- `POST /api/admin/modules`
- `PUT /api/admin/modules/:module_id`
- `DELETE /api/admin/modules/:module_id`
- `POST /api/admin/modules/:module_id/units`
- `PUT /api/admin/units/:unit_id`
- `POST /api/admin/units/:unit_id/pages`
- `PUT /api/admin/pages/:page_id`
- `POST /api/admin/pages/:page_id/launch-token`
- `GET /api/admin/launch-tokens`
- `PATCH /api/admin/launch-tokens/:id/deactivate`

All admin endpoints require a valid administrator JWT.
