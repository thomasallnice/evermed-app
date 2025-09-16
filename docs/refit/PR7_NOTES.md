## PR #7 — Trend Views (labs & timelines)

### Supported codes
- CBC: WBC (`6690-2`), Hemoglobin (`718-7`), Platelets (`777-3`), Hematocrit (`4544-3`).
- CMP/Electrolytes: Glucose (`2345-7`), Sodium (`6299-2`), Potassium (`2823-3`), Chloride (`2075-0`), CO2/Bicarbonate (`2028-9`), BUN (`3094-0`).
- Renal: Creatinine (`2160-0`), eGFR (`33914-3`).
- Endocrine: TSH (`4548-4`), Free T4 (`4549-2`), HbA1c (`1558-6`).
- Lipids: HDL (`2085-9`), LDL (`2089-1`), Triglycerides (`2571-8`).
- Coagulation: INR (`6301-6`).
- Inflammation & liver: CRP (`1988-5`), ALT (`1742-6`), AST (`1920-8`).

### Calculations
- Default window is 12 months; `windowMonths` accepts 3, 6, 12, 24. Values outside the set fall back to 12.
- Series are filtered by `effectiveAt >= now - windowMonths` with chronological ordering.
- Latest snapshot: last value in window (per code) with unit + date.
- Delta: `(latest - earliest).toFixed(2)` with provenance date for earliest point; omitted when only one reading.
- Slope: least-squares slope of value/day across the window (`slope` per day, `windowDays` = span between first and last values).
- Out-of-range flag: `latest < refLow` or `latest > refHigh` when reference bounds exist.

### UI decisions
- `/trends` is a client component, gated by Supabase auth (`getSupabase().auth.getUser()`).
- Filter chips cover the codes above; selector ensures at least one code remains active.
- Time-range buttons update the API query and re-render cards.
- Cards include sparkline, reference band shading, delta badge, and out-of-range pill. Keyboard activation uses `Enter`/`Space` on the card (`role="button"`, `aria-pressed`).
- Details panel opens as a modal (`role="dialog"`, closable via button); renders table with provenance and “Open document” buttons that fetch `/api/documents/:id` for signed URLs.
- Copy: disclaimer at top emphasises informational-only trend review (“talk with your clinician”).

### Accessibility
- All interactive elements reachable via keyboard (buttons for chips, timeline modal). Sparkline marks `aria-hidden` to avoid duplicate announcements.
- Details modal traps focus visually via overlay; close button accessible.
- Out-of-range indicator uses both color and text (“Out of range”).

### Implementation Notes
- OCR worker integration is stubbed in uploads. Dynamic import was removed to prevent Next.js 500s in dev/test. The stub logs a warning and skips OCR until PR #3 reintroduces proper extraction.
- Fixed upload route import alias to '@/lib/documents'. Regression test added to ensure this alias remains correct. '@/src/lib/...' must not be used.
- Hardened /api/documents/:id to always return JSON errors instead of HTML. Updated smoke-e2e.sh to handle non-JSON responses gracefully, preventing jq parse errors.
- Updated scripts/smoke-e2e.sh to use sed/tail instead of head -n -1 so it runs on macOS and Linux. Document fetch block now surfaces non-JSON responses clearly and exits on HTTP errors without crashing jq.

### Optional backfill
- Invoke `POST /api/rag/ingest` with `{ "documentId": "…", "extractObservations": true }` and `x-user-id`/service-role headers to run the heuristic observation parser.
- Parser recognises the codes above, scans text lines for numeric values + ranges, and writes new `Observation` rows only when the document’s person matches the requesting owner. Duplicate (code/date/value) combos are skipped.
- Keep feature off by default; recommend testing against fixtures first (`curl` with sample `documentId`).
