# **EverMed.ai — Project Description (Non-Technical)**

  

**Version:** 1.2 • Sep 10, 2025

**MVP Mode:** **Option A — Preparation Assistant (non-SaMD)**

  

This document aligns product, design, and operations on what we’re building now and why. It excludes implementation detail and regulatory filings.

---

## **1) Vision**

  

**A private, user-controlled health vault that explains your records, prepares you for appointments, and shares only what’s necessary—on your terms.**

---

## **2) Positioning & Wedge**

- **Problem:** Records are scattered and jargon-heavy; sharing is clumsy; appointments feel unprepared.
    
- **Wedge:** Personal context + plain-language _explain_ + **Appointment Pack** sharing, with strong privacy UX and source provenance.
    
- **Non-SaMD stance:** We **do not** diagnose, dose, triage emergencies, or classify images in MVP.
    

---

## **3) Who We Serve (MVP focus)**

  

**Primary:** The **Organizer (Caregiver)** managing a family member’s health.

**Secondary:** Adults with ongoing conditions, clinicians receiving share links.

---

## **4) Value Proposition**

- One secure place for medical files.
    
- One-tap explanations in plain language with sources.
    
- **Appointment Prep** via curated, passcode-protected **Appointment Packs**.
    
- Light timelines for key labs and photo progress (no automated grading).
    

---

## **5) Regulatory Boundary (MVP)**

- **Non-SaMD**: summarize, explain, organize, prepare, and share.
    
- No diagnostic statements, dosing advice, emergency triage, or automated image analysis.
    
- **Invite-only track** (“Clinical Insights,” §18) can explore diagnosis-adjacent content with explicit consent and clear limits.
    

---

## **6) Security & Trust Non-Negotiables (MVP)**

- **App lock required by default** (biometric/PIN).
    
- **Encryption in transit and at rest** from day one.
    
- **Share packs:** passcode by default, 7-day expiry, view logging, one-tap revoke.
    
- **Zero silent profile updates:** suggest → user accepts.
    
- **Provenance everywhere:** show which document/line informed a statement.
    

---

## **7) Interoperability & Data Posture**

- Canonical model aligned to **HL7 FHIR R4** and **gematik/ePA** profiles where practical (e.g., DocumentReference, Observation, MedicationStatement, AllergyIntolerance, Encounter).
    
- **Germany first**: export-ready; no ePA write-back in MVP.
    
- Minimal data collection; user-controlled export/delete.
    

---

## **8) Core Pillars (MVP)**

1. **Organize:** Vault for PDFs, photos, notes; tags & search.
    
2. **Understand (Explain):** One-tap, plain-language summaries with sources.
    
3. **Ask (Chat):** Answers grounded strictly in the user’s records; graceful refusals beyond scope.
    
4. **Share:** Time-limited, passcode-protected **Appointment Packs**.
    
5. **Track:** Extracted lab timelines + photo timelines with user annotations (no automated scoring).
    

---

## **9) Killer Use Case —** 

## **Appointment Pack**

##  **(Spec)**

- **Modes:** Cardiology visit, Allergy for school, Urgent care.
    
- **Contents:** Last 6–12 months relevant labs, current meds, allergies, brief history, user notes.
    
- **Defaults:** Passcode required, 7-day expiry, view logs, one-tap revoke; printable summary PDF.
    
- **Scope:** Only selected items—never the whole vault.
    

---

## **10) End-to-End Journeys**

1. **Onboard:** Create account → enable app lock → short welcome → first upload prompt.
    
2. **Upload & Organize:** Camera/files; OCR; suggest tags; group by Person/Topic.
    
3. **Explain:** Tap any doc → deterministic summary template + sources (see §12).
    
4. **Ask:** Natural language; responds using user docs; cites sources or says what’s missing.
    
5. **Track:** Show select lab values over time; photo timelines with user notes.
    
6. **Share:** Create & send an Appointment Pack; passcode/expiry/logs/revoke.
    

---

## **11) UI Patterns —** 

## **Starter Cards**

##  **(Snippets/Workflows)**

  

Keep the UI simple; teach by example:

- “Explain this lab” • “Prepare for visit” • “Allergy pack for school” • “What changed since last time?”
    
    Starter cards appear on Home and as quick actions in the composer.
    

---

## **12) Output Contract —** 

## **Explain**

- **What this is:** 1 sentence (“CBC from Mar 5, 2025”).
    
- **Key findings (≤3):** direction + plain-English significance.
    
- **Questions for your clinician (2–3).**
    
- **What to watch:** thresholds/time windows.
    
- **Sources:** file/date and anchored section/line when possible.
    
- **Disclaimer:** short, human.
    
- **Latency target:** p95 < 10s for a 3-page PDF (OCR + Explain).
    

---

## **13) Content & Tone**

- Plain language; no scare tactics.
    
- State what’s known, what to watch, and when to seek care.
    
- Avoid diagnosis in MVP; emphasize preparation and source transparency.
    
- **Standard disclaimer (global):**
    
    _“EverMed explains your records to help you prepare. It doesn’t diagnose or replace a clinician. If something feels urgent or unsafe, seek care immediately.”_
    

---

## **14) Banned Topics in Chat (MVP)**

- Diagnostic statements, dosing, emergency triage, automated image interpretation.
    
- Standard escalation language for red flags (“If you have chest pain, trouble breathing… seek emergency care.”)
    

---

## **15) Minimal Data Model (MVP)**

  

**Entities:** Person, Document (PDF/Image/Note), Observation (name, value, unit, date, source), Medication, Allergy, Encounter, SharePack.

**Observation scope at launch:** CBC, CMP (electrolytes, BUN/Cr, glucose), HbA1c, Lipids, TSH, INR/PT, eGFR/Creatinine, ALT/AST, CRP.

**Ingestion:** OCR → extract tables/lines → candidate Observations with exact provenance.

---

## **16) Admin Dashboard (Internal, Read-only)**

  

**Purpose:** Monitor success, safety, and usage—without PHI in analytics.

**Top Tiles (last 7/30 days):**

- **North Star:** % of active users who created ≥1 **Appointment Pack** in first 30 days.
    
- **Activation:** % new users with first_upload_done **and** explain_viewed within 24h.
    
- **Clarity:** % “Explain helpful = Yes”; breakdown by doc type/template.
    
- **Preparation:** % WAU creating ≥1 pack/mo; **Recipient thumbs-up** %.
    
- **Retention:** D30 retention for Organizer cohort.
    
- **Trust:** profile_suggestion_accept_rate band (target 40–60%).
    
- **Safety:** P0/P1 incident counts; % answers without citations (should be ≈0).
    
- **Latency:** p95 OCR+Explain on 3-page PDFs.
    
- **Usage:** DAU/WAU/MAU, uploads per user, average pages per doc.
    
- **Tokens/Costs:** tokens by feature (Explain/Ask/OCR extraction), avg tokens per Explain, per-user token bands.
    

  

_Access control required; analytics payloads are event-only (no PHI)._

---

## **17) Success Metrics (Targets & Definitions)**

- **North Star:** ≥ **35%** WAU create ≥1 **Appointment Pack**/month; recipient thumbs-up **≥ 75%**.
    
- **Activation:** ≥ **70%** new users: first_upload_done + explain_viewed within 24h.
    
- **Clarity:** Explain helpful **≥ 80% Yes**.
    
    - **Stop-ship:** if <70% for 7 consecutive days → freeze new Explain templates pending review.
        
    
- **Retention (Organizer):** D30 **≥ 25%**.
    
- **Trust:** profile suggestion accept rate **40–60%**; audit outside band.
    
- **Safety:** **0 P0** incidents/month; **<3 P1**/month triggers content review.
    
- **Latency:** OCR+Explain p95 **< 10s** on 3-page PDFs.
    

  

**Measurement plan:** Instrument named events (e.g., first_upload_done, explain_viewed, share_pack_created, share_pack_recipient_feedback, profile_suggestion_shown/accepted, unsafe_report), sampled client timings, and server token counters. No PHI in analytics.

---

## **18) Invite-Only Track —** 

## **Clinical Insights (Beta)**

- **Scope:** “Possible explanations” phrased as **informational**, only when grounded in user documents; explicit consent and clear limits; no dosing/triage/images.
    
- **Controls:** Additional disclaimers, opt-out, and separate telemetry.
    
- **Goal:** Evaluate usefulness and safety for a future regulated path—without diluting MVP scope.
    

---

## **19) Roadmap (High-level)**

- **MVP (90 days):** Vault + OCR; Explain (template + provenance); Ask (RAG over user docs only); **Appointment Packs** with passcode/expiry/logs/revoke; lab timelines; photo timelines with user notes; app lock; at-rest encryption; export/delete.
    
- **Near-term:** “Prepare for visit” wizard; two-person household support (Organizer +1); evaluate E2EE for share packs; model router groundwork (single default model at launch; pluggable later).
    
- **Later:** Multi-person households; clinician feedback loop; richer trend views; FHIR bundle export; explore Clinical Insights as regulated product.
    

---

## **20) Team FAQ (MVP)**

- **Is this a diagnostic tool?** No—MVP is non-SaMD preparation and sharing.
    
- **What if we’re unsure?** We say so, cite gaps, and suggest what to upload or ask.
    
- **Do we support ePA?** Export-ready, yes; no write-back in MVP.
    
- **Model choice?** Ship with one vetted default. Architecture supports later model switching (e.g., Pro tier), gated by evaluation and privacy constraints.
    

---

**TL;DR:** Ship a trustworthy **Preparation Assistant** with **Appointment Packs** as the hero flow, strong privacy UX, rigorous provenance, and a light but useful admin dashboard. Keep diagnosis out of MVP; explore it safely in an invite-only beta.