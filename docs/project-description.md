# **EverMed — Project Description (Non-Technical)**

**Version:** 2.0 • October 15, 2025

**Product:** **Glucose Tracking & Metabolic Insights (non-SaMD)**

This document aligns product, design, and operations on what we're building now and why. It excludes implementation detail and regulatory filings.

---

## **1) Vision**

**An intelligent glucose tracking app that helps you understand how food affects your blood sugar—with AI-powered meal logging, nutrition analysis, and personalized insights.**

---

## **2) Positioning & Wedge**

- **Problem:** Tracking meals is tedious; understanding glucose patterns is confusing; generic advice doesn't account for personal metabolic responses.

- **Wedge:** **Photo-first meal logging** (< 5 seconds), AI-powered food recognition, glucose-meal correlation analysis, and personalized insights—all with strong privacy and non-SaMD compliance.

- **Non-SaMD stance:** We **do not** diagnose diabetes, recommend medication changes, or provide medical treatment. We help users **understand patterns** and **prepare questions for their doctor**.


---

## **3) Who We Serve**

**Primary:** Adults tracking glucose for diabetes management, pre-diabetes, or metabolic health optimization.

**Secondary:** Health-conscious individuals using CGM devices (Dexcom, FreeStyle Libre) or fingerstick meters.

---

## **4) Value Proposition**

- **Fastest meal logging:** Take a photo, AI recognizes food in 15 seconds.

- **Automatic nutrition tracking:** Detailed macros, fiber, glycemic index from 900k+ food database.

- **Glucose-meal correlation:** See exactly how each meal affects your blood sugar over 2-4 hours.

- **Daily insights:** AI detects patterns (spikes after pasta, stable with eggs) and suggests questions for your doctor.

- **Privacy-first:** All data encrypted, never sold, user-controlled export/delete.


---

## **5) Regulatory Boundary (Non-SaMD)**

- **Non-SaMD:** Track, visualize, correlate, and explain patterns. Provide informational insights.

- **No diagnosis:** We never diagnose diabetes, pre-diabetes, or metabolic conditions.

- **No treatment advice:** We never recommend medication changes, insulin dosing, or specific treatments.

- **No emergency triage:** For urgent symptoms (extreme highs/lows, confusion), we direct users to seek immediate medical care.

- **Informational only:** All insights include disclaimers and encourage clinical consultation.


---

## **6) Security & Privacy Non-Negotiables**

- **Encryption:** All data encrypted in transit (TLS) and at rest (AES-256).

- **Row-Level Security (RLS):** Database policies ensure users can only access their own data.

- **No data selling:** We never sell user data to advertisers, insurers, or third parties.

- **GDPR/HIPAA-ready:** User-controlled export, deletion, and data portability.

- **Secure storage:** Food photos stored in private Supabase buckets with signed URLs.

- **Minimal retention:** Old photos auto-deleted after 90 days (configurable).


---

## **7) Core Features**

### **1. Photo-First Meal Logging**
- Tap camera → snap photo → AI recognizes food items in 15 seconds
- Manual entry fallback for complex meals or user preference
- Meal types: Breakfast, Lunch, Dinner, Snack
- Automatic timestamp and location tagging (optional)

### **2. AI Food Recognition**
- **Google Gemini 2.5 Flash** for food identification (85%+ accuracy)
- Recognizes ingredients, portion sizes, preparation methods
- Falls back to manual search if confidence < 70%

### **3. Nutrition Database**
- **Nutritionix API** with 900k+ foods (branded + restaurant + common foods)
- Macros: Calories, protein, carbs, fat, fiber
- Micronutrients: Sugar, sodium, glycemic index estimates
- Detailed per-ingredient breakdown

### **4. Glucose Tracking**
- Manual fingerstick entry (value, timestamp, meter source)
- CGM integration (Dexcom, FreeStyle Libre) via OAuth APIs
- Time-series visualization with meal markers
- Spike detection (>180 mg/dL, >50 mg/dL rise in 1 hour)

### **5. Glucose-Meal Correlation**
- Align meals with glucose readings within 2-4 hour windows
- Show pre-meal baseline, peak glucose, and time-to-peak
- Calculate "glucose impact score" per meal (informational only)
- Color-coded visualizations (green/yellow/red for stable/moderate/spike)

### **6. Daily Insights (AI-Powered)**
- **Pattern detection:** "Your glucose tends to spike after pasta but stays stable with eggs"
- **Meal recommendations:** "Consider pairing carbs with protein to reduce spikes"
- **Questions for your doctor:** "Ask your doctor if you should adjust your carb intake at breakfast"
- **Trend analysis:** Weekly summaries of average glucose, variability, time-in-range

### **7. Dashboard & Timeline**
- Daily timeline view: Meals + glucose readings in chronological order
- Calendar view: Monthly overview with color-coded days (good/moderate/challenging)
- Stat cards: Average glucose, meals logged, days tracked
- Charts: Line charts for glucose trends, bar charts for meal impact

---

## **8) Killer Use Case — Appointment Prep**

**Scenario:** User has endocrinology appointment next week

**Workflow:**
1. Open "Weekly Summary" report
2. See top 3 insights: "Glucose spikes after breakfast 4 out of 7 days"
3. Export PDF report with charts and meal photos
4. Bring to appointment with pre-populated questions

**Contents:**
- 7-day glucose trend chart
- Top 5 meals with biggest glucose impact
- Daily insights and patterns
- Questions to ask doctor (auto-generated)

**Privacy:** Report is generated locally; user controls sharing

---

## **9) End-to-End Journeys**

### **Onboarding Journey (3 minutes)**
1. Welcome screen → Create account (email/password or SSO)
2. Set glucose targets (default: 70-180 mg/dL, customizable)
3. Choose tracking method: Manual fingerstick or Connect CGM
4. Optional: Set meal reminders and daily logging goals
5. First meal prompt: "Log your first meal to get started!"

### **Daily Logging Journey (< 1 minute per meal)**
1. Tap "+" → Select meal type (Breakfast/Lunch/Dinner/Snack)
2. Take photo → AI analyzes (15 seconds)
3. Review ingredients → Edit quantities if needed
4. Save → Nutrition totals and glucose prediction shown
5. Log glucose reading (manual or auto-sync from CGM)

### **Insight Discovery Journey (2 minutes/day)**
1. Open Dashboard → See daily timeline
2. Tap meal card → View glucose response curve
3. Read insight: "This meal caused a 60 mg/dL spike"
4. Tap "Why?" → See explanation with carb/fiber breakdown
5. Save favorite meals or flag problematic ones

### **Weekly Review Journey (5 minutes/week)**
1. Get notification: "Your weekly summary is ready"
2. Open summary → Review top insights and trends
3. Export PDF for doctor appointment or personal records
4. Set goals for next week based on learnings

---

## **10) UI Patterns — Starter Cards**

Keep the UI simple; teach by example:

- "Log your first meal 📸" • "Connect your CGM" • "What caused my spike?"
- "Weekly Summary 📊" • "Best meals this week" • "Questions for my doctor"
- Starter cards appear on Home and as quick actions in the FAB

---

## **11) Output Contract — Daily Insights**

**Format:**
- **Pattern identified:** 1 sentence ("Your glucose spiked 4 times after breakfast this week")
- **Possible reason:** Carb/fiber ratio, meal timing, portion size
- **Suggestion (informational):** "Consider adding protein to stabilize blood sugar"
- **Question for your doctor:** "Should I adjust my breakfast carb intake?"
- **Disclaimer:** "This is not medical advice. Discuss with your healthcare provider."

**Latency target:** p95 < 2s for dashboard load, < 30s for AI meal analysis

---

## **12) Content & Tone**

- **Empowering, not clinical:** "You're doing great tracking!" vs. "Patient compliance detected"
- **Plain language:** "Blood sugar" instead of "glycemic index"
- **No scare tactics:** Avoid "dangerous" or "critical" unless truly urgent
- **Solution-oriented:** Focus on what users can control (meal choices, timing)
- **Encourage clinical partnership:** Always suggest doctor consultation for major changes

**Standard disclaimer (global):**
_"EverMed helps you track and understand glucose patterns. It doesn't diagnose conditions or replace medical advice. For treatment decisions, always consult your healthcare provider."_

---

## **13) Banned Topics (Non-SaMD Compliance)**

**Never provide:**
- Diabetes diagnosis ("You have Type 2 diabetes")
- Medication dosing ("Take 10 units of insulin")
- Emergency triage ("This is a medical emergency")
- Treatment recommendations ("You should start metformin")
- Automated disease classification ("This pattern indicates diabetic neuropathy")

**Always redirect to clinical care:**
- "If you're experiencing extreme glucose highs/lows, confusion, or severe symptoms, seek immediate medical care."
- "For questions about medication or treatment, please consult your healthcare provider."

---

## **14) Data Model (Core Entities)**

**Person:** User profile with glucose targets, meal preferences, connected devices

**FoodEntry:** Meal log (timestamp, meal type, total nutrition, glucose prediction)

**FoodPhoto:** Uploaded image with AI analysis status and recognized items

**FoodIngredient:** Per-ingredient nutrition breakdown (linked to Nutritionix API)

**GlucoseReading:** Time-series glucose data (value, timestamp, source: manual/CGM)

**GlucosePrediction:** AI-generated glucose forecast with confidence scores (future feature)

**MetabolicInsight:** Daily/weekly pattern summaries (spike triggers, stable meals, trends)

**PersonalModel:** Per-user LSTM model for glucose prediction (future feature)

**MealTemplate:** Saved recipes and favorite meals for quick logging

---

## **15) Admin Dashboard (Internal, Non-PHI)**

**Purpose:** Monitor product health, engagement, and performance—without exposing user data

**Top Tiles (last 7/30 days):**

- **Adoption:** % of users who logged ≥ 3 meals in first 7 days
- **Engagement:** Average meals logged per active user per week
- **Retention:** D7, D30, D90 retention rates
- **Feature usage:** % using photo logging vs. manual entry
- **AI accuracy:** % of food recognitions accepted without edits
- **Performance:** p95 latency for meal analysis, dashboard load
- **Glucose insights:** Average meals correlated with glucose readings per user
- **Weekly reports:** % of active users viewing weekly summary
- **Errors:** API failures (Nutritionix, Google Vision), OCR errors
- **Costs:** Token usage by feature (meal analysis, insights generation)

**Access control:** Admin users only (AdminUser table with RLS)

**Privacy:** All metrics are aggregated; no individual user data exposed

---

## **16) Success Metrics**

- **North Star:** **% of active users who view ≥ 1 weekly summary per month** (target: ≥ 50%)

- **Activation:** **≥ 70%** of new users log ≥ 3 meals in first 7 days

- **Engagement:** Average **≥ 10 meals logged per week** per active user

- **Accuracy:** AI food recognition accepted without edits **≥ 75%** of the time

- **Retention:** **D30 ≥ 40%**, D90 ≥ 25%

- **Glucose correlation:** **≥ 60%** of meals correlated with glucose readings (indicates CGM integration or diligent manual logging)

- **Performance:** Meal analysis **p95 < 30s**, Dashboard load **p95 < 2s**

- **Trust:** Insight helpfulness rating **≥ 4.0/5.0**


**Stop-ship thresholds:**
- AI accuracy drops below 60% for 7 consecutive days → Pause meal photo feature
- Performance p95 > 60s for meal analysis → Block new meal submissions
- Zero P0 incidents/month (data breaches, wrong-user data leaks)

---

## **17) Roadmap (High-level)**

**Sprint 7-8 (Current): Deployment & Beta Launch (2 weeks)**
- Deploy staging database with metabolic tables
- Create storage buckets (food-photos, ml-models) with RLS
- Deploy to Vercel staging
- Run smoke tests (photo upload, AI analysis, dashboard)
- Beta user recruitment (10-20 initial testers)
- Monitor for 48 hours before production

**Q4 2025: Core Experience Polish**
- LSTM glucose prediction models (optional, mock baseline for beta)
- CGM API integrations (Dexcom OAuth, FreeStyle Libre)
- Weekly summary PDF export
- Meal template library (save favorites)
- Improved AI accuracy with user feedback loop

**Q1 2026: Expansion & Scale**
- Subscription tiers (Free: 10 meals/week, Pro: Unlimited)
- Advanced analytics (HbA1c estimates, time-in-range)
- Meal recommendations based on personal patterns
- Community features (anonymized meal sharing)
- iOS native app (React Native or Swift)

**Q2 2026: Personalization**
- Per-user ML models trained on individual data
- A/B testing for prediction algorithms
- Model versioning and performance tracking
- Adaptive insights based on user behavior

---

## **18) CGM Integration Strategy**

**Supported devices:**
- Dexcom G6/G7 (OAuth 2.0 API)
- FreeStyle Libre 2/3 (OAuth 2.0 API)
- Manual fingerstick (always supported)

**Data sync:**
- Incremental sync every 15 minutes (background job)
- Encrypted OAuth tokens stored in database
- Automatic refresh token rotation
- Graceful fallback to manual entry if API unavailable

**Privacy:**
- User controls which devices are connected
- Can disconnect at any time
- Raw CGM data never shared with third parties
- Only aggregated, anonymized data used for ML training (opt-in)

---

## **19) Business Model**

**Free Tier:**
- 10 meals/week with photo logging
- Basic glucose tracking (manual entry)
- Daily insights (3/week)
- 30-day data retention

**Pro Tier ($9.99/month):**
- Unlimited meal logging
- CGM integration (Dexcom, FreeStyle Libre)
- Weekly summary PDF exports
- Advanced insights (pattern detection, predictions)
- 1-year data retention
- Priority support

**Future (2026+):**
- Team plans for families ($19.99/month for 4 users)
- Clinician dashboard (view patient reports)
- White-label for health systems/insurance

---

## **20) Team FAQ**

**Is this a diagnostic tool?**
No—EverMed is a tracking and insights tool (non-SaMD). We do not diagnose diabetes or recommend treatment.

**What if a user's glucose is dangerously high/low?**
We display a warning: "If you're experiencing extreme glucose levels, confusion, or severe symptoms, seek immediate medical care." We never provide emergency triage.

**Do we support insulin dosing recommendations?**
No—this would be SaMD and requires FDA/CE Mark approval. Users must consult their doctor for all medication decisions.

**How accurate is the AI food recognition?**
85%+ accuracy on common foods (pizza, salad, chicken). Falls back to manual search for complex or uncommon meals.

**Can users export their data?**
Yes—CSV export of all meals and glucose readings. Future: FHIR bundle export for clinical systems.

**What about GDPR/HIPAA compliance?**
- GDPR: User-controlled data export, deletion, and portability
- HIPAA: Not required (we're a consumer app, not a covered entity), but we follow best practices (encryption, RLS, audit logs)

---

## **TL;DR**

Ship an **intelligent glucose tracking app** with **photo-first meal logging** as the hero feature, AI-powered nutrition analysis, glucose-meal correlation, and daily insights. Keep diagnosis out of scope; focus on empowering users to understand patterns and prepare questions for their doctor. Strong privacy, non-SaMD compliance, and a light admin dashboard to monitor engagement and performance.

**Brand:** EverMed (not GlucoLens)
**Tagline:** "Understand how food affects your glucose"
**Target:** Adults tracking glucose for diabetes, pre-diabetes, or metabolic health
**Wedge:** Fastest meal logging (< 5 seconds with photo AI)
