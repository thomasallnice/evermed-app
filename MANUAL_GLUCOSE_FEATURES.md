# Manual Glucose User Features Implementation

**Created:** October 28, 2025
**Status:** In Progress
**Goal:** Support hybrid approach - build for manual users, market to CGM users

---

## ✅ Feature 1: Smart Post-Meal Glucose Reminders (COMPLETE)

**Implementation:**
- ✅ Created `/mobile/src/services/notifications.ts`
- ✅ Expo Notifications library installed
- ✅ Permission request flow
- ✅ Configurable reminder delay (60-180 min, default 90 min)
- ✅ Scheduled notifications after meal logged
- ✅ Notification tap → navigate to glucose entry
- ✅ Completion tracking for analytics

**Files Created:**
- `mobile/src/services/notifications.ts` (235 lines)
- Updated `mobile/app.json` with notification config

**Key Functions:**
```typescript
scheduleGlucoseReminder(mealType, mealTime) // Auto-schedule after meal
setReminderDelay(minutes) // User preference 60-180 min
addNotificationResponseListener(callback) // Handle notification taps
```

**Next Integration Steps:**
1. Call `scheduleGlucoseReminder()` after meal is logged in food upload flow
2. Add reminder settings to Profile screen
3. Hook up notification tap → navigate to Glucose screen

---

## ✅ Feature 2: Camera OCR for Glucometer (COMPLETE)

**Goal:** Photo glucometer screen → auto-fill glucose reading

**Implementation:**
- ✅ Created `/mobile/src/services/glucometer-ocr.ts`
- ✅ Google Vision API integration
- ✅ Pattern matching for multiple formats:
  - Explicit mg/dL: "120 mg/dL"
  - Labeled readings: "BG: 120", "Glucose: 145"
  - Standalone numbers: "120"
  - mmol/L conversion: "6.7 mmol/L" → 121 mg/dL
- ✅ Validation for physiological range (20-600 mg/dL)
- ✅ Base64 image conversion
- ✅ Comprehensive error handling

**Files Created:**
- `mobile/src/services/glucometer-ocr.ts` (252 lines)
- Updated `mobile/app.json` with `googleVisionApiKey` config

**Key Functions:**
```typescript
scanGlucometerScreen(imageUri) // Returns { value, confidence, detectedText, error }
extractGlucoseValue(text) // Pattern matching for glucose values
convertImageToBase64(imageUri) // Image preprocessing
performOCR(base64Image) // Google Vision API call
```

**Next Integration Steps:**
1. Add Google Vision API key to `app.json` (currently placeholder)
2. Add "Scan Glucometer" button to manual glucose entry screen
3. Integrate camera/photo picker UI
4. Display detected value with confirmation dialog
5. Test with real glucometer screens

**Setup Required:**
- Create Google Cloud project
- Enable Vision API
- Create API key with Vision API access
- Add to `app.json`: `"googleVisionApiKey": "YOUR_API_KEY"`

---

## 📊 Feature 3: Early Pattern Detection (5-7 meals) (PENDING)

**Goal:** Show actionable insights after just 5-7 meal tests

**Algorithm Design:**
```typescript
interface EarlyPattern {
  food: string // "Oatmeal"
  avgSpike: number // +80 mg/dL
  occurrences: number // Tested 2 times
  confidence: 'low' | 'medium' | 'high' // Based on sample size
  recommendation: string // "Try protein instead"
}

// Detection rules:
// - Spike >50 mg/dL from baseline = "High spike"
// - Spike 30-50 mg/dL = "Moderate spike"
// - Spike <30 mg/dL = "Stable"

// Show after:
// - Minimum 5 meal-glucose pairs
// - At least 2 occurrences of same meal
```

**UI Design:**
```
┌──────────────────────────────────────┐
│ 🎯 Early Insights (5 meals tested)  │
├──────────────────────────────────────┤
│ ⚠️  Bread spiked you +80 mg/dL       │
│    Tested 2x → Avoid for now         │
│                                      │
│ ✅ Eggs kept you stable              │
│    Tested 2x → Safe choice           │
│                                      │
│ 📊 Need 2 more tests to confirm...  │
└──────────────────────────────────────┘
```

**Implementation Files:**
- `mobile/src/services/pattern-detection.ts`
- `mobile/src/components/EarlyInsightCard.tsx`
- Update Dashboard screen with early insights section

**Estimated Effort:** 6-8 hours
**Priority:** Critical (early win required for retention)

---

## 📈 Feature 4: Test Strip Usage Tracking (PENDING)

**Goal:** Gamification + cost awareness

**Data to Track:**
```typescript
interface TestStripStats {
  today: number // Tests today
  thisWeek: number // Tests this week
  streak: number // Consecutive days with 3+ tests
  averagePerDay: number // Rolling 7-day average
  totalCost: number // Optional: track cost if user enters strip price
}
```

**UI Locations:**
1. **Profile Screen Header:**
   ```
   Today: 4 tests ✅
   Streak: 7 days 🔥
   ```

2. **Weekly Summary:**
   ```
   ┌─────────────────────────────────┐
   │ This Week                       │
   ├─────────────────────────────────┤
   │ Tests: 23                       │
   │ Daily Avg: 3.3                  │
   │ Post-meal: 18 (78%)             │
   │ Fasting: 5 (22%)                │
   └─────────────────────────────────┘
   ```

**Implementation:**
- Store test count in AsyncStorage (local)
- Increment on each glucose reading created
- Reset daily/weekly counters automatically
- Achievement notifications: "7 day streak! 🎉"

**Estimated Effort:** 3-4 hours
**Priority:** Medium (motivational, not critical)

---

## 🍽️ Feature 5: Meal Templates & Favorites (PENDING)

**Goal:** Reduce logging friction for repeated meals

**Data Model:**
```typescript
interface MealTemplate {
  id: string
  name: string // "Usual Breakfast"
  description?: string // "2 eggs, toast, coffee"
  photoUri?: string // Optional reference photo
  nutrition: {
    calories: number
    carbs: number
    protein: number
    fat: number
  }
  ingredients: Array<{
    name: string
    quantity: string
  }>
  timesLogged: number // Usage tracking
  lastUsed: Date
  avgGlucoseSpike?: number // Auto-calculated from past tests
}
```

**User Flow:**
1. User logs meal with photo → AI analyzes
2. After saving, prompt: "Save as template? Name it:"
3. User saves as "Usual Breakfast"
4. Next time: One tap → "Log Usual Breakfast"
5. App prompts: "Test this meal again to confirm glucose response"

**UI Components:**
- Meal template selector (quick access buttons)
- "Save as Template" button after meal logged
- Template library screen
- "Test Again" prompt for meals with <3 tests

**Backend API:**
```
POST /api/metabolic/meal-templates
GET /api/metabolic/meal-templates
PATCH /api/metabolic/meal-templates/:id
DELETE /api/metabolic/meal-templates/:id
```

**Database Schema:**
```sql
-- Add to schema.prisma
model MealTemplate {
  id          String   @id @default(cuid())
  personId    String
  name        String
  description String?
  photoUrl    String?
  nutrition   Json
  ingredients Json
  timesLogged Int      @default(0)
  lastUsed    DateTime @default(now())
  createdAt   DateTime @default(now())

  person      Person   @relation(fields: [personId], references: [id])

  @@index([personId])
}
```

**Estimated Effort:** 8-10 hours (backend + frontend)
**Priority:** High (critical for manual user retention)

---

## 📱 Integration Points

### Where to Call These Features:

**1. Food Upload Flow** (`mobile/src/screens/food/FoodUploadScreen.tsx`):
```typescript
// After meal is successfully logged:
const mealTime = new Date(foodEntry.eatenAt)
const notificationId = await scheduleGlucoseReminder(mealType, mealTime)

// Save notificationId with food entry for tracking
```

**2. Manual Glucose Entry** (`mobile/src/screens/glucose/GlucoseEntryScreen.tsx`):
```typescript
// Add "Scan Glucometer" button
<Button onPress={scanGlucometerScreen}>
  📷 Scan Glucometer
</Button>

// When value detected, auto-fill:
setGlucoseValue(scannedValue)
```

**3. Profile Screen** (`mobile/src/screens/profile/ProfileScreen.tsx`):
```typescript
// Add test strip stats section
<TestStripStats
  today={todayCount}
  streak={streakDays}
  thisWeek={weekCount}
/>

// Add reminder settings
<ReminderSettings
  currentDelay={reminderDelay}
  onChange={setReminderDelay}
/>
```

**4. Dashboard Screen** (`mobile/src/screens/dashboard/DashboardScreen.tsx`):
```typescript
// Show early insights after 5 meals
{mealCount >= 5 && (
  <EarlyInsightsCard patterns={detectedPatterns} />
)}

// Meal template quick access
<MealTemplateSelector templates={savedTemplates} />
```

---

## 🎯 Success Metrics

**Week 1 (Feature Adoption):**
- 70%+ users enable glucose reminders
- 40%+ users test glucose after reminder
- 20%+ users use glucometer OCR

**Week 2 (Pattern Detection):**
- 50%+ users reach 5 meal-glucose pairs
- 30%+ users see early insights
- 20%+ users save meal templates

**Week 4 (Retention):**
- 35%+ users still testing 3+ times/day
- 25%+ users have 7-day streak
- 40%+ users using meal templates regularly

**Failure Indicators:**
- <10% users enable reminders → Feature not discoverable
- <20% users reach 5 tests → Too much friction
- <15% retention at week 4 → Value not realized

---

## 🚀 Deployment Strategy

### Phase 1: Core Reminders (This Week)
- ✅ Notification service
- Integrate into food upload flow
- Add reminder settings to profile
- Deploy to TestFlight

### Phase 2: OCR + Tracking (Week 2)
- Glucometer OCR feature
- Test strip usage stats
- Weekly summary screen
- Deploy to TestFlight

### Phase 3: Intelligence (Week 3)
- Early pattern detection
- Meal templates system
- Recommendations engine
- Deploy to production

### Phase 4: Optimization (Week 4)
- A/B test reminder timing
- Optimize OCR accuracy
- Refine pattern thresholds
- Monitor retention metrics

---

## 📝 Next Immediate Actions

1. ✅ **Commit notification service code**
2. **Integrate reminders into food upload flow**
3. **Add reminder settings to Profile screen**
4. **Test notification scheduling locally**
5. **Start glucometer OCR implementation**

---

## 💡 Product Strategy Notes

**Marketing:** Target CGM users exclusively
**Building:** Support manual users as fallback
**Retention:** CGM users 60-70%, manual users 30-40%
**Pricing:** Same for both (CGM data = premium experience)

**Why Hybrid Works:**
- Larger addressable market (CGM + manual)
- Upsell path: manual → CGM (show value first)
- Reduces risk of narrow targeting
- Minimal incremental development cost

**Key Insight:** Manual users who stick are HIGHLY motivated (painful testing = strong commitment signal)
