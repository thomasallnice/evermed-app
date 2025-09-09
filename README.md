# EverMed.ai — Developer Readme (LLM‑Friendly)

This is the top‑level readme for humans and LLMs. It points you to the small set of files and checks that keep work moving fast while conserving tokens.

## LLM Boot Sequence (read/run in order)

1) `codex-briefing.md` — canonical overview + codebase map
2) `app/docs/DEPLOY.md` — staging → production deploy checklist
3) `project_plan.md` — current work, near‑term, next action
4) Sanity endpoints (Preview needs bypass cookie/header):
   - `GET /api/health`
   - `GET /api/dev/status?ts=<now>` (cache‑buster)
5) Quick script (optional):
   - `app/scripts/quickcheck.sh -b <base> [-t <token>] [-d <docId>]`

Documentation rules:
- Use `app/docs/*` (current runbooks). Do NOT read `docs/archive/` or `app/docs/archive/` — they are historical and will waste tokens.

## Quick Start (local)

Prereqs:
- Node 18+
- Supabase project (Auth + Storage)
- OpenAI API key

Setup:
1. `cp app/.env.example app/.env.local` and fill values (see `codex-briefing.md`)
2. In Supabase, create bucket `documents` (private) with RLS for user‑owned prefixes
3. Apply migrations (001–010). Note: 001 is destructive; only run on fresh DBs.

Run:
```
cd app
npm install
npm run dev
```
Open http://localhost:3000

Sanity:
```
curl -sS http://localhost:3000/api/health | jq .
curl -sS "http://localhost:3000/api/dev/status?ts=$(date +%s)" | jq .
```

## Deploy (Vercel)

- The repo is built via root `vercel.json` (builds `app/`).
- Set envs per environment (Preview/Production) in Vercel.
- Any env change requires a **new** deployment (don’t reuse a previous build).
- See `app/docs/DEPLOY.md` for exact variables, bypass/curl examples, and a staging → prod checklist.

Helpers (Preview):
- `/api/dev/bypass?to=/api/health` — sets bypass cookie using `VERCEL_BYPASS_TOKEN`
- `/api/dev/cache-clear` — redirects to `/api/dev/status?ts=<now>` to bypass cache

## Codebase Map (surgical pointers)

- Upload UI & flow: `app/src/app/upload/page.tsx` (auto‑Explain + auto‑RAG; image OCR toggle)
- Document view: `app/src/app/doc/[id]/page.tsx`
- Chat UI: `app/src/app/chat/page.tsx` (markdown, inline source pills, citations)
- API routes:
  - Explain: `app/src/app/api/explain/route.ts`
  - Chat (Responses API stream): `app/src/app/api/chat/stream/route.ts`
  - RAG ingest/status: `app/src/app/api/rag/ingest/route.ts`, `.../status/route.ts`
  - OCR (images): `app/src/app/api/ocr/route.ts`
  - Dev helpers: `app/src/app/api/dev/status/route.ts`, `.../bypass/route.ts`, `.../cache-clear/route.ts`
- Migrations: `app/supabase/migrations` (001–010)
- Extractor (Cloud Run): `extractor/pdf-extractor/*` (pdf + image OCR)

## Common Tasks

- Upload a file → auto Explain + auto RAG; redirect to the doc page. For images, toggle OCR in the form.
- Rebuild RAG from the doc page if needed (older uploads).
- Chat: attach docs, get inline source pills; citations `[n]` link to `/doc/:id#c{n}`.

## Troubleshooting

See `app/docs/TROUBLESHOOTING.md` (Preview protection, env rebuilds, extractor 401/404, RAG=0, vector issues).

## Contributing

Open a PR and follow the template (`app/.github/pull_request_template.md`). Ensure docs (`codex-briefing.md`, `project_plan.md`, `app/docs/*`) remain current, and run the health/status/Explain/RAG checks before merging.
