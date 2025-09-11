# EverMed.ai Web (MVP)

Minimal Next.js app for the EverMed MVP.

## Setup

- Create `.env.local` from `.env.example` with your values:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY` (and optional `OPENAI_MODEL`)
  - Optional: `MEDGEMMA_API_URL` fallback

- In Supabase:
  - Create Storage bucket `documents`
  - Apply RLS: allow authenticated users to read/write under `${auth.uid()}/*`
  - Run migration `app/supabase/migrations/001_mvp.sql` in SQL editor

## Develop

```
cd app
npm install
npm run dev
```

Open http://localhost:3000

## Features

- Document Vault: list documents from `documents` table; select and share
- Upload: upload to Storage `documents` and insert metadata row
- Explain: `/api/explain` (OpenAI) caches into `summaries`
- Chat: `/api/chat` with OpenAI, MedGemma fallback; augments with user context (docs + summaries + graph)
- Share: UI triggers `/api/share` to create a time-limited link; `/share/[token]` shows shared docs

## Deploy (Vercel)

`vercel.json` is configured to build `app` and expose API routes.
