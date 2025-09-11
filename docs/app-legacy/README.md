# Docs Index (LLM‑Friendly)

This folder contains the minimal, up‑to‑date runbooks you need to ship safely.

## LLM Boot Sequence (Read/Run In Order)

1) codex-briefing.md — Project overview and codebase map (2–4 screens max)
2) app/docs/DEPLOY.md — Staging → Production checklist
3) project_plan.md — Current work, near‑term tasks, next action
4) Sanity endpoints (Preview needs bypass cookie or header):
   - GET /api/health
   - GET /api/dev/status?ts=<now> (use cache‑buster)
5) Quick script:
   - app/scripts/quickcheck.sh -b <base> [-t <token>] [-d <docId>]

## Docs Map

- DEPLOY.md — Deploy checklist (envs, migrations, extractor, protection, QA)
- TROUBLESHOOTING.md — Common errors (Preview protection, extractor 401/404, RAG 0 chunks, env rebuilds)
- This folder (app/docs/) is authoritative. Avoid docs/archive/ and app/docs/archive/ — they are historical only.

## Rules for LLM Sessions

- Conserve tokens: read only codex-briefing.md + project_plan.md + app/docs/*. Skip archives.
- Prefer short checklists and commands over long prose.
- Update project_plan.md after any change (current work / next action).
- Never log or commit secrets; use environment variables.
- When envs change on Vercel, create a new build (don’t reuse).

## Quick Pointers

- Health & Status
  - /api/health, /api/dev/status?ts=<now>, /api/dev/cache-clear
  - Preview protection: /api/dev/bypass (sets cookie) or x‑vercel‑protection‑bypass header
- Extractor
  - PDF_EXTRACT_URL must end with /extract; test with curl (see DEPLOY.md)
- RAG
  - POST /api/rag/ingest { documentId } → indexes chunks
  - If chunks=0 and PDF_DEBUG=true, ingest returns debug with size/maxBytes/extractor info
 - Profile
   - Page: /profile — edit demographics, diet, behaviors (stored in user_graph.profile)
   - Chat auto‑extracts profile facts from user messages (json_schema) and updates user_graph.profile; shows a “Saved to profile … [Undo]” notice
