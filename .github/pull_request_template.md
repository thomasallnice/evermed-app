## Summary

- What’s changed and why

## Migration Notes

- Data/schema changes: N/A for PR #1
- Files moved/deleted: see `docs/refit/PR1_FILE_MOVES.md`
- Environment: no new secrets; `.env.local` remains local-only and gitignored

## Security Implications

- No PHI added to logs
- Lint/format/typecheck enforced in CI

## Rollback Steps

- Revert the merge commit
- Restore `backup/pre-refit` branch if needed

## Screenshots / Artifacts

- N/A (skeleton refit)

