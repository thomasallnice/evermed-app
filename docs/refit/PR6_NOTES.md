## PR #6 — Appointment Pack (hero flow)

### Endpoints
- POST /api/share-packs — create a pack `{ personId, title, audience, items[], expiryDays, passcode }`.
- GET /api/share-packs/:id — public viewer (requires verify cookie); returns only selected items with signed URLs (documents) and observation summaries.
- POST /api/share-packs/:id/verify — `{ passcode }` → sets session cookie (scoped to pack).
- POST /api/share-packs/:id/revoke — owner-only (x-user-id stub) → revokes.
- GET /api/share-packs/:id/logs — owner-only → view events (no PHI).
- GET /api/documents/:id — owner-only signed URL (10 min TTL) so browser uploads page can access private storage.

### Persistence
- `items[]` in the create request persists to `SharePackItem` via nested `create`. Both shorthand string IDs and object forms are supported: `['<documentId>', { observationId: '<obsId>' }]`.

### Viewer details
- The viewer API includes linked `documents[]` and `observations[]` from the pack items. It requires a verify cookie, denies revoked/expired packs, and logs views (anonymized IP hash).

### Security
- Passcode hashed with project pepper (scrypt placeholder; TODO: Argon2id) and stored as `passcodeHash`.
- Packs default to 7-day expiry; revoke sets `revokedAt` to immediately disable access.
- Viewer requires verify cookie per pack; logs record anonymized IP hash.
- Upload API uses the Supabase service-role key in dev/test to bypass RLS until auth is wired.
- Dev/test: OCR worker import is stubbed, so uploads complete without OCR. TODO to reintegrate in PR #3+.

### Public viewer
- /share/[token] prompts for passcode; after verify, fetches pack and renders only selected items.
