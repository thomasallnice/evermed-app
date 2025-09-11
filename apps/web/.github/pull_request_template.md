# Pull Request

## Summary
- What does this change do in one or two sentences?

## Changes
- [ ] Code updates (files/routes/components)
- [ ] Docs updated (see checklist)
- [ ] Operational changes (envs/migrations/deploy)

## Checklist (required)
- [ ] Docs are current:
  - [ ] `codex-briefing.md` (overview still accurate)
  - [ ] `project_plan.md` (current work / next steps updated)
  - [ ] `app/docs/DEPLOY.md` (deploy steps unchanged or updated)
- [ ] Health/Status sanity:
  - [ ] `GET /api/health` returns `ok`
  - [ ] `GET /api/dev/status?ts=<now>` reflects expected env (Preview/Prod), extractor host reachable
  - [ ] If Preview: used bypass cookie or header (`x-vercel-protection-bypass`)
- [ ] Environment changes (if any):
  - [ ] Vercel env updated (Preview/Prod) and a **new build** was created (not a reused build)
  - [ ] Domains still map correctly (Preview → staging.evermed.ai; Prod → app.evermed.ai)
- [ ] Database:
  - [ ] Migrations applied to target environment(s) (avoid running destructive 001 on live DBs)
- [ ] Extractor:
  - [ ] URL ends with `/extract` and bearer matches (curl test done)
- [ ] Functional smoke tests:
  - [ ] Upload → Explain → RAG ingest (chunks > 0)
  - [ ] Chat streaming and citations OK; pills link to `/doc/:id#c{index}`

## Notes
- Preview Protection
  - Cookie (once): `https://<staging-domain>/<path>?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=<TOKEN>`
  - Header (each call): `-H 'x-vercel-protection-bypass: <TOKEN>'`
- Cache bust: `/api/dev/cache-clear` or `?ts=<now>` on `/api/dev/status`
- Quick script: `app/scripts/quickcheck.sh -b <base> [-t <token>] [-d <docId>]`
