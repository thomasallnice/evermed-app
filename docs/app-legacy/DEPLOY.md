# Deploy Checklist — Staging → Production

This is a compact, copy‑and‑pasteable checklist to deploy safely.

## 0) Branches & Domains

- Preview (staging) domain: `staging.evermed.ai`
  - Vercel → Project → Settings → Domains → staging.evermed.ai
  - Connect to environment: Preview
  - Branch: `staging` (or “Latest Preview Deployment” if available)
- Production domain: `app.evermed.ai`
  - Connect to environment: Production (typically branch `main`)

## 1) Environment Variables

Set these in Vercel → Project → Settings → Environment Variables.

Preview (staging)
- `NEXT_PUBLIC_APP_URL=https://staging.evermed.ai`
- `NEXT_PUBLIC_ENVIRONMENT=staging`
- `NEXT_PUBLIC_SUPABASE_URL=<staging supabase url>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<staging service role>`
- `OPENAI_API_KEY=<key>`
- `OPENAI_ORG_ID` / `OPENAI_PROJECT_ID` (optional)
- `OPENAI_MODEL_SUMMARY=gpt-4o-mini`
- `OPENAI_MODEL_EMBED=text-embedding-3-small`
- `OPENAI_STREAM=true`
- `PDF_EXTRACT_URL=https://pdf-extractor-stg-…run.app/extract` (must end with `/extract`)
- `PDF_EXTRACT_BEARER=<staging token>` (no quotes)
- `PDF_EXTRACT_TIMEOUT_MS=20000`
- `PDF_MAX_BYTES=50000000`
- `VERCEL_BYPASS_TOKEN=<preview bypass token>`

Production
- Same keys pointed to production services:
  - `NEXT_PUBLIC_APP_URL=https://app.evermed.ai`
  - `NEXT_PUBLIC_ENVIRONMENT=production`
  - Supabase prod URL/keys, OpenAI, extractor `-prod` URL and token, etc.

Notes
- Never put server secrets in `NEXT_PUBLIC_*`.
- Env changes require a new deployment per environment.

## 2) Database & Storage

- Apply migrations 001–010 to the target project.
  - Also apply 011 (usage counters) and 012 (user profile jsonb) if present.
  - 013 (user metrics) adds time‑series vitals; optional but recommended if you want trends in chat.
  - Caution: `001_mvp.sql` drops/creates app tables. Only run on fresh environments.
- Ensure Storage bucket `documents` exists (private) with RLS policies from migration `004*`.

CLI (staging example)
```bash
# Install CLI via Homebrew
brew install supabase/tap/supabase

cd app
supabase login
supabase link --project-ref <staging-ref>
supabase db push
```

## 3) Extractor sanity (Cloud Run)

- Staging service URL must end with `/extract`.
- Bearer must match exactly between Cloud Run (`EXTRACT_BEARER`) and Vercel (`PDF_EXTRACT_BEARER`).
- OCR build deployed (ocrmypdf + tesseract) for scanned PDFs.

Direct curl test
```bash
export TOKEN='<EXTRACT_BEARER>'
curl -i \
  -H 'Content-Type: application/pdf' \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary @/path/to/sample.pdf \
  'https://pdf-extractor-stg-…run.app/extract'
```
Expect `200` + text (JSON or plain text). `401` means token mismatch.

## 4) Preview Protection Bypass

- Get token: Vercel → Project → Settings → Deployment Protection → Bypass Tokens.
- Cookie method (browser, one‑time):
  - `https://staging.evermed.ai/api/health?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=<TOKEN>`
- Header method (CLI):
```bash
curl -H "x-vercel-protection-bypass: $VERCEL_BYPASS_TOKEN" https://staging.evermed.ai/api/health
```
- Convenience routes (Preview only):
  - `/api/dev/bypass?to=/api/health` — sets the cookie using `VERCEL_BYPASS_TOKEN`.
  - `/api/dev/cache-clear` — redirects to `/api/dev/status?ts=<now>` to bypass cache.

## 5) Build & Env Refresh

- Push to the branch the domain is mapped to (staging → Preview, main → Production).
- In Vercel, create a **new build** (avoid “reusing previous build”) after env changes.
- Verify envs at runtime (cache-bust):
```bash
curl -sS "https://staging.evermed.ai/api/dev/status?ts=$(date +%s)" | jq .
# Expect deployment.vercelEnv=preview, extractor.max_bytes_raw="50000000"
```

## 6) QA Flow (staging)

- Login → Upload → Explain → Rebuild RAG → Chat → Attach doc → click citation → `/doc/:id#c{index}` shows snippet.
- Mobile UI: footer input expands; ⋯ reveals provider/streaming.

## 7) Promote to Production

- Merge `staging` → `main` (or use Vercel “Promote to Production”).
- Confirm Production env variables and Supabase migrations applied.
- Smoke test core flows on `app.evermed.ai`.

## 8) Post‑launch

- Remove `PDF_DEBUG` from Preview.
- Rotate extractor bearer tokens.
- Re‑enable Preview Protection; keep bypass token out of logs.

## 9) Troubleshooting

- 404 on /api/* in Preview: set bypass cookie or header.
- `/api/dev/status` shows old values: deploy a **new** Preview build, then cache-bust with `?ts=`.
- Explain 422 (scanned PDFs): ensure extractor URL ends with `/extract`, bearer matches, OCR build deployed, and `PDF_MAX_BYTES` is sufficient.
- “Invalid array length” on RAG: check migrations 002 + 003 and `OPENAI_MODEL_EMBED` dimension (1536).

---

This checklist mirrors the “Deploy Checklist” section in `codex-briefing.md` and adds commands you can paste directly.
