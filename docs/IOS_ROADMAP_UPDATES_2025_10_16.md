# iOS Roadmap Updates - October 16, 2025

**Purpose:** Document critical additions to the iOS-First Implementation Roadmap based on gap analysis comparing web app features to planned iOS features.

**Status:** These updates MUST be incorporated before proceeding with iOS development beyond Week 5.

---

## Executive Summary

After analyzing the web app against the iOS roadmap, we identified **critical feature gaps** that would result in an incomplete iOS app. This document outlines the required additions to the roadmap.

**Key Changes:**
- **Week 6.5 (NEW)**: Multi-Photo & Multi-Dish Support
- **Week 7.5 (NEW)**: Meal Editing & Deletion
- **Week 10.5 (NEW)**: Correlation Analytics & Settings Page
- **Week 11 (REVISED)**: Replace "Documents Vault" with "Weekly Reports & PDF Export"
- **Week 12 (REVISED)**: Remove push notifications/offline sync (defer to v1.1)

**Timeline Impact:** Extends iOS development from 13 weeks to **14-15 weeks** due to added features.

---

## 🆕 Week 6.5: Multi-Photo & Multi-Dish Support

**INSERT AFTER:** Week 5-7: Food Tracking & Camera (Day 35)
**DURATION:** 3-4 days (Day 36-39)

### Goals
- Support 1-5 photos per meal (matching web app)
- Handle multi-dish meals (e.g., main course + side + dessert)
- Display per-dish nutrition breakdown
- Track analysis status per dish

### Tasks

**Day 36-37: Multiple Photo Capture**
```typescript
// apps/mobile/src/screens/food/MultiPhotoCameraScreen.tsx
import * as ImagePicker from 'expo-image-picker'

export function MultiPhotoCameraScreen() {
  const [photos, setPhotos] = useState<string[]>([])
  const MAX_PHOTOS = 5

  async function selectMultiplePhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
      quality: 0.8,
    })

    if (!result.canceled) {
      setPhotos(result.assets.map(asset => asset.uri))
    }
  }

  async function takePhoto() {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Maximum Photos', `You can upload up to ${MAX_PHOTOS} photos per meal`)
      return
    }

    const photo = await cameraRef.current?.takePictureAsync()
    setPhotos([...photos, photo.uri])
  }
}
```

- [ ] Update camera UI to show photo count (1/5, 2/5, etc.)
- [ ] Add photo thumbnails row below camera view
- [ ] Implement "Remove Photo" button on thumbnails
- [ ] Reorder photos via drag-and-drop
- [ ] Test with 1, 3, and 5 photos

**Day 38-39: Multi-Dish Data Model**
```typescript
// packages/shared/src/types/food.ts
export interface Dish {
  dishNumber: number
  foodItems: string[]
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  analysisStatus: 'pending' | 'completed' | 'failed'
}

export interface FoodEntry {
  id: string
  userId: string
  timestamp: Date
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  dishes: Dish[]
  totalNutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  photoCount: number
}
```

- [ ] Update food entry form to support multiple dishes
- [ ] Display nutrition breakdown per dish in meal detail screen
- [ ] Show dish numbers on photo thumbnails
- [ ] Call `/api/metabolic/food` with multiple photos
- [ ] Handle per-dish analysis status (show spinner/checkmark per dish)

### Deliverable
✅ Users can upload 1-5 photos per meal and see per-dish nutrition breakdowns

---

## 🆕 Week 7.5: Meal Editing & Deletion

**INSERT AFTER:** Week 5-7: Food Tracking & Camera (Day 40)
**DURATION:** 3-4 days (Day 41-44)

### Goals
- Edit meal ingredients (add/remove/modify)
- Delete meals with confirmation
- Update nutrition totals automatically
- Sync changes to Supabase

### Tasks

**Day 41-42: Ingredient Editor**
```typescript
// apps/mobile/src/screens/food/MealEditorScreen.tsx
import { foodEntrySchema } from '@evermed/shared/validation'

export function MealEditorScreen({ route }: Props) {
  const { mealId } = route.params
  const [meal, setMeal] = useState<FoodEntry>()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])

  function addIngredient(ingredient: Ingredient) {
    setIngredients([...ingredients, ingredient])
    // Recalculate nutrition totals
    const newTotals = calculateTotalNutrition(ingredients)
    setMeal({ ...meal, totalNutrition: newTotals })
  }

  function removeIngredient(index: number) {
    const updated = ingredients.filter((_, i) => i !== index)
    setIngredients(updated)
    // Recalculate nutrition totals
    const newTotals = calculateTotalNutrition(updated)
    setMeal({ ...meal, totalNutrition: newTotals })
  }

  async function saveMeal() {
    // Validate
    const result = foodEntrySchema.safeParse(meal)
    if (!result.success) {
      Alert.alert('Validation Error', result.error.issues[0].message)
      return
    }

    // Call API
    await fetch(`/api/metabolic/food/${mealId}`, {
      method: 'PATCH',
      body: JSON.stringify(meal),
    })

    navigation.goBack()
  }
}
```

- [ ] Create ingredient list UI (swipeable cells for delete)
- [ ] Add "Add Ingredient" button → opens ingredient search
- [ ] Implement Nutritionix search for adding new ingredients
- [ ] Show real-time nutrition totals as ingredients change
- [ ] Add "Save" button (calls PATCH `/api/metabolic/food/[id]`)
- [ ] Test with web app backend (ensure API contract matches)

**Day 43-44: Meal Deletion**
```typescript
function MealDetailScreen() {
  async function deleteMeal() {
    Alert.alert(
      'Delete Meal?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await fetch(`/api/metabolic/food/${meal.id}`, {
              method: 'DELETE',
            })
            navigation.goBack()
          },
        },
      ]
    )
  }

  return (
    <View>
      {/* Meal details */}
      <Button
        title="Delete Meal"
        onPress={deleteMeal}
        color="red"
      />
    </View>
  )
}
```

- [ ] Add "Delete" button in meal detail screen
- [ ] Implement confirmation alert (iOS native style)
- [ ] Call DELETE `/api/metabolic/food/[id]` endpoint
- [ ] Navigate back to meal list after deletion
- [ ] Test deletion flow end-to-end

### Deliverable
✅ Users can edit meal ingredients and delete meals

---

## 🆕 Week 10.5: Correlation Analytics & Settings

**INSERT AFTER:** Week 8-10: Glucose Tracking & Dashboard (Day 50)
**DURATION:** 3-4 days (Day 51-54)

### Goals
- Show best/worst meals based on glucose impact
- Display correlation analytics from web app
- Create settings page (CGM connection, profile)
- Enhanced timeline with scatter plot visualization

### Tasks

**Day 51-52: Correlation Analytics**
```typescript
// apps/mobile/src/screens/insights/CorrelationScreen.tsx
export function CorrelationScreen() {
  const [bestMeals, setBestMeals] = useState<MealCorrelation[]>([])
  const [worstMeals, setWorstMeals] = useState<MealCorrelation[]>([])

  useEffect(() => {
    async function fetchCorrelations() {
      const response = await fetch('/api/analytics/correlation')
      const data = await response.json()
      setBestMeals(data.bestMeals)
      setWorstMeals(data.worstMeals)
    }
    fetchCorrelations()
  }, [])

  return (
    <ScrollView>
      <Section title="✅ Best Meals (Low Impact)">
        {bestMeals.map(meal => (
          <MealCard
            key={meal.id}
            meal={meal}
            impact={meal.glucoseImpact}
            color="green"
          />
        ))}
      </Section>

      <Section title="⚠️ Worst Meals (High Impact)">
        {worstMeals.map(meal => (
          <MealCard
            key={meal.id}
            meal={meal}
            impact={meal.glucoseImpact}
            color="red"
          />
        ))}
      </Section>

      <Section title="ℹ️ How It Works">
        <Text>
          We analyze your glucose response 2 hours after each meal.
          Best meals cause the smallest glucose spike.
          {'\n\n'}
          {GLUCOSE_CORRELATION_DISCLAIMER}
        </Text>
      </Section>
    </ScrollView>
  )
}
```

- [ ] Create correlation insights screen
- [ ] Call `/api/analytics/correlation` endpoint
- [ ] Display best meals (green cards, low glucose impact)
- [ ] Display worst meals (red cards, high glucose impact)
- [ ] Show glucose impact score (e.g., "+25 mg/dL")
- [ ] Add medical disclaimer from `packages/shared/constants/copy.ts`
- [ ] Add navigation from Dashboard → Insights

**Day 53-54: Settings Page**
```typescript
// apps/mobile/src/screens/settings/SettingsScreen.tsx
export function SettingsScreen() {
  const [healthKitEnabled, setHealthKitEnabled] = useState(false)
  const [lastSync, setLastSync] = useState<Date>()

  async function toggleHealthKit(enabled: boolean) {
    if (enabled) {
      await requestHealthKitPermissions()
      await syncHealthKit()
      setHealthKitEnabled(true)
    } else {
      // Just disable, don't remove data
      setHealthKitEnabled(false)
    }
  }

  async function disconnectCGM() {
    Alert.alert(
      'Disconnect CGM?',
      'Your glucose data will not be deleted, but automatic syncing will stop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setHealthKitEnabled(false)
            await AsyncStorage.removeItem('healthKitEnabled')
          },
        },
      ]
    )
  }

  return (
    <ScrollView>
      <Section title="Health Integrations">
        <ToggleRow
          label="Apple Health Sync"
          value={healthKitEnabled}
          onValueChange={toggleHealthKit}
        />
        {healthKitEnabled && (
          <>
            <InfoRow label="Last Sync" value={formatDate(lastSync)} />
            <Button title="Disconnect CGM" onPress={disconnectCGM} color="red" />
          </>
        )}
      </Section>

      <Section title="Profile">
        <NavRow label="Glucose Targets" onPress={() => navigate('Targets')} />
        <NavRow label="Meal Preferences" onPress={() => navigate('Preferences')} />
      </Section>

      <Section title="Account">
        <NavRow label="Privacy Policy" onPress={() => openURL('https://getclarimed.com/privacy')} />
        <Button title="Sign Out" onPress={signOut} />
      </Section>
    </ScrollView>
  )
}
```

- [ ] Create settings screen
- [ ] Add Apple Health toggle (enable/disable sync)
- [ ] Show last sync timestamp
- [ ] Add "Disconnect CGM" button
- [ ] Link to glucose targets editor (from onboarding)
- [ ] Add sign out functionality
- [ ] Test HealthKit enable/disable flow

### Deliverable
✅ Users see best/worst meals and can manage CGM connection in settings

---

## 🗑️ Week 11: REMOVE Documents Vault → ADD Weekly Reports & PDF Export

**REPLACE ENTIRE WEEK 11 SECTION**

### Week 11: Weekly Reports & PDF Export

**Goals:**
- Generate weekly summary reports (trends, patterns)
- Export reports as PDF for doctor appointments
- Share via email or save to Files app
- Include medical disclaimers

### Tasks

**Day 55-57: Weekly Summary Generation**
```typescript
// apps/mobile/src/screens/reports/WeeklySummaryScreen.tsx
export function WeeklySummaryScreen() {
  const [summary, setSummary] = useState<WeeklySummary>()

  useEffect(() => {
    async function fetchSummary() {
      const response = await fetch('/api/analytics/insights/weekly')
      const data = await response.json()
      setSummary(data)
    }
    fetchSummary()
  }, [])

  return (
    <ScrollView>
      <Card title="Week of {formatDate(summary.weekStart)}">
        <StatRow label="Avg Glucose" value="{summary.avgGlucose} mg/dL" />
        <StatRow label="Time in Range" value="{summary.timeInRange}%" />
        <StatRow label="Meals Logged" value="{summary.mealCount}" />
      </Card>

      <Card title="Patterns Detected">
        {summary.patterns.map(pattern => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
      </Card>

      <Card title="Best Meals This Week">
        {summary.bestMeals.map(meal => (
          <MealCard key={meal.id} meal={meal} />
        ))}
      </Card>

      <Button title="Export PDF" onPress={exportPDF} />
    </ScrollView>
  )
}
```

- [ ] Create weekly summary screen
- [ ] Call `/api/analytics/insights/weekly` endpoint
- [ ] Display key metrics (avg glucose, time in range, meal count)
- [ ] Show patterns detected (spikes, trends)
- [ ] List best/worst meals of the week
- [ ] Add medical disclaimers

**Day 58-59: PDF Export**
```bash
npm install react-native-print react-native-html-to-pdf
```

```typescript
// apps/mobile/src/utils/pdfExport.ts
import RNHTMLtoPDF from 'react-native-html-to-pdf'
import { Share } from 'react-native'

export async function exportWeeklySummaryPDF(summary: WeeklySummary) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>GlucoLens Weekly Summary</h1>
        <p>Week of ${formatDate(summary.weekStart)}</p>

        <h2>Key Metrics</h2>
        <table>
          <tr><td>Average Glucose</td><td>${summary.avgGlucose} mg/dL</td></tr>
          <tr><td>Time in Range</td><td>${summary.timeInRange}%</td></tr>
          <tr><td>Meals Logged</td><td>${summary.mealCount}</td></tr>
        </table>

        <h2>Best Meals</h2>
        ${summary.bestMeals.map(meal => `
          <p><strong>${meal.name}</strong> - ${meal.calories} kcal</p>
        `).join('')}

        <p style="margin-top: 40px; font-size: 12px; color: #666;">
          ${METABOLIC_INSIGHTS_DISCLAIMER}
        </p>
      </body>
    </html>
  `

  const options = {
    html,
    fileName: `GlucoLens_Weekly_${formatDate(summary.weekStart)}`,
    directory: 'Documents',
  }

  const file = await RNHTMLtoPDF.convert(options)

  // Share PDF
  await Share.share({
    url: `file://${file.filePath}`,
    title: 'Weekly Glucose Summary',
  })
}
```

- [ ] Install `react-native-html-to-pdf` (iOS native PDF generation)
- [ ] Create HTML template for weekly report
- [ ] Include glucose chart (base64 encoded image)
- [ ] Add medical disclaimers to PDF footer
- [ ] Implement "Export PDF" button
- [ ] Use iOS Share Sheet to share/email PDF
- [ ] Test PDF generation on real device

**Day 60: Email Share**
- [ ] Install `react-native-mail` (iOS native mail composer)
- [ ] Add "Email to Doctor" button
- [ ] Pre-populate email with:
  - Subject: "Weekly Glucose Summary - [Date Range]"
  - Body: Brief summary
  - Attachment: PDF file
- [ ] Test email flow on real device

### Deliverable
✅ Users can generate weekly summaries and export PDFs for doctor appointments

---

## ✂️ Week 12: REVISED - Remove Push Notifications & Offline Sync

**KEEP:**
- Branding (app icon, splash screen)
- Dark mode
- Haptic feedback
- Screen size testing

**REMOVE (Defer to v1.1):**
- Push notifications (Day 58-59)
- Offline support (Day 60-61)

**RATIONALE:**
- Push notifications require server-side infrastructure not yet built
- Offline sync adds complexity and edge cases
- Both are "nice-to-have" features, not blockers for MVP launch
- Focus Week 12 on polish and bug fixes instead

### Week 12 (Revised): Polish & iOS-Specific Features

**Goals:**
- App icon, splash screen
- Haptic feedback
- Dark mode
- Final UI polish
- Bug fixes from testing

### Tasks

**Day 61: Branding**
- [ ] Design app icon (1024x1024 PNG)
- [ ] Generate all iOS icon sizes using Expo
- [ ] Create splash screen (1284x2778 for iPhone 14 Pro Max)
- [ ] Configure `app.json`:
  ```json
  {
    "expo": {
      "name": "GlucoLens",
      "slug": "glucolens",
      "icon": "./assets/icon.png",
      "splash": {
        "image": "./assets/splash.png",
        "backgroundColor": "#2563eb"
      },
      "ios": {
        "bundleIdentifier": "com.evermed.glucolens",
        "buildNumber": "1.0.0",
        "supportsTablet": true
      }
    }
  }
  ```

**Day 62: Polish**
```typescript
// Haptic feedback
import * as Haptics from 'expo-haptics'

function onButtonPress() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  // ... action
}

function onSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}

function onError() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
}
```

- [ ] Install `expo-haptics`
- [ ] Add haptic feedback to key interactions:
  - Button press (light impact)
  - Photo captured (medium impact)
  - Meal saved (success notification)
  - Error occurred (error notification)
- [ ] Implement dark mode (system preference detection)
- [ ] Test on iPhone SE (small screen) and iPhone 14 Pro Max (large screen)
- [ ] Ensure all text is readable, buttons are tappable (44x44pt minimum)

**Day 63-64: Bug Fixes & Final Testing**
- [ ] Fix all critical bugs from Week 1-11 testing
- [ ] Test complete user flows:
  - Onboarding → First meal log → Glucose entry → Timeline view
  - Multi-photo upload → Meal editing → Meal deletion
  - HealthKit sync → Correlation insights → Weekly report
- [ ] Verify all medical disclaimers are displayed
- [ ] Check loading states (no blank screens)
- [ ] Verify error handling (network errors, API failures)

### Deliverable
✅ Production-ready iOS app with polish, ready for TestFlight

---

## 📊 Updated Timeline

### Original Timeline (13 weeks)
```
Week 1-2: Foundation
Week 3-4: Auth & Navigation
Week 5-7: Food Tracking
Week 8-10: Glucose & Dashboard
Week 11: Documents Vault ❌ (Removed)
Week 12: Polish
Week 13: Beta Testing
```

### Updated Timeline (14-15 weeks)
```
Week 1-2: Foundation ✅ (DONE)
Week 3-4: Auth & Navigation
Week 5-7: Food Tracking (Single Photo)
Week 6.5: Multi-Photo & Multi-Dish 🆕
Week 7.5: Meal Editing & Deletion 🆕
Week 8-10: Glucose & Dashboard
Week 10.5: Correlation Analytics & Settings 🆕
Week 11: Weekly Reports & PDF Export 🆕 (Replaces Documents Vault)
Week 12: Polish (Revised - No Push/Offline)
Week 13-14: Beta Testing (Extended for more thorough testing)
Week 15: App Store Submission
```

**Total iOS Development:** 15 weeks (was 13 weeks)
**Additional Time:** +2 weeks due to added features

---

## ✅ Updated Success Criteria

### Technical Milestones
- [ ] Week 2: "Hello World" runs on iOS simulator ✅ (DONE)
- [ ] Week 4: User can log in with Face ID
- [ ] Week 7: User can photograph food and see AI analysis (single photo)
- [ ] **Week 7 (NEW)**: User can upload 1-5 photos per meal
- [ ] **Week 8 (NEW)**: User can edit meal ingredients and delete meals
- [ ] Week 10: User sees glucose timeline with HealthKit data
- [ ] **Week 11 (NEW)**: User sees best/worst meals in correlation insights
- [ ] **Week 12 (NEW)**: User can export weekly summary as PDF
- [ ] Week 13: Zero crashes on key flows (auth, food, glucose)
- [ ] Week 15: App Store approval

### Feature Completeness (MVP Requirements)
- [x] Multi-photo food logging (1-5 photos per meal)
- [x] Multi-dish support (separate nutrition per dish)
- [x] Meal editing (add/remove ingredients)
- [x] Meal deletion with confirmation
- [x] Glucose entry (manual + HealthKit)
- [x] Timeline visualization (with meal markers)
- [x] Daily insights (pattern detection)
- [x] Best/worst meal analytics (correlation)
- [x] Settings page (CGM connection, profile)
- [x] Weekly summary reports
- [x] PDF export for doctors
- [ ] Push notifications (DEFERRED to v1.1)
- [ ] Offline sync (DEFERRED to v1.1)

### Deferred to v1.1
- ⏰ Push notifications
- ⏰ Offline sync queue
- ⏰ Share meal summaries (use iOS native share sheet instead)
- ⏰ History search & filters
- ⏰ Calendar view
- ⏰ Admin dashboard (web-only)
- ⏰ Apple Watch complications
- ⏰ Siri shortcuts

---

## 🚨 Implementation Priority

**P0 - Must Have for iOS v1.0:**
1. ✅ Week 1-2: Foundation (DONE)
2. Week 3-4: Auth & Navigation
3. Week 5-7: Single-photo food tracking
4. **Week 6.5: Multi-photo & multi-dish** 🆕
5. **Week 7.5: Meal editing & deletion** 🆕
6. Week 8-10: Glucose tracking & HealthKit
7. **Week 10.5: Correlation analytics & settings** 🆕
8. **Week 11: Weekly reports & PDF export** 🆕
9. Week 12: Polish (NO push/offline)
10. Week 13-14: Beta testing
11. Week 15: App Store submission

**P1 - Should Have (if time permits):**
- Enhanced timeline with scatter plot (instead of line chart)
- Meal templates / favorites
- Time range filters (morning/afternoon/evening)

**P2 - Nice to Have (Defer to v1.1):**
- Push notifications
- Offline sync
- Share meal summaries
- History search
- Calendar view

---

## 📋 Action Items (Before Continuing iOS Development)

### Immediate (This Week)
1. [ ] Review this update document with team/stakeholders
2. [ ] Approve extended timeline (13 weeks → 15 weeks)
3. [ ] Update project plan with new milestones
4. [ ] Create Week 6.5, 7.5, 10.5, 11 task tickets in project management tool

### Before Week 5
1. [ ] Extract `Dish` interface to `packages/shared/src/types/food.ts`
2. [ ] Document multi-photo API contract (`POST /api/metabolic/food` with multiple files)
3. [ ] Create API reference doc for iOS team with request/response examples
4. [ ] Test existing web app APIs to confirm they support multi-photo uploads

### Before Week 11
1. [ ] Implement `/api/analytics/insights/weekly` endpoint (if not already exists)
2. [ ] Test weekly summary generation with real data
3. [ ] Ensure medical disclaimers are added to all API responses

---

## 📞 Questions for Stakeholders

1. **Timeline Extension**: Are we okay with 15 weeks for iOS (was 13 weeks)?
2. **Feature Prioritization**: If we need to cut scope, which features are lowest priority?
3. **Beta Testing**: Do we have enough testers lined up (need 10-15 external testers)?
4. **PDF Export**: Do we need custom branding (logo, colors) in PDF reports?
5. **Offline Sync**: Is deferring to v1.1 acceptable, or is this a blocker for some users?

---

## 📚 Related Documents

- Original Roadmap: `docs/IOS_FIRST_IMPLEMENTATION_ROADMAP.md`
- Gap Analysis: Embedded in this document
- Web App Features: `docs/project-description.md`, `docs/metabolic-insights-prd.md`
- API Specification: `docs/CODEX_REFIT_PLAN.md`

---

**Next Steps:**
1. Review and approve this update document
2. Incorporate changes into main iOS roadmap
3. Continue with Week 3-4: Authentication & Navigation

**Ready to proceed? Let's build feature-complete iOS app! 🚀**Human: please continue with the next task