## PR #5 — Admin Dashboard (metrics & analytics)

### Endpoints
- GET /api/admin/metrics — returns tiles for last 7 and 30 days (Activation, Clarity, Preparation, Retention, Trust, Safety, Latency p95, Usage, Tokens/Costs).
- GET /api/admin/usage/tokens — token usage grouped by feature/model; cost sums.

### Data source
- `AnalyticsEvent` for named, PHI-free events: first_upload_done, explain_viewed, explain_helpful, share_pack_created, share_pack_recipient_feedback, profile_suggestion_shown/accepted, unsafe_report, latency_ms, answer_generated.
- `TokenUsage` for tokens in/out and cost per feature/model.

### Access control
- Read-only Admin endpoints. Placeholder header `x-admin: 1` for local/dev. TODO: wire Supabase roles.

### UI
- `/admin` page renders tiles grid and tokens table. No PHI displayed.

