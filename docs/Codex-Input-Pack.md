 

---

## **The “Codex Input Pack” (what to prepare before you hit “Go”)**

  

### **1)
### Build Charter


- **Scope:** MVP = non‑SaMD **Preparation Assistant**; no diagnosis, no dosing, no emergency triage, no automated image grading.
    
- **Wedge:** Explain → **Appointment Pack** → Share.
    
- **Regions:** Germany/EU first; export‑ready for **gematik/ePA**; no write‑back in MVP.
    
- **Non‑negotiables:** app lock on by default; encryption at rest + transit; provenance in UI; explicit sharing (passcode + 7‑day expiry + logs + revoke).
    
- **Out of scope (MVP):** EHR integrations, portal scraping, classification of images.
    
- **Invite‑only track:** “Clinical Insights (Beta)”—diagnosis‑adjacent phrasing, explicit consent, separate flag.
    

  

> Codex uses this as the top‑level guardrail when making tradeoffs.

---

### **2)** 

### **Tech Stack Decisions**

###  **(Codex needs these locked)**

- **Frontend:** Next.js (App Router) + TypeScript + React Query.
    
- **Mobile (optional now):** React Native or skip for MVP.
    
- **Backend:** TypeScript (NestJS) **or** Python (FastAPI). Pick one.
    
- **DB:** Postgres + **pgvector** (RAG), row‑level encryption or encrypted volume.
    
- **Object storage:** S3‑compatible (EU region).
    
- **OCR:** On‑box Tesseract/PaddleOCR (PHI‑safe) or your approved vendor.
    
- **Search/RAG:** local embeddings store (no PHI to third‑party by default).
    
- **CI/CD:** GitHub Actions with OIDC → cloud (EU).
    
- **Error/metrics:** OpenTelemetry; Sentry (server‑side de‑identified events only).
    
- **Model usage in‑product:** one vetted default model; router hooks for future Pro model.
    
- **Agent framework (if you embed agents in‑app later):** OpenAI **Agents SDK**. 
    

  

> Codex can scaffold either NestJS or FastAPI well, but it will choose unless you pin it.

---

### **3)** 

### **Repo Skeleton & Scripts**

###  **(so Codex can run tests)**

```
/apps/web          # Next.js
/apps/api          # NestJS or FastAPI
/packages/ui       # shared UI components
/packages/types    # shared TypeScript types / pydantic models mirror
/packages/config   # eslint, prettier, tsconfig, ruff, black, etc.
/infra             # IaC (Terraform), Dockerfiles, devcontainers
/db                # migrations (Prisma/Drizzle or Alembic)
/docs              # product docs & API contracts (this section)
Makefile           # make test, make e2e, make seed
README.md          # how to run locally + how to run tests
.env.example       # never real secrets
```

**Scripts Codex must be able to run:**

- make test → unit + API contract tests
    
- make e2e → Playwright/Cypress happy‑path flows
    
- make seed → seed non‑PHI fixtures for realistic tests
    

  

> Codex’s cloud job runs your scripts; if they fail, it iterates until passing. 

---

### **4)** 

### **API & Event Contracts**

###  **(unambiguous I/O so Codex can code confidently)**

  

#### **4.1 REST/HTTP (minimum set)**

- POST /v1/uploads — multipart doc/image → document_id
    
- GET /v1/documents/:id — metadata + secure URL
    
- POST /v1/explain/:document_id — returns Explain payload (see §7)
    
- POST /v1/chat — { question, context_scope } → streamed answer + citations
    
- POST /v1/share-packs — create pack (items[], expiry, passcode) → share_id
    
- GET /v1/share-packs/:id — public view (audited)
    
- POST /v1/observations/extract — extract labs from doc(s)
    
- GET /v1/observations?person=:id&type=:code — timeline
    
- **Admin**: GET /v1/admin/metrics (see §8); GET /v1/admin/usage/tokens
    

  

#### **4.2 Webhooks (so admin dashboard updates live)**

- document.processed, observations.extracted, share.viewed, model.token_usage
    

  

#### **4.3 Analytics Events (no PHI)**

- first_upload_done, explain_viewed, share_pack_created, share_pack_recipient_feedback,
    
    profile_suggestion_shown/accepted, unsafe_report, latency_ms:ocr_explain, tokens:explain/ask
    

  

> Provide JSON examples for each endpoint + event so Codex can write tests and adapters.

---

### **5)** 

### **Data Model (FHIR‑aligned minimal set)**

  

Codex needs concrete schemas. Example (simplified):

```
-- Person (FHIR: Patient)
id uuid PK, given_name, family_name, birth_year int, sex_at_birth text, locale, created_at

-- Document (FHIR: DocumentReference)
id uuid PK, person_id FK, kind enum('pdf','image','note'), topic enum('labs','allergies','imaging','other'),
filename, storage_url, sha256, uploaded_at, processed_at

-- Observation (FHIR: Observation)
id uuid PK, person_id FK, code text, display text, value_num float, unit text, ref_low float, ref_high float,
effective_date date, source_document_id FK, source_anchor text

-- Medication (FHIR: MedicationStatement), Allergy (FHIR: AllergyIntolerance), Encounter (FHIR: Encounter)
...

-- SharePack
id uuid PK, person_id FK, title, audience enum('clinician','school','urgent'), passcode_hash, expires_at,
revoked_at, views_count int default 0

-- SharePackItem (join table to Document/Observation)
```

**Embedding store (pgvector):**

- doc_chunks(document_id, chunk_id, text, embedding vector(1536), created_at)
    

  

> Add FHIR code mappings for MVP labs: CBC, CMP, HbA1c, Lipids, TSH, INR/PT, eGFR/Creatinine, ALT/AST, CRP.

---

### **6)** 

### **Security & Compliance Requirements**

###  **(so Codex bakes them in)**

- **App lock:** biometric/PIN flow required on first run.
    
- **Crypto:** TLS; at‑rest encryption; server‑side key management; hashed passcodes for share links.
    
- **Sharing:** passcode mandatory; default 7‑day expiry; view logging; one‑tap revoke.
    
- **EU residency:** all storage + inference endpoints must be EU‑hosted unless flagged.
    
- **No PHI in logs/analytics.**
    
- **Privacy UX:** consent screens for special‑category data (GDPR); clear export/delete path.
    
- **Provenance:** all Explain/Chat answers must include doc anchors.
    

---

### **7)** 

### **LLM Interfaces (in‑product)**

  

Give Codex the **exact function signatures** it should call from your app:

- explainDocument(documentId: string) -> ExplainPayload
    

```
{
  "what_this_is": "CBC from 2025-03-05",
  "key_findings": [
    {"label": "Hemoglobin", "direction": "slightly low", "meaning": "may cause fatigue"}
  ],
  "questions_for_clinician": ["Could low iron explain this?"],
  "what_to_watch": [{"metric":"HGB","recheck_in_days":14}],
  "sources": [{"document_id":"...","anchor":"page2:HGB row"}],
  "disclaimer": "EverMed explains your records..."
}
```

-   
    
- answerQuestion(question: string, scope: 'person'|'pack') -> { answer, citations[], safety_tag }
    
- extractObservations(documentId) -> Observation[]
    

  

Also provide:

- **Allowed/blocked topics list** for the router (MVP bans diagnosis/dosing/triage).
    
- **Latency budgets:** OCR+Explain p95 < 10s on 3‑page PDFs.
    
- **Model config:** default model, temperature, JSON mode/structured outputs, max tokens.
    

  

_(If you later embed agents inside your app, define tool specs for retrieval, search, and pack management; the OpenAI_ **_Agents SDK_** _works well for that.)_ 

---

### **8)** 

### **Admin Dashboard Spec**

###  **(so Codex can build it once, right)**

  

**Tiles (7/30‑day):**

- North Star: % WAU with ≥1 **Appointment Pack**
    
- Activation: % new users with first_upload_done + explain_viewed within 24h
    
- Clarity: % “Explain helpful = Yes” (by doc type/template)
    
- Preparation: % WAU creating ≥1 pack; **recipient thumbs‑up** %
    
- Retention: D30 (Organizer cohort)
    
- Trust: profile suggestion **accept rate** (target 40–60%)
    
- Safety: P0/P1 incidents; % answers without citations
    
- Latency: p95 OCR+Explain
    
- Usage: uploads/user, pages/doc
    
- **Tokens/costs:** by feature (Explain/Ask/RAG/OCR extraction)
    

  

**Access:** internal only; role‑based.

**Data source:** metrics service + events warehouse (no PHI).

**Drilldowns:** click into cohort, template, doc type.

---

### **9)** 

### **QA & Evaluation Harness**

###  **(Codex will rely on this to self‑check)**

- **Red‑team prompts** (English + German) for banned topics; expected refusal templates.
    
- **Gold answers** for Explain on 10–20 sample PDFs (synthetic but realistic).
    
- **Citations tests:** fail if answer lacks at least one source for any medical claim.
    
- **Provenance tests:** verify anchors resolve to the right file/line.
    
- **Latency tests:** fail CI if p95 exceeds budget on seeded sample docs.
    
- **Security tests:** attempt to create share pack without passcode → must fail.
    

  

> Put all fixtures in /tests/fixtures/ with non‑PHI synthetic docs.

---

### **10)** 

### **UX Artifacts**

###  **that Codex can translate to code**

- **Wireflows** for: Upload → Explain, Explain → Pack, Pack share/open/revoke, Admin dashboard drilldowns.
    
- **Copy deck**: disclaimers, red‑flag text, share UX explanations, consent screens (DE/EN).
    
- **Component library choice** (e.g., Radix + Tailwind) and accessibility requirements.
    

---

### **11)** 

### **DevOps & Secrets Handling**

- **.env.example** with placeholders only; Codex must never commit real secrets.
    
- **Terraform** stubs for EU region infra; S3 bucket policy denying public access.
    
- **Branch/PR rules:** Conventional Commits; PR template with checkboxes (tests, security review, migration plan).
    
- **Observability:** OpenTelemetry auto‑instrumentation with sampling rules (no payloads).
    

---

### **12)** 

### **Task Backlog to Feed Codex (first 10 PRs)**

1. Scaffold repo, CI, linting/formatting, devcontainer.
    
2. Implement Person, Document, storage, and signed URLs.
    
3. OCR pipeline + PDF parsing + provenance anchors.
    
4. Observation extraction for MVP labs + timelines.
    
5. **Explain** service (deterministic template + sources + latency budget).
    
6. RAG indexer + chunker + retrieval with document scoping.
    
7. Chat API with refusals and citation enforcement.
    
8. **Appointment Pack** API + public viewer + logs + passcode + revoke.
    
9. Admin dashboard (tiles + drilldowns + token usage).
    
10. Analytics events + privacy screens + export/delete.
    

  

> Each PR should include tests, fixtures, and an e2e that Codex can run in the cloud sandbox. 

---

### **13)** 

### **Model‑Routing Notes (Pro tier later)**

- Provide a config file models.toml with **one default** model for MVP and optional slots for Pro (e.g., domain model for medical text).
    
- Include **policy flags**: allow_external_inference=false by default; must be flipped intentionally.
    
- Add **residency constraints**: inference_region=eu.
    

---

## **Bottom line**

  

If you deliver the **Codex Input Pack** above—codebase skeleton, runnable tests/fixtures, crisp API + data contracts, hard security guardrails, and a real evaluation harness—Codex can start shipping high‑quality PRs immediately and keep improving them by running the tests in its **cloud sandbox preloaded with your repo** (and, if you allow, with controlled internet access). 

  

If you want, I can turn this into a repo seed (/docs + skeleton + test fixtures) so Codex can begin with PR #1.