
# **EverMed.ai — Codex Refit Plan (Supabase + Vercel)**

  

**Version:** 1.0 • Sep 10, 2025

**MVP Mode:** Option A — _Preparation Assistant (non-SaMD)_

  

> Goal: Codex updates the **existing project** to our new architecture and deletes anything that no longer fits. Keep Supabase (DB/Auth/Storage), Vercel (web), GitHub (CI/CD), and .env.local.

---

## **0) Guardrails (do not change)**

- **No diagnosis/dosing/triage** or image classification in MVP.
    
- **Security defaults ON:** app lock, TLS, at-rest encryption, passcode-protected share links (7-day expiry, logs, revoke).
    
- **Provenance:** every medical claim shows a source anchor.
    
- **Germany/EU first; FHIR/gematik alignment; no ePA write-back.**
    

---

## **1) Repo Convergence (keep, move, delete)**

  

**Keep/Converge into this structure**

```
/apps/web                 # Next.js (App Router, TS)
/apps/workers             # background jobs (OCR/extraction), Vercel bg funcs or Supabase functions
/packages/ui              # shared UI (Radix+Tailwind)
/packages/types           # shared types (TS)
/packages/config          # eslint/prettier/tsconfig
/db                       # Prisma schema + migrations (Postgres/Supabase)
/docs                     # product + API contracts (this file lives here)
/infra                    # IaC (optional), vercel.json, supabase config
/tests                    # unit + e2e + fixtures (non-PHI)
```

**Delete** everything **not** under these paths unless referenced below. Codex: open a PR titled **“refit: repo convergence + dead code removal”** with a file list of deletions.

---

## **2) Environment & Secrets**

  

**.env.local (web)**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_NAME=EverMed
NEXT_PUBLIC_REGION=eu
```

**.env (server / Vercel project vars)**

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=             # used via server-only routes; PHI-safe usage only
EMBEDDINGS_PROVIDER=openai  # or local
EMBEDDINGS_MODEL=text-embedding-3-large
VECTOR_DIM=1536
SHARE_LINK_PEPPER=          # random base64; used with Argon2id
ENCRYPTION_KEY=             # 32-byte base64 (for at-rest sensitive fields if needed)
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=
```

**Notes**

- Never commit real secrets. Use Vercel Project Env + Supabase secrets.
    
- All storage buckets are **private**; access via **signed URLs** only.
    

---

## **3) Supabase Setup (DB, Storage, Extensions)**

  

**Enable (Supabase Cloud)**

- Ensure project has extensions enabled: pgvector, uuid-ossp, pgcrypto (via Supabase Dashboard → Database → Extensions).
    
- Storage buckets (private): documents, thumbnails (via Storage UI). Upload API stores files under a per-person prefix and all access uses signed URLs from the server.
    

  

**Prisma schema (excerpt) → /db/schema.prisma**

```
model Person {
  id           String   @id @default(uuid())
  ownerId      String   // supabase auth.uid()
  givenName    String?
  familyName   String?
  birthYear    Int?
  sexAtBirth   String?
  locale       String?  @default("de-DE")
  createdAt    DateTime @default(now())

  documents    Document[]
  observations Observation[]
  sharePacks   SharePack[]
}

model Document {
  id           String   @id @default(uuid())
  personId     String
  kind         String   // 'pdf'|'image'|'note'
  topic        String?  // 'labs'|'allergies'|'imaging'|'other'
  filename     String
  storagePath  String   // Supabase Storage path
  sha256       String
  uploadedAt   DateTime @default(now())
  processedAt  DateTime?

  person       Person   @relation(fields: [personId], references: [id])
  chunks       DocChunk[]
}

model Observation {
  id           String   @id @default(uuid())
  personId     String
  code         String   // FHIR code
  display      String
  valueNum     Float?
  unit         String?
  refLow       Float?
  refHigh      Float?
  effectiveAt  DateTime?
  sourceDocId  String
  sourceAnchor String?

  person       Person   @relation(fields: [personId], references: [id])
  sourceDoc    Document @relation(fields: [sourceDocId], references: [id])
}

model SharePack {
  id             String   @id @default(uuid())
  personId       String
  title          String
  audience       String   // 'clinician'|'school'|'urgent'
  passcodeHash   String   // Argon2id(pepper+passcode)
  expiresAt      DateTime
  revokedAt      DateTime?
  viewsCount     Int      @default(0)
  createdAt      DateTime @default(now())

  person         Person   @relation(fields: [personId], references: [id])
  items          SharePackItem[]
  events         ShareEvent[]
}

model SharePackItem {
  id           String   @id @default(uuid())
  packId       String
  documentId   String?
  observationId String?

  pack         SharePack  @relation(fields: [packId], references: [id])
  document     Document?  @relation(fields: [documentId], references: [id])
  observation  Observation? @relation(fields: [observationId], references: [id])
}

model DocChunk {
  id          String   @id @default(uuid())
  documentId  String
  chunkId     Int
  text        String
  embedding   Bytes    // pgvector (store as bytea via Prisma)
  createdAt   DateTime @default(now())

  document    Document @relation(fields: [documentId], references: [id])

  @@unique([documentId, chunkId])
}

model TokenUsage {
  id          String   @id @default(uuid())
  userId      String?
  feature     String   // 'explain'|'ask'|'ocr'|'index'
  model       String
  tokensIn    Int
  tokensOut   Int
  costUsd     Decimal? @db.Decimal(10,5)
  createdAt   DateTime @default(now())
}

model AnalyticsEvent {
  id          String   @id @default(uuid())
  userId      String?  // nullable; NEVER store PHI
  name        String   // 'first_upload_done', ...
  meta        Json?    // non-PHI metadata only
  createdAt   DateTime @default(now())
}
```

**RLS (SQL, apply in Supabase SQL editor) — enforce per-owner**

```
-- Enable RLS
alter table "Person" enable row level security;
alter table "Document" enable row level security;
alter table "Observation" enable row level security;
alter table "SharePack" enable row level security;
alter table "SharePackItem" enable row level security;

-- Person: owner only
create policy person_owner_select on "Person"
for select using (ownerId = auth.uid());
create policy person_owner_mod on "Person"
for all using (ownerId = auth.uid()) with check (ownerId = auth.uid());

-- Document: via person ownership
create policy doc_owner_select on "Document"
for select using (exists (select 1 from "Person" p where p.id = personId and p.ownerId = auth.uid()));
create policy doc_owner_mod on "Document"
for all using (exists (select 1 from "Person" p where p.id = personId and p.ownerId = auth.uid()))
with check (exists (select 1 from "Person" p where p.id = personId and p.ownerId = auth.uid()));

-- Observation & SharePack mirror the pattern
```

**Storage rules**

- Bucket documents is **private**. Access via **signed URL** generated server-side after authorization.
    
- Thumbnails generated into thumbnails with the same access model.
    

---

## **4) API Contract (must exist when PR closes)**

  

**Web (Next.js App Router)**

```
POST   /api/uploads                     -> {documentId}
GET    /api/documents/:id               -> metadata + signedUrl
POST   /api/explain/:documentId         -> ExplainPayload (template)
POST   /api/chat                        -> {answer, citations[], safetyTag}
POST   /api/observations/extract        -> Observation[]
GET    /api/observations                -> timeline by {personId, code}
POST   /api/share-packs                 -> create pack (items[], expiry, passcode)
GET    /api/share-packs/:id             -> public view (after passcode)
POST   /api/share-packs/:id/verify      -> passcode → session cookie (pack scope)
POST   /api/share-packs/:id/revoke      -> owner only

# Admin (auth: admin role)
GET    /api/admin/metrics               -> tiles (see §7)
GET    /api/admin/usage/tokens          -> tokens by feature/model
```

**Webhooks / background**

```
document.processed
observations.extracted
share.viewed
model.token_usage
```

---

## **5) LLM & OCR Integration (pluggable, but ship defaults)**

- **Explain/Ask:** single default model (configured via env). Enforce **citations required**. Refuse banned topics.
    
- **Embeddings:** provider configurable (EMBEDDINGS_PROVIDER), default OpenAI. Index to DocChunk with pgvector.
    
- **OCR:** implement workers/ocr.ts with a provider interface; default to local Tesseract (WASM or container) _or_ stub with a TODO flag. Route via background function to avoid blocking UI.
    

---

## **6) UX: Starter Cards & Appointment Pack**

  

Implement **starter cards** on Home + composer quick actions:

- Explain a lab • Prepare for visit • Allergy pack for school • What changed?
    

  

**Appointment Pack spec (enforced)**

- Modes: cardiology | school | urgent
    
- Defaults: passcode required, 7-day expiry, view logs, one-tap revoke. Passcodes are hashed using scrypt + project pepper; verify sets a session cookie scoped to the pack. Views are logged with anonymized IP hash.
    
- Public view page: shows only included items; never the vault
    

---

## **7) Admin Dashboard (read-only, no PHI)**

  

**Tiles (7/30-day)**

- North Star: % WAU with ≥1 **Appointment Pack**
    
- Activation: % new users with first_upload_done + explain_viewed within 24h
    
- Clarity: % “Explain helpful = Yes” (by doc type/template)
    
- Preparation: % WAU with ≥1 pack; **recipient thumbs-up %**
    
- Retention: D30 (Organizer cohort)
    
- Trust: profile suggestion **accept rate** (target 40–60%)
    
- Safety: P0/P1 incident counts; % answers without citations
    
- Latency: p95 OCR+Explain (3-page PDF)
    
- Usage: uploads/user, pages/doc
    
- Tokens/Costs: by feature (explain/ask/ocr/index), per-user bands
    

  

Data source: AnalyticsEvent, TokenUsage, derived SQL views. Strictly **no PHI** payloads.

---

## **8) Analytics Events (instrument exactly these; nothing free-text)**

- first_upload_done
    
- explain_viewed {template, doc_kind}
    
- share_pack_created {audience, items_count}
    
- share_pack_recipient_feedback {thumbs:'up'|'down'}
    
- profile_suggestion_shown|accepted
    
- unsafe_report
    
- latency_ms {stage:'ocr'|'explain'}  _(numeric only)_
    
- tokens {feature, model, in, out, cost}
    

---

## **9) Tests (CI must pass before merge)**

- **Unit:** API contracts (status codes, auth, RLS happy path via service role), passcode hashing, signed URL TTL.
    
- **E2E (Playwright/Cypress):** Upload → Explain → Pack → Share → Revoke.
    
- **Policy:** banned-topic prompts must **refuse** with our template.
    
- **Citations:** every Explain/Ask answer must include ≥1 source or fail.
    
- **Latency:** seeded 3-page PDF p95 < 10s; fail CI if slower.
    
- **Security:** Share pack without passcode must **fail**.
    

---

## **10) Migration & Cleanup Steps (Codex executes)**

1. **Snapshot** current repo → branch backup/pre-refit.
    
2. **Converge** to structure in §1; delete orphaned code.
    
3. **Introduce Prisma**; generate migrations from schema above; run on Supabase.
    
4. **Enable extensions** + create storage buckets.
    
5. **Implement RLS policies** (SQL) and verify with Supabase policies editor.
    
6. **Move uploads** to Supabase Storage; replace any local/s3 code.
    
7. **Replace embeddings** with pgvector pipeline; backfill existing docs.
    
8. **Implement Explain** template & provenance requirement.
    
9. **Implement Appointment Pack** with passcode/expiry/logs/revoke + public viewer.
    
10. **Instrument events & token logging**; build Admin Dashboard tiles.
    
11. **Remove dead endpoints and components**; update routes to API contract in §4.
    
12. **Write README** runbook; update .env.example; add PR template.
    

  

**Definition of Done**

- All tests pass in CI on GitHub.
    
- Admin dashboard tiles render data from seeded fixtures.
    
- A sample PDF flows through Upload → Explain → Pack → public view → revoke.
    
- No references remain to deleted modules.
    

---

## **11) Copy & Disclaimers (extract into** 

## **/apps/web/lib/copy.ts**

## **)**

- Global disclaimer and red-flag text (DE/EN).
    
- Share UX explanations (passcode, expiry, logs).
    
- Refusal templates for banned topics.
    

---

## **12) Open Questions (leave TODOs, don’t block MVP)**

- OCR provider final choice (local vs vendor with BAA).
    
- Embeddings provider residency constraints (EU-only).
    
- On-device crypto for selective fields (beyond provider at-rest).
    
- Model “Pro tier” router (disabled by default; config-driven).
    

---

**End of plan.**

Codex: start with PR **#1 Refit Skeleton & Policies**, then proceed in order; one PR per step with tests and migration notes.
