## PR #6 — Appointment Pack (hero flow)

### Endpoints
- POST /api/share-packs — create a pack `{ personId, title, audience, items[], expiryDays, passcode }`.
- GET /api/share-packs/:id — public viewer (requires verify cookie); returns only selected items with signed URLs (documents) and observation summaries.
- POST /api/share-packs/:id/verify — `{ passcode }` → sets session cookie (scoped to pack).
- POST /api/share-packs/:id/revoke — owner-only (x-user-id stub) → revokes.
- GET /api/share-packs/:id/logs — owner-only → view events (no PHI).

### Security
- Passcode hashed with project pepper (scrypt placeholder; TODO: Argon2id) and stored as `passcodeHash`.
- Packs default to 7-day expiry; revoke sets `revokedAt` to immediately disable access.
- Viewer requires verify cookie per pack; logs record anonymized IP hash.

### Public viewer
- /share/[token] prompts for passcode; after verify, fetches pack and renders only selected items.

