## PR #8 — Share Pack Observations & Trends

### Scope
- Allow Share Pack creation to accept mixed items (`["<documentId>", { "observationId": "..." }]`) and persist them via nested `SharePackItem` rows.
- Share Pack APIs now return both `documents[]` (with signed URLs) and `observations[]` (with metadata + trend snippets).
- Public viewer displays uploaded documents and selected observations with recent trend deltas.
- Restored guard files (`docs/CODEX_START_PROMPT.txt`, `scripts/smoke-e2e.sh`) after accidental deletion and documented them as permanent no-deletes.
- Fixed broken imports in upload route. Corrected alias to @/lib/documents and restored OCR stub instead of invalid worker import.

### How to include observations
- POST `/api/share-packs` with `items` array containing observation IDs: `{ "observationId": "<UUID>" }`.
- Response JSON:
  ```json
  {
    "shareId": "...",
    "documents": [{ "id": "...", "filename": "...", "storagePath": "...", "signedUrl": "..." }],
    "observations": [{
      "id": "...",
      "code": "TSH",
      "display": "Thyroid Stimulating Hormone",
      "valueNum": 2.1,
      "unit": "mIU/L",
      "effectiveAt": "2025-03-01T00:00:00.000Z",
      "refLow": 0.4,
      "refHigh": 4,
      "sourceDocId": "...",
      "trend": { "delta": -0.4, "windowDays": 180, "outOfRange": false }
    }]
  }
  ```
- Signed URLs are generated server-side using the Supabase service role.

### Implementation notes
- Added trend helpers (`lib/trends.ts`) to compute deltas/out-of-range flags reused by Share Packs.
- Viewer aggregates historic observations for each code to show simple trend snippets.
- Public viewer renders an observations table with delta badges and links back to the source document when available.
