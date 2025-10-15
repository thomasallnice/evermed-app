# **CRITICAL PIVOT BRIEFING: EverMed → GlucoLens**

**Date:** October 15, 2025  
**Priority:** IMMEDIATE EXECUTION  
**Scope:** Complete product pivot from health vault to glucose/food tracking app

---

## **EXECUTIVE SUMMARY**

We are pivoting EverMed from a broad health document vault to a focused glucose/food tracking app. The new product is called **GlucoLens** (or similar name pending domain availability). This is a FULL PIVOT, not an add-on feature.

**Core Value Proposition:** "See how food affects your blood sugar. Snap, track, learn."

---

## **IMMEDIATE ACTIONS REQUIRED**

### **Phase 1: Cleanup & Refactor (Day 1-2)**

#### 1.1 Remove Deprecated Features
**DELETE these entire features and their associated code:**
- [ ] Document vault functionality (`/vault`, `/api/documents`)
- [ ] Appointment packs (`/packs`, `/api/share-packs`)
- [ ] Document explain feature (`/api/explain`)
- [ ] Chat/Ask feature (`/chat`, `/api/chat`)
- [ ] OCR processing (`/api/ocr`)
- [ ] Share packs (`/api/share`)
- [ ] Medical record parsing

**DELETE these directories:**
```bash
rm -rf apps/web/src/app/vault
rm -rf apps/web/src/app/packs
rm -rf apps/web/src/app/chat
rm -rf apps/web/src/app/explain
rm -rf apps/web/src/app/share
rm -rf apps/web/src/components/vault
rm -rf apps/web/src/components/packs
rm -rf apps/web/src/components/chat
rm -rf apps/web/src/lib/ocr
rm -rf apps/web/src/lib/document-processing
rm -rf apps/web/src/lib/medical-records
```

#### 1.2 Database Schema Cleanup
**DROP these tables (create migration):**
```sql
-- Migration: 20251015_pivot_cleanup.sql
DROP TABLE IF EXISTS "Document" CASCADE;
DROP TABLE IF EXISTS "DocChunk" CASCADE;
DROP TABLE IF EXISTS "DocumentShare" CASCADE;
DROP TABLE IF EXISTS "SharePack" CASCADE;
DROP TABLE IF EXISTS "SharePackDocument" CASCADE;
DROP TABLE IF EXISTS "SharePackAccess" CASCADE;
DROP TABLE IF EXISTS "Observation" CASCADE;
DROP TABLE IF EXISTS "Medication" CASCADE;
DROP TABLE IF EXISTS "Allergy" CASCADE;
DROP TABLE IF EXISTS "Encounter" CASCADE;
DROP TABLE IF EXISTS "Immunization" CASCADE;
DROP TABLE IF EXISTS "Procedure" CASCADE;
DROP TABLE IF EXISTS "Condition" CASCADE;

-- Keep only:
-- User (auth.users)
-- Person
-- FoodEntry
-- FoodPhoto
-- FoodIngredient
-- GlucoseReading
-- MetabolicModel
-- MealTemplate
-- MetabolicInsight
```

#### 1.3 Dependencies Cleanup
**REMOVE these packages from package.json:**
```json
// Remove from dependencies:
- "@google-cloud/documentai"
- "@google-cloud/vision" (keep only if using for food)
- "pdf-parse"
- "pdfjs-dist"
- "mammoth"
- "tesseract.js"
- "@langchain/community"
- "@langchain/core"
- "langchain"
```

#### 1.4 Environment Variables Cleanup
**REMOVE from all .env files:**
```bash
# Remove these:
OPENAI_API_KEY
GOOGLE_CLOUD_DOCUMENTAI_PROCESSOR_ID
GOOGLE_CLOUD_HEALTHCARE_DATASET_ID
GOOGLE_CLOUD_HEALTHCARE_FHIR_STORE_ID
```

**KEEP only:**
```bash
# Core
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_URL
NEXTAUTH_SECRET

# Food Analysis
GOOGLE_CLOUD_PROJECT
GOOGLE_APPLICATION_CREDENTIALS_JSON
USE_GEMINI_FOOD_ANALYSIS=true

# Future: Health Integrations
# APPLE_HEALTHKIT_CLIENT_ID
# GOOGLE_FIT_CLIENT_ID
# DEXCOM_CLIENT_ID
```

---

## **Phase 2: Core Rebuild (Day 3-5)**

### 2.1 New App Structure
```
apps/web/src/app/
├── page.tsx                 # Landing page (marketing)
├── onboarding/              # New user setup
│   ├── page.tsx            # Diabetes type, goals
│   └── connect/            # CGM/HealthKit connection
├── dashboard/               # Main app (after login)
│   ├── page.tsx           # Today's summary + quick actions
│   ├── log/               # Food camera/manual entry
│   ├── glucose/           # Blood sugar entry/history
│   ├── insights/          # Patterns & predictions
│   └── settings/          # Profile, targets, integrations
├── api/
│   ├── food/              # Food photo analysis
│   ├── glucose/           # Glucose CRUD
│   ├── predictions/       # ML predictions
│   ├── insights/          # Analytics
│   └── sync/              # HealthKit/CGM sync
```

### 2.2 Simplified Database Schema
```prisma
// schema.prisma - SIMPLIFIED

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String?
  diabetesType  DiabetesType?
  diagnosisDate DateTime?
  targetLow     Float    @default(70)
  targetHigh    Float    @default(140)
  timezone      String   @default("America/New_York")
  units         GlucoseUnit @default(MG_DL)
  
  foodEntries   FoodEntry[]
  glucoseReadings GlucoseReading[]
  predictions   Prediction[]
  insights      Insight[]
}

model FoodEntry {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  timestamp   DateTime @default(now())
  photoUrl    String?
  
  // Detected/confirmed nutrition
  name        String?
  calories    Float?
  carbs       Float?
  protein     Float?
  fat         Float?
  fiber       Float?
  
  // User modifications
  userNotes   String?
  isVerified  Boolean  @default(false)
  
  // Predictions
  predictions Prediction[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model GlucoseReading {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  timestamp   DateTime
  value       Float    // mg/dL or mmol/L based on user.units
  source      ReadingSource
  
  // Optional correlation
  foodEntryId String?
  mealImpact  Float?   // Calculated spike from baseline
  
  createdAt   DateTime @default(now())
}

model Prediction {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  foodEntryId String
  foodEntry   FoodEntry @relation(fields: [foodEntryId], references: [id])
  
  predictedPeak   Float
  predictedTime   Int      // Minutes to peak
  confidence      Float
  
  // Actual outcome (updated later)
  actualPeak      Float?
  actualTime      Int?
  error          Float?
  
  createdAt      DateTime @default(now())
}

model Insight {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  type        InsightType
  title       String
  message     String
  data        Json?
  isRead      Boolean  @default(false)
  
  createdAt   DateTime @default(now())
}

enum DiabetesType {
  TYPE1
  TYPE2
  PREDIABETES
  GESTATIONAL
  NONE
}

enum GlucoseUnit {
  MG_DL    // US: mg/dL
  MMOL_L   // EU: mmol/L
}

enum ReadingSource {
  MANUAL
  CGM_DEXCOM
  CGM_LIBRE
  CGM_MEDTRONIC
  FINGERSTICK
  LAB
}

enum InsightType {
  PATTERN
  WARNING
  ACHIEVEMENT
  RECOMMENDATION
  CORRELATION
}
```

### 2.3 New UI Components (Mobile-First)

```typescript
// components/glucose/QuickEntry.tsx
// Large, thumb-friendly number pad for glucose entry
// Similar to Apple Health but faster

// components/food/CameraCapture.tsx  
// Full-screen camera with overlay guides
// Single tap to capture, auto-crop plate

// components/dashboard/GlucoseGraph.tsx
// 24-hour glucose curve with meal markers
// Touch to see exact values

// components/insights/FoodImpactCard.tsx
// Shows "This meal typically raises you 45 mg/dL"
// With confidence indicator

// components/sync/HealthKitConnect.tsx
// One-tap HealthKit permission request
// Auto-sync every 15 minutes
```

### 2.4 Simplified API Structure

```typescript
// app/api/food/route.ts
POST   /api/food          // Upload photo, get analysis
GET    /api/food          // List user's food entries
PATCH  /api/food/:id      // Update nutrition/notes

// app/api/glucose/route.ts  
POST   /api/glucose       // Add reading (manual or CGM)
GET    /api/glucose       // Get readings (with pagination)
POST   /api/glucose/bulk  // Bulk import from CGM

// app/api/predictions/route.ts
POST   /api/predictions   // Generate prediction for meal
GET    /api/predictions/:id // Get prediction with outcome

// app/api/insights/route.ts
GET    /api/insights      // Get user insights
POST   /api/insights/generate // Trigger insight generation

// app/api/sync/route.ts
POST   /api/sync/healthkit // Sync with HealthKit
POST   /api/sync/dexcom   // Sync with Dexcom
GET    /api/sync/status   // Check sync status
```

---

## **Phase 3: Core Features (Day 6-10)**

### 3.1 Food Photo Analysis (ALREADY WORKING)
```typescript
// Keep and optimize existing Gemini implementation
// File: lib/food-analysis-gemini.ts

// Improvements needed:
// 1. Add portion size estimation
// 2. Improve accuracy for mixed dishes
// 3. Add barcode scanning fallback
// 4. Cache common foods for user
```

### 3.2 Glucose Entry & Import
```typescript
// New file: lib/glucose/import.ts

export async function importFromHealthKit(userId: string) {
  // 1. Request HealthKit permissions
  // 2. Fetch glucose samples from last sync
  // 3. Bulk insert to database
  // 4. Mark correlation with meals (±2 hours)
}

export async function importFromDexcom(userId: string, credentials: DexcomAuth) {
  // 1. OAuth flow with Dexcom
  // 2. Fetch CGM data via API
  // 3. Convert to our format
  // 4. Bulk insert with 5-minute intervals
}

// Manual entry with smart defaults
export function createQuickEntryUI() {
  // Large number pad
  // Recent values for quick selection
  // Time defaults to "now" 
  // Auto-detect if post-meal based on last food entry
}
```

### 3.3 Prediction Engine
```typescript
// New file: lib/ml/glucose-predictor.ts

export class GlucosePredictor {
  async predict(userId: string, foodEntry: FoodEntry) {
    // 1. Get user's baseline (last 30 min avg)
    // 2. Find similar meals in history
    // 3. Calculate expected rise based on:
    //    - Carbs (primary factor)
    //    - Protein (delays/reduces spike)
    //    - Fat (delays spike)
    //    - Time of day (morning = higher spike)
    //    - User's insulin sensitivity
    // 4. Return curve: [time, glucose] points
  }
  
  async updateWithActual(predictionId: string, actual: GlucoseReading[]) {
    // 1. Calculate error
    // 2. Update user's personal factors
    // 3. Retrain if enough data
  }
}
```

### 3.4 Insights Generation
```typescript
// New file: lib/insights/generator.ts

export async function generateDailyInsights(userId: string) {
  // Patterns to detect:
  // 1. "Breakfast spikes you more than dinner"
  // 2. "Pizza consistently causes delayed spikes"  
  // 3. "Adding protein reduces spikes by 30%"
  // 4. "Your control is improving - 85% in range this week"
  // 5. "Warning: 3 nighttime lows this week"
  
  // Return max 3 insights per day
  // Prioritize actionable ones
}
```

---

## **Phase 4: Mobile Optimization (Day 11-15)**

### 4.1 Progressive Web App
```typescript
// public/manifest.json
{
  "name": "GlucoLens",
  "short_name": "GlucoLens",
  "description": "See how food affects your blood sugar",
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}

// Enable:
// - Offline support for viewing data
// - Background sync for CGM data
// - Push notifications for reminders
// - Home screen installation
```

### 4.2 Mobile-First UI Requirements
```css
/* Requirements for ALL components */

1. Minimum touch target: 44x44px (Apple HIG)
2. Thumb-reachable actions at bottom
3. One-handed operation possible
4. Text size minimum: 16px
5. High contrast for outdoor use
6. Smooth 60fps scrolling
7. Instant visual feedback on taps
8. Swipe gestures for common actions
```

### 4.3 Camera Optimization
```typescript
// Critical for food photos:

1. Auto-focus on center
2. Auto-exposure adjustment
3. Guide overlay for plate positioning
4. Multiple shots → pick best
5. Compress before upload (max 1MB)
6. Show preview immediately
7. Allow retake easily
8. Work in low light
```

---

## **Phase 5: Apple Health Integration (Day 16-20)**

### 5.1 HealthKit Setup
```typescript
// lib/healthkit/setup.ts

export const healthKitConfig = {
  permissions: {
    read: [
      'HKQuantityTypeIdentifierBloodGlucose',
      'HKQuantityTypeIdentifierInsulinDelivery',
      'HKQuantityTypeIdentifierDietaryCarbohydrates',
      'HKCategoryTypeIdentifierSleepAnalysis',
      'HKQuantityTypeIdentifierActiveEnergyBurned'
    ],
    write: [
      'HKQuantityTypeIdentifierBloodGlucose',
      'HKQuantityTypeIdentifierDietaryCarbohydrates',
      'HKQuantityTypeIdentifierDietaryProtein',
      'HKQuantityTypeIdentifierDietaryFatTotal'
    ]
  },
  
  syncInterval: 15 * 60 * 1000, // 15 minutes
  
  dataPoints: {
    glucose: {
      unit: 'mg/dL',
      identifier: 'HKQuantityTypeIdentifierBloodGlucose'
    },
    carbs: {
      unit: 'g',
      identifier: 'HKQuantityTypeIdentifierDietaryCarbohydrates'
    }
  }
}

// Two-way sync:
// 1. READ glucose from HealthKit → Our database
// 2. WRITE food nutrition → HealthKit
// 3. Handle conflicts (HealthKit = source of truth for glucose)
```

### 5.2 Match Apple Health UI Patterns
```typescript
// Follow Apple Health patterns but improve:

// Their UI:
// - Manual entry requires 5 taps
// - No photo logging
// - No predictions

// Our UI:
// - 2 taps max for glucose entry
// - Photo-first for food
// - Predictions on main screen
// - But FEEL familiar to Apple Health users
```

---

## **CRITICAL: File Cleanup List**

### **Files to DELETE:**

```bash
# Complete list of files to remove:

# Old feature directories
apps/web/src/app/(authenticated)/vault/
apps/web/src/app/(authenticated)/chat/
apps/web/src/app/(authenticated)/packs/
apps/web/src/app/(authenticated)/explain/
apps/web/src/app/(authenticated)/track/  # Rebuild simpler version

# Old API routes
apps/web/src/app/api/chat/
apps/web/src/app/api/documents/
apps/web/src/app/api/explain/
apps/web/src/app/api/extract/
apps/web/src/app/api/ocr/
apps/web/src/app/api/share-packs/
apps/web/src/app/api/shares/
apps/web/src/app/api/upload-document/

# Old components
apps/web/src/components/chat/
apps/web/src/components/documents/
apps/web/src/components/explain/
apps/web/src/components/packs/
apps/web/src/components/share/
apps/web/src/components/vault/

# Old lib functions  
apps/web/src/lib/document-processing/
apps/web/src/lib/fhir/
apps/web/src/lib/medical/
apps/web/src/lib/ocr/
apps/web/src/lib/rag/
apps/web/src/lib/share/

# Documentation (keep for reference but mark as DEPRECATED)
docs/project-description.md  # Mark as OLD
docs/APPOINTMENT_PACK_SHARING.md  # DELETE
docs/DEPLOYMENT_CHECKLIST.md  # Keep but update
```

### **Files to RENAME:**

```bash
# Rebrand everything
apps/web/src/app/layout.tsx  # Update title to "GlucoLens"
apps/web/package.json  # name: "glucolens"
apps/web/public/manifest.json  # Update all references
README.md  # Complete rewrite
```

### **Files to KEEP & OPTIMIZE:**

```bash
# Keep these but optimize:
apps/web/src/app/api/metabolic/  # This is our core now
apps/web/src/lib/food-analysis-gemini.ts  # Core feature
apps/web/src/lib/ml/  # Prediction engine
apps/web/src/lib/supabase/  # Database
apps/web/src/lib/auth/  # Authentication
```

---

## **New File Structure (After Cleanup):**

```
apps/web/src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── auth/                    # Login/signup
│   ├── onboarding/              # New user flow
│   ├── dashboard/               # Main app
│   │   ├── page.tsx            # Today view
│   │   ├── log/page.tsx        # Food camera
│   │   ├── glucose/page.tsx    # Manual entry
│   │   ├── insights/page.tsx   # Patterns
│   │   └── settings/page.tsx   # Preferences
│   └── api/
│       ├── food/               # Food CRUD + analysis
│       ├── glucose/            # Glucose CRUD
│       ├── predictions/        # ML predictions  
│       ├── insights/           # Analytics
│       └── sync/               # External integrations
├── components/
│   ├── glucose/                # Glucose UI components
│   ├── food/                   # Food/camera components
│   ├── charts/                 # Visualizations
│   ├── insights/               # Insight cards
│   └── ui/                     # Shared UI kit
└── lib/
    ├── ml/                     # Prediction engine
    ├── food/                   # Food analysis
    ├── glucose/                # Glucose logic
    ├── sync/                   # HealthKit/CGM
    └── db/                     # Database helpers
```

---

## **Deployment Strategy:**

### **Day 1-5: Local Development**
```bash
# Work entirely local
# Break nothing in production
# Test with your own CGM data
```

### **Day 6-10: Staging Testing**
```bash
# Deploy to staging.glucolens.ai
# Test with 5-10 beta users
# Iterate quickly on feedback
```

### **Day 11-15: Production Launch**
```bash
# Launch at glucolens.ai
# Soft launch to diabetes communities
# Monitor metrics closely
```

---

## **Success Metrics:**

### **Technical Metrics:**
- [ ] Food analysis < 3 seconds
- [ ] Glucose entry < 2 taps
- [ ] Page load < 1 second
- [ ] Offline support working
- [ ] PWA installable

### **User Metrics:**
- [ ] 50% of users log food daily
- [ ] 70% check predictions
- [ ] 80% sync with CGM/HealthKit
- [ ] 60% retention at day 7
- [ ] 40% retention at day 30

### **Business Metrics:**
- [ ] 100 users in week 1
- [ ] 500 users in month 1
- [ ] 10% convert to premium
- [ ] $10-30/month pricing works
- [ ] 5% monthly churn

---

## **IMPORTANT NOTES FOR CLAUDE CODE:**

1. **BE RUTHLESS WITH DELETION** - If it's not about food or glucose, delete it
2. **MOBILE FIRST** - Every component must work on iPhone SE (375px)
3. **SPEED OBSESSION** - Every interaction must feel instant
4. **SIMPLICITY** - If it takes more than 2 taps, redesign it
5. **FOCUS** - We do ONE thing: correlate food with glucose

---

## **Domain & Branding:**

Check and register these domains:
- glucolens.ai / .com / .app
- sugarsight.ai / .com / .app  
- carbiq.ai / .com / .app
- glucotrack.ai / .com / .app

**Brand Guidelines:**
- Primary color: Blue (#3B82F6)
- Accent: Green for good glucose (#10B981)
- Warning: Amber for high (#F59E0B)
- Danger: Red for low/very high (#EF4444)
- Font: Inter or SF Pro
- Logo: Simple lens/eye + glucose molecule

---

## **Questions to Ask Yourself During Implementation:**

Before adding ANY feature, ask:
1. Does this help users understand food → glucose correlation?
2. Can a diabetic use this one-handed while eating?
3. Does this work offline?
4. Is this faster than doing it manually?
5. Would I pay $20/month for this?

If any answer is NO, don't build it.

---

**END OF BRIEFING**

Execute this pivot with extreme focus. The market opportunity is massive, the technical foundation is solid, and the competition is vulnerable. This is our window. Ship fast, iterate faster.
