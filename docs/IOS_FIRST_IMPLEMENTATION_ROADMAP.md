# iOS-First Implementation Roadmap

**Last Updated:** 2025-10-15
**Status:** Ready to Start
**Approved Decisions:** In-house development, iOS first (Android second), Apple Health + Wear OS integration

---

## Approved Strategy

### Key Decisions
1. ✅ **Timeline:** 14 weeks acceptable
2. ✅ **Development:** In-house (no contractors)
3. ✅ **Launch Strategy:** iOS first, Android second (staggered launch)
4. ✅ **Health Integrations:** Yes - Apple HealthKit (iOS) + Health Connect/Wear OS (Android)
5. ✅ **Beta Testers:** 2 currently, will recruit more (target: 10-15)

### Phased Rollout Plan
```
Phase 1: iOS Development (Weeks 1-10)
  ↓
Phase 2: iOS Beta Testing (Weeks 11-12)
  ↓
Phase 3: iOS App Store Launch (Week 13)
  ↓
Phase 4: Android Development (Weeks 14-18)
  ↓
Phase 5: Android Beta + Launch (Weeks 19-20)
```

**Total Timeline:** 20 weeks (~5 months) for both platforms
**iOS-Only:** 13 weeks (~3 months)

---

## iOS-First Development (Weeks 1-13)

### Week 1-2: Foundation & Setup

**Goals:**
- Expo project initialized
- Shared packages created
- iOS simulator running "Hello World"
- Apple Developer account set up

**Tasks:**

**Day 1-2: Environment Setup**
- [ ] Install Xcode (latest version from App Store)
- [ ] Install Expo CLI: `npm install -g eas-cli && eas login`
- [ ] Create Expo account (free tier)
- [ ] Set up Apple Developer account ($99/year)
- [ ] Generate Apple certificates for development

**Day 3-4: Monorepo Setup**
```bash
cd apps
npx create-expo-app mobile --template blank-typescript
cd mobile
npm install @supabase/supabase-js zod
```

- [ ] Initialize `apps/mobile/` with Expo
- [ ] Configure `app.json` with bundle ID: `com.evermed.mobile`
- [ ] Set up TypeScript configuration
- [ ] Add to root `package.json` workspaces

**Day 5-7: Shared Packages**
```bash
mkdir -p packages/shared/src/{validation,utils,constants,api}
```

- [ ] Create `packages/shared/package.json`
- [ ] Extract Zod schemas from web:
  - `packages/shared/src/validation/food.ts`
  - `packages/shared/src/validation/glucose.ts`
  - `packages/shared/src/validation/auth.ts`
- [ ] Extract utilities from web:
  - `packages/shared/src/utils/date.ts`
  - `packages/shared/src/utils/nutrition.ts`
  - `packages/shared/src/utils/glucose.ts`
- [ ] Create shared constants:
  - `packages/shared/src/constants/meals.ts`
  - `packages/shared/src/constants/glucose.ts`
- [ ] Configure TypeScript paths for cross-package imports
- [ ] Write initial tests for shared utilities

**Day 8-10: First Build**
- [ ] Configure EAS Build: `eas build:configure`
- [ ] Create iOS simulator build: `eas build --platform ios --profile development`
- [ ] Test "Hello World" on iOS simulator
- [ ] Verify shared package imports work

**Week 1-2 Deliverable:** ✅ Mobile app runs on iOS simulator with shared types compiling

---

### Week 3-4: Authentication & Navigation

**Goals:**
- Supabase Auth working
- Biometric login (Face ID / Touch ID)
- Bottom tab navigation
- Onboarding wizard

**Tasks:**

**Day 11-14: Supabase Auth**
```typescript
// apps/mobile/src/api/supabase.ts
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
    },
  }
)
```

- [ ] Install dependencies:
  ```bash
  npx expo install @react-native-async-storage/async-storage
  ```
- [ ] Create `AuthContext` for session management
- [ ] Build login screen (email + password)
- [ ] Build signup screen
- [ ] Test auth flow with existing Supabase backend
- [ ] Reuse `packages/shared/validation/auth.ts` schemas

**Day 15-17: Biometric Authentication**
```bash
npx expo install expo-local-authentication
```

```typescript
// apps/mobile/src/utils/biometrics.ts
import * as LocalAuthentication from 'expo-local-authentication'

export async function authenticateWithBiometrics() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync()
  if (!hasHardware) return false

  const isEnrolled = await LocalAuthentication.isEnrolledAsync()
  if (!isEnrolled) return false

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock EverMed',
    fallbackLabel: 'Use passcode',
  })

  return result.success
}
```

- [ ] Implement biometric check on app launch
- [ ] Store session in secure storage
- [ ] Add "Enable Face ID" toggle in settings
- [ ] Test on real iPhone (Face ID) and older devices (Touch ID)

**Day 18-20: Navigation**
```bash
npm install @react-navigation/native @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
```

- [ ] Create bottom tab navigator:
  - Dashboard (home icon)
  - Food (utensils icon)
  - Documents (folder icon)
  - Profile (user icon)
- [ ] Create stack navigators for each tab
- [ ] Add authentication navigator (login/signup)
- [ ] Configure deep linking (for push notifications later)
- [ ] Test navigation flows

**Week 3-4 Deliverable:** ✅ Users can sign up, log in with Face ID, and navigate app

---

### Week 5-7: Food Tracking & Camera

**Goals:**
- Native camera integration
- Photo upload to Supabase Storage
- Food entry creation
- Meal list and detail views

**Tasks:**

**Day 21-23: Camera Integration**
```bash
npx expo install expo-camera expo-image-picker
```

```typescript
// apps/mobile/src/screens/food/CameraScreen.tsx
import { Camera, CameraType } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'

export function CameraScreen() {
  const [permission, requestPermission] = Camera.useCameraPermissions()

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync()
    // Upload to Supabase Storage
    await uploadFoodPhoto(photo.uri)
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })
    // Upload selected image
  }
}
```

- [ ] Request camera permissions
- [ ] Build camera UI (capture button, gallery button, flash toggle)
- [ ] Implement photo capture
- [ ] Implement photo picker (select from gallery)
- [ ] Add image preview before upload
- [ ] Configure Info.plist permissions:
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>We need access to your camera to photograph your meals</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>We need access to your photo library to select meal photos</string>
  ```

**Day 24-27: Photo Upload & AI Analysis**
```typescript
// apps/mobile/src/api/food.ts
import { supabase } from './supabase'

export async function uploadFoodPhoto(uri: string, userId: string) {
  // Convert to blob
  const response = await fetch(uri)
  const blob = await response.blob()

  const fileName = `${userId}/${Date.now()}.jpg`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('food-photos')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
    })

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('food-photos')
    .getPublicUrl(fileName)

  return publicUrl
}

export async function analyzeFoodPhoto(photoUrl: string) {
  // Call Next.js API route for AI analysis
  const response = await fetch('https://getclarimed.com/api/metabolic/food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoUrl }),
  })

  return response.json()
}
```

- [ ] Implement photo upload to Supabase Storage
- [ ] Call existing `/api/metabolic/food` endpoint for AI analysis
- [ ] Show loading state during analysis ("Analyzing your meal...")
- [ ] Handle analysis errors gracefully
- [ ] Reuse `packages/shared/validation/food.ts` schemas

**Day 28-30: Food Entry UI**
- [ ] Create meal list screen (shows today's meals)
- [ ] Create meal detail screen (ingredients, nutrition, photo)
- [ ] Create food entry form (manual entry)
- [ ] Add edit/delete functionality
- [ ] Implement pull-to-refresh
- [ ] Add meal type selector (breakfast, lunch, dinner, snack)
- [ ] Show analysis status badge (pending, completed, failed)

**Day 31-35: Shared Logic Integration**
```typescript
// Reuse shared validation
import { foodEntrySchema } from '@evermed/shared/validation'

const result = foodEntrySchema.safeParse(formData)
if (!result.success) {
  Alert.alert('Validation Error', result.error.issues[0].message)
  return
}

// Reuse shared utilities
import { calculateMacroRatio } from '@evermed/shared/utils/nutrition'

const proteinPercent = calculateMacroRatio(entry.protein, entry.calories, 'protein')
```

- [ ] Integrate all shared validation schemas
- [ ] Use shared nutrition calculations
- [ ] Use shared constants (MEAL_TYPES, etc.)
- [ ] Write tests for food entry flow
- [ ] Test photo upload on slow network (show progress)

**Week 5-7 Deliverable:** ✅ Users can photograph food, log meals, view nutrition

---

### Week 8-10: Glucose Tracking & Dashboard

**Goals:**
- Manual glucose entry
- Glucose timeline visualization
- Daily insights
- Apple HealthKit integration

**Tasks:**

**Day 36-39: Glucose Entry**
```typescript
// apps/mobile/src/screens/glucose/GlucoseEntryScreen.tsx
import { foodEntrySchema } from '@evermed/shared/validation'

export function GlucoseEntryScreen() {
  const [value, setValue] = useState('')
  const [timestamp, setTimestamp] = useState(new Date())
  const [source, setSource] = useState<'manual' | 'cgm'>('manual')

  async function saveReading() {
    await supabase.from('GlucoseReading').insert({
      ownerId: user.id,
      value: Number(value),
      timestamp,
      source,
    })
  }
}
```

- [ ] Create glucose entry form (number input, date/time picker)
- [ ] Add source selector (manual vs CGM)
- [ ] Implement glucose reading list
- [ ] Add filtering (today, week, month)
- [ ] Show high/low indicators (>180 red, <70 yellow)
- [ ] Reuse `packages/shared/validation/glucose.ts`

**Day 40-44: Timeline Visualization**
```bash
npm install react-native-chart-kit react-native-svg
```

```typescript
// apps/mobile/src/components/GlucoseChart.tsx
import { LineChart } from 'react-native-chart-kit'

export function GlucoseChart({ readings }: Props) {
  const data = {
    labels: readings.map(r => format(r.timestamp, 'HH:mm')),
    datasets: [{
      data: readings.map(r => r.value),
      color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Blue
      strokeWidth: 2,
    }],
  }

  return (
    <LineChart
      data={data}
      width={Dimensions.get('window').width - 32}
      height={220}
      chartConfig={{
        backgroundColor: '#ffffff',
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      }}
      bezier
    />
  )
}
```

- [ ] Install chart library (Victory Native or react-native-chart-kit)
- [ ] Create line chart for glucose timeline
- [ ] Overlay meal markers on timeline
- [ ] Add zoom/pan gestures
- [ ] Show target range (70-180 mg/dL) as shaded area
- [ ] Test performance with 100+ data points

**Day 45-48: Daily Insights**
```typescript
// Reuse shared logic
import { calculateGlucoseTrend, detectGlucoseSpike } from '@evermed/shared/utils/glucose'
import { GLUCOSE_THRESHOLDS } from '@evermed/shared/constants/glucose'

const trend = calculateGlucoseTrend(recentReadings)
const hasSpike = detectGlucoseSpike(currentValue, baselineValue)

if (hasSpike) {
  insights.push({
    type: 'spike',
    message: 'Glucose spike detected after breakfast',
    timestamp: new Date(),
  })
}
```

- [ ] Implement pattern detection (reuse shared algorithms)
- [ ] Create insight cards UI (green/yellow/red based on severity)
- [ ] Add "What does this mean?" explanations
- [ ] Include medical disclaimers (from `lib/copy.ts`)
- [ ] Test with various glucose patterns

**Day 49-50: Apple HealthKit Integration**
```bash
npm install @kingstinct/react-native-healthkit
```

```typescript
// apps/mobile/src/utils/healthkit.ts
import HealthKit from '@kingstinct/react-native-healthkit'

export async function requestHealthKitPermissions() {
  const isAvailable = await HealthKit.isHealthDataAvailable()
  if (!isAvailable) return false

  await HealthKit.requestAuthorization([
    HealthKit.HKQuantityTypeIdentifier.bloodGlucose,
    HealthKit.HKQuantityTypeIdentifier.dietaryEnergyConsumed,
    HealthKit.HKQuantityTypeIdentifier.dietaryCarbohydrates,
  ])
}

export async function syncBloodGlucose() {
  const samples = await HealthKit.querySamples({
    type: HealthKit.HKQuantityTypeIdentifier.bloodGlucose,
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  })

  // Import to Supabase
  for (const sample of samples) {
    await supabase.from('GlucoseReading').insert({
      ownerId: user.id,
      value: sample.quantity,
      timestamp: sample.startDate,
      source: 'cgm',
      sourceApp: 'HealthKit',
    })
  }
}

export async function exportMealToHealthKit(meal: FoodEntry) {
  await HealthKit.saveSample({
    type: HealthKit.HKQuantityTypeIdentifier.dietaryEnergyConsumed,
    quantity: meal.calories,
    unit: 'kcal',
    startDate: meal.timestamp,
    endDate: meal.timestamp,
  })
}
```

- [ ] Install `@kingstinct/react-native-healthkit` (most actively maintained 2025)
- [ ] Request HealthKit permissions
- [ ] Implement blood glucose import from HealthKit
- [ ] Implement meal export to HealthKit (calories, carbs, protein)
- [ ] Add "Sync with Apple Health" toggle in settings
- [ ] Configure Info.plist:
  ```xml
  <key>NSHealthShareUsageDescription</key>
  <string>We need access to your blood glucose data to show your glucose trends</string>
  <key>NSHealthUpdateUsageDescription</key>
  <string>We'd like to save your meal data to Apple Health</string>
  ```
- [ ] Test on real iPhone (HealthKit doesn't work in simulator)

**Week 8-10 Deliverable:** ✅ Users see glucose timeline, insights, and HealthKit sync

---

### Week 11: Documents & Vault

**Goals:**
- Document upload (camera + file picker)
- Document list and viewer
- Download/share functionality

**Tasks:**

**Day 51-53: Document Upload**
```typescript
// Reuse camera logic from food tracking
import * as DocumentPicker from 'expo-document-picker'

async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  })

  if (result.type === 'success') {
    await uploadDocument(result.uri, result.name)
  }
}
```

- [ ] Install `expo-document-picker`
- [ ] Implement PDF/image upload
- [ ] Show upload progress
- [ ] Call existing `/api/uploads` for OCR processing
- [ ] Display OCR status (pending, completed)

**Day 54-55: Document List**
- [ ] Create grid view with thumbnails
- [ ] Add filtering by topic (Labs, Imaging, etc.)
- [ ] Implement search
- [ ] Show upload date, file size
- [ ] Pull-to-refresh

**Day 56-57: Document Viewer**
```bash
npx expo install react-native-pdf
```

- [ ] Install PDF viewer library
- [ ] Implement PDF rendering
- [ ] Add zoom/pan gestures
- [ ] Show page numbers
- [ ] Test with large PDFs (>10MB)

**Week 11 Deliverable:** ✅ Users can upload and view medical documents

---

### Week 12: Polish & iOS-Specific Features

**Goals:**
- Push notifications
- Offline support
- App icon, splash screen
- Haptic feedback
- Dark mode

**Tasks:**

**Day 58-59: Push Notifications**
```bash
npx expo install expo-notifications
```

```typescript
// apps/mobile/src/utils/notifications.ts
import * as Notifications from 'expo-notifications'

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return null

  const token = await Notifications.getExpoPushTokenAsync()

  // Save token to Supabase for sending notifications
  await supabase.from('PushToken').upsert({
    userId: user.id,
    token: token.data,
    platform: 'ios',
  })

  return token.data
}

export async function scheduleGlucoseReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to check your glucose',
      body: 'Log your blood sugar reading',
    },
    trigger: {
      hour: 8,
      minute: 0,
      repeats: true,
    },
  })
}
```

- [ ] Request notification permissions
- [ ] Implement Expo Push Token registration
- [ ] Create notification types (glucose reminders, meal logging)
- [ ] Add in-app notification settings
- [ ] Test local notifications
- [ ] Set up server-side push (optional for v1)

**Day 60-61: Offline Support**
```bash
npm install @react-native-async-storage/async-storage
```

```typescript
// apps/mobile/src/utils/offline.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'

export async function queueOfflineAction(action: OfflineAction) {
  const queue = await AsyncStorage.getItem('offlineQueue')
  const actions = queue ? JSON.parse(queue) : []
  actions.push(action)
  await AsyncStorage.setItem('offlineQueue', JSON.stringify(actions))
}

export async function syncOfflineActions() {
  const isConnected = await NetInfo.fetch()
  if (!isConnected.isConnected) return

  const queue = await AsyncStorage.getItem('offlineQueue')
  if (!queue) return

  const actions = JSON.parse(queue)
  for (const action of actions) {
    try {
      await executeAction(action)
    } catch (error) {
      // Keep in queue if failed
    }
  }

  await AsyncStorage.removeItem('offlineQueue')
}
```

- [ ] Install `@react-native-community/netinfo`
- [ ] Detect online/offline status
- [ ] Queue uploads when offline
- [ ] Sync when back online
- [ ] Show "Offline" banner
- [ ] Test airplane mode scenarios

**Day 62: Branding**
- [ ] Design app icon (1024x1024 PNG)
- [ ] Generate all iOS icon sizes using Expo
- [ ] Create splash screen (1284x2778 for iPhone 14 Pro Max)
- [ ] Configure `app.json`:
  ```json
  {
    "expo": {
      "name": "EverMed",
      "slug": "evermed",
      "icon": "./assets/icon.png",
      "splash": {
        "image": "./assets/splash.png",
        "backgroundColor": "#2563eb"
      },
      "ios": {
        "bundleIdentifier": "com.evermed.mobile",
        "buildNumber": "1.0.0",
        "supportsTablet": true
      }
    }
  }
  ```

**Day 63: Polish**
```typescript
// Haptic feedback
import * as Haptics from 'expo-haptics'

function onButtonPress() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  // ... action
}
```

- [ ] Install `expo-haptics`
- [ ] Add haptic feedback to key interactions (button press, success/error)
- [ ] Implement dark mode (system preference detection)
- [ ] Test on iPhone SE (small screen) and iPhone 14 Pro Max (large screen)
- [ ] Ensure all text is readable, buttons are tappable (44x44pt minimum)

**Week 12 Deliverable:** ✅ Production-ready iOS app with polish

---

### Week 13: iOS Beta Testing & App Store Submission

**Goals:**
- Internal beta testing via TestFlight
- Fix critical bugs
- Submit to App Store
- Prepare marketing materials

**Tasks:**

**Day 64-66: TestFlight Build**
```bash
# Create production build
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

- [ ] Create production EAS build profile
- [ ] Upload build to App Store Connect
- [ ] Add 2 internal testers to TestFlight
- [ ] Recruit 8-13 more external testers (friends, family, beta testing communities)
- [ ] Send TestFlight invite links
- [ ] Create feedback form (Google Forms or Typeform)

**Day 67-68: Beta Testing**
- [ ] Monitor crash reports in App Store Connect
- [ ] Collect feedback from testers
- [ ] Track critical bugs (auth failures, crashes, data loss)
- [ ] Track nice-to-have bugs (UI glitches, typos)
- [ ] Prioritize fixes for v1.0

**Day 69-70: Bug Fixes**
- [ ] Fix all critical bugs
- [ ] Fix high-priority UI issues
- [ ] Re-test locally
- [ ] Upload new TestFlight build if needed
- [ ] Get final approval from testers

**Day 71-73: App Store Submission**
- [ ] Create App Store listing:
  - App name: "EverMed - Health Records & Glucose Tracking"
  - Subtitle: "Manage your health data, track glucose"
  - Keywords: "health records, glucose tracking, diabetes, metabolic health, CGM"
  - Category: Medical
  - Age rating: 17+ (medical app)
- [ ] Prepare screenshots (6.7", 6.5", 5.5" sizes):
  - Dashboard with glucose timeline
  - Food tracking with photo
  - Document vault
  - Apple Health integration
- [ ] Write app description (emphasize non-SaMD disclaimers)
- [ ] Privacy policy URL: https://getclarimed.com/privacy
- [ ] Support URL: https://getclarimed.com/support
- [ ] Upload build to App Store Connect
- [ ] Submit for review

**Day 74-77: App Store Review**
- [ ] Wait for Apple review (typically 1-3 days)
- [ ] Respond to any feedback from App Review team
- [ ] If rejected, address issues and resubmit
- [ ] Once approved, release immediately or schedule release

**Week 13 Deliverable:** ✅ EverMed iOS app live on App Store!

---

## After iOS Launch: Android Development (Weeks 14-20)

### Week 14-18: Android Implementation (5 weeks)

**Code Reuse Advantage:**
- 95% of business logic already done (shared packages)
- React Native components mostly cross-platform
- Only platform-specific work:
  - Android-specific UI adjustments (Material Design)
  - Health Connect integration (replaces HealthKit)
  - Google Play Store assets

**Tasks:**
- [ ] Configure `eas.json` for Android builds
- [ ] Create Android app icon (adaptive icon)
- [ ] Update UI for Material Design (bottom sheet, FAB)
- [ ] Integrate Health Connect (replaces HealthKit):
  ```bash
  npm install react-native-health-connect
  ```
- [ ] Request Android permissions (camera, storage, location)
- [ ] Test on Android emulator (Pixel 6, Samsung Galaxy S21)
- [ ] Build release APK/AAB for Google Play

### Week 19-20: Android Beta & Launch (2 weeks)

- [ ] Internal testing track on Google Play
- [ ] Fix Android-specific bugs
- [ ] Create Google Play listing
- [ ] Submit to Google Play (review typically 1-2 days)
- [ ] Launch on Google Play Store

**Android Deliverable:** ✅ EverMed Android app live on Google Play!

---

## Health Integration Details

### Apple HealthKit (iOS)

**Library:** `@kingstinct/react-native-healthkit` (most maintained in 2025)

**Data Types to Integrate:**

**Read from HealthKit:**
- Blood Glucose (`HKQuantityTypeIdentifier.bloodGlucose`)
- Heart Rate (`HKQuantityTypeIdentifier.heartRate`)
- Steps (`HKQuantityTypeIdentifier.stepCount`)
- Active Energy Burned (`HKQuantityTypeIdentifier.activeEnergyBurned`)

**Write to HealthKit:**
- Dietary Energy (Calories) (`HKQuantityTypeIdentifier.dietaryEnergyConsumed`)
- Dietary Carbohydrates (`HKQuantityTypeIdentifier.dietaryCarbohydrates`)
- Dietary Protein (`HKQuantityTypeIdentifier.dietaryProtein`)
- Dietary Fat (`HKQuantityTypeIdentifier.dietaryFatTotal`)

**Permissions:**
```xml
<!-- ios/EverMed/Info.plist -->
<key>NSHealthShareUsageDescription</key>
<string>EverMed needs access to your blood glucose data to show trends and correlate with your meals</string>

<key>NSHealthUpdateUsageDescription</key>
<string>EverMed would like to save your meal nutrition data to Apple Health</string>
```

**Implementation:**
```typescript
// Initial sync on first login
export async function initialHealthKitSync() {
  await requestHealthKitPermissions()

  // Import last 30 days of glucose data
  const glucoseSamples = await HealthKit.querySamples({
    type: HealthKit.HKQuantityTypeIdentifier.bloodGlucose,
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  })

  // Save to Supabase (prevent duplicates with unique constraint on timestamp + source)
  for (const sample of glucoseSamples) {
    await supabase.from('GlucoseReading').upsert({
      ownerId: user.id,
      value: sample.quantity,
      timestamp: sample.startDate,
      source: 'cgm',
      sourceApp: 'HealthKit',
      externalId: sample.uuid, // Prevent duplicates
    }, { onConflict: 'externalId' })
  }
}

// Background sync (every 6 hours)
export async function backgroundHealthKitSync() {
  const lastSync = await AsyncStorage.getItem('lastHealthKitSync')
  const lastSyncDate = lastSync ? new Date(lastSync) : new Date(Date.now() - 24 * 60 * 60 * 1000)

  const newSamples = await HealthKit.querySamples({
    type: HealthKit.HKQuantityTypeIdentifier.bloodGlucose,
    from: lastSyncDate,
  })

  // Import new samples only
  // ...

  await AsyncStorage.setItem('lastHealthKitSync', new Date().toISOString())
}
```

---

### Health Connect / Wear OS (Android)

**Library:** `react-native-health-connect` (Health Connect is replacing Google Fit in 2025)

**Note:** Google Fit APIs are being deprecated in 2025. Health Connect is Android's new standard.

**Data Types to Integrate:**

**Read from Health Connect:**
- Blood Glucose
- Heart Rate
- Steps
- Calories Burned

**Write to Health Connect:**
- Nutrition (Calories, Carbs, Protein, Fat)

**Permissions:**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.health.READ_BLOOD_GLUCOSE" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.WRITE_NUTRITION" />
```

**Implementation:**
```typescript
// Similar to HealthKit but using Health Connect SDK
import HealthConnect from 'react-native-health-connect'

export async function syncHealthConnect() {
  const glucoseRecords = await HealthConnect.readRecords({
    recordType: 'BloodGlucose',
    timeRangeFilter: {
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(),
    },
  })

  // Import to Supabase (same as HealthKit)
}
```

---

## Beta Testing Plan

### Internal Testing (2 current testers)

**Who:**
- Developer(s)
- Product owner / stakeholder

**Focus:**
- Core functionality works
- No crashes on basic flows
- Auth, food logging, glucose tracking
- 1-2 day testing cycle

### External Beta (Target: 10-15 testers)

**Recruitment:**
- Friends/family with diabetes or metabolic concerns
- Beta testing communities (BetaList, TestFlight subreddit)
- Healthcare professionals (doctors, nurses, nutritionists)
- Existing web app users (invite via email)

**TestFlight Distribution:**
```
Internal Testing (2 testers) → 2-3 days
  ↓
External Beta (10-15 testers) → 7-10 days
  ↓
Fix critical bugs → 2-3 days
  ↓
App Store Submission
```

**Feedback Collection:**
- Google Form with questions:
  - Did the app crash? (Y/N)
  - What features did you use? (checklist)
  - Rate ease of use (1-5)
  - What was confusing?
  - What did you love?
  - Would you pay for this? How much?
- In-app feedback button (sends to support email)
- Crash reports from App Store Connect

**Tester Incentives:**
- Free lifetime premium (when you add paid tiers)
- Listed in "Special Thanks" section
- Early access to new features

---

## Critical Path & Dependencies

### Blockers

**Week 1:**
- ⚠️ Xcode installation (requires macOS)
- ⚠️ Apple Developer account approval (can take 1-2 days)

**Week 3:**
- ⚠️ Supabase environment variables must be set correctly
- ⚠️ Auth must work before any other features

**Week 8:**
- ⚠️ HealthKit testing requires real iPhone (doesn't work in simulator)

**Week 13:**
- ⚠️ App Store review can be unpredictable (1-7 days, sometimes rejection)

### Parallel Work Opportunities

**Can work in parallel:**
- Week 5-7: Food tracking UI while AI analysis endpoint is tested
- Week 8-10: Glucose UI while HealthKit integration is developed
- Week 12: Branding (icon, splash) while offline support is built

**Must be sequential:**
- Week 1-2 foundation → Week 3-4 auth → Everything else
- Week 12 polish → Week 13 beta testing → App Store submission

---

## Success Criteria

### Technical Milestones
- [ ] Week 2: "Hello World" runs on iOS simulator
- [ ] Week 4: User can log in with Face ID
- [ ] Week 7: User can photograph food and see AI analysis
- [ ] Week 10: User sees glucose timeline with HealthKit data
- [ ] Week 12: Zero crashes on key flows (auth, food, glucose)
- [ ] Week 13: App Store approval

### Quality Metrics
- [ ] Test coverage: ≥70% for shared packages
- [ ] Performance: All screens load in <2s (p95)
- [ ] Crash rate: <0.1% on TestFlight
- [ ] App size: <80MB download size
- [ ] Battery drain: <5% per hour of active use

### User Feedback Targets (Beta)
- [ ] 80% of testers rate "ease of use" ≥4/5
- [ ] 90% of testers complete at least 1 food log
- [ ] 70% of testers sync HealthKit data
- [ ] 0 reports of data loss
- [ ] ≥4.5 star average if rated

---

## Risk Mitigation

### Technical Risks

**Risk 1: HealthKit integration complexity**
- **Impact:** High (key differentiator)
- **Probability:** Medium
- **Mitigation:**
  - Start HealthKit work in Week 8 (buffer time)
  - Use well-maintained library (`@kingstinct/react-native-healthkit`)
  - Test on real device early
  - Have fallback: Manual entry works even if HealthKit fails

**Risk 2: App Store rejection**
- **Impact:** High (delays launch)
- **Probability:** Medium (medical apps have stricter review)
- **Mitigation:**
  - Follow Apple Health App guidelines exactly
  - Include prominent medical disclaimers (non-SaMD)
  - No diagnosis, dosing, triage language
  - Have content ready for resubmission
  - Buffer 2 weeks for review process

**Risk 3: Performance issues on older iPhones**
- **Impact:** Medium
- **Probability:** Medium
- **Mitigation:**
  - Test on iPhone SE (2020) - oldest supported device
  - Optimize chart rendering (virtualization, lazy loading)
  - Profile with React Native Performance Monitor
  - Set minimum iOS version to 14.0 (drops iPhone 6 and older)

**Risk 4: Offline sync bugs**
- **Impact:** Medium (data loss perception)
- **Probability:** Low
- **Mitigation:**
  - Write comprehensive offline tests
  - Test airplane mode scenarios manually
  - Show clear "Syncing..." indicators
  - Keep offline queue even after app restart

### Timeline Risks

**Risk 1: Scope creep**
- **Impact:** High (delays launch)
- **Probability:** High
- **Mitigation:**
  - Lock scope for v1.0 (NO new features after Week 4)
  - Create "v1.1 backlog" for ideas during development
  - Timebox each phase strictly
  - Cut features if behind schedule (documents vault can be v1.1)

**Risk 2: Developer availability**
- **Impact:** High
- **Probability:** Medium (in-house, other priorities)
- **Mitigation:**
  - Block 30-40 hours/week for mobile development
  - Front-load hardest work (Weeks 1-4 are critical)
  - Have backup plan for key dependencies

---

## Post-Launch (Week 14+)

### Immediate Post-Launch Tasks
- [ ] Monitor App Store reviews daily
- [ ] Respond to all user feedback within 24 hours
- [ ] Track crash rates in App Store Connect
- [ ] Set up analytics (track DAU, feature usage)
- [ ] Blog post announcing iOS launch
- [ ] Email existing web users about iOS app

### Version 1.1 Backlog
- [ ] CGM integration (Dexcom API, FreeStyle Libre)
- [ ] Meal templates / favorites
- [ ] Grocery list generation
- [ ] Share reports with doctor (PDF export)
- [ ] Apple Watch complication (glance at glucose)
- [ ] Siri shortcuts ("Hey Siri, log my glucose")
- [ ] Widget (Today view glucose chart)

### Android Development (Week 14-20)
- Follow same phases as iOS
- Reuse 95% of code (shared packages + RN components)
- Focus on Android-specific:
  - Material Design UI adjustments
  - Health Connect integration
  - Google Play assets

---

## Appendix: Key Files Checklist

### Configuration Files
- [ ] `apps/mobile/app.json` - Expo config
- [ ] `apps/mobile/eas.json` - EAS Build profiles
- [ ] `apps/mobile/tsconfig.json` - TypeScript config
- [ ] `packages/shared/package.json` - Shared package
- [ ] Root `package.json` - Workspace config

### Source Code
- [ ] `apps/mobile/src/screens/` - All screen components
- [ ] `apps/mobile/src/components/` - Reusable UI
- [ ] `apps/mobile/src/navigation/` - Navigation setup
- [ ] `apps/mobile/src/api/` - Supabase client
- [ ] `apps/mobile/src/contexts/` - React Context
- [ ] `apps/mobile/src/utils/` - Mobile-specific utils
- [ ] `packages/shared/src/validation/` - Zod schemas
- [ ] `packages/shared/src/utils/` - Shared logic
- [ ] `packages/shared/src/constants/` - Shared constants

### Assets
- [ ] `apps/mobile/assets/icon.png` - App icon (1024x1024)
- [ ] `apps/mobile/assets/splash.png` - Splash screen
- [ ] `apps/mobile/assets/adaptive-icon.png` - Android icon

### Documentation
- [ ] `docs/HYBRID_ARCHITECTURE_PLAN.md` - Overall architecture
- [ ] `docs/IOS_FIRST_IMPLEMENTATION_ROADMAP.md` - This file
- [ ] `docs/HEALTHKIT_INTEGRATION.md` - HealthKit guide (create during Week 8)
- [ ] `docs/MOBILE_TESTING_PLAN.md` - Testing strategy (create during Week 11)

### App Store Materials
- [ ] Screenshots (6.7", 6.5", 5.5")
- [ ] App description (with medical disclaimers)
- [ ] Privacy policy (update for mobile)
- [ ] Support URL
- [ ] Marketing materials (optional)

---

## Next Actions (This Week)

### Day 1 (Today)
1. [ ] Review and approve this roadmap
2. [ ] Purchase Apple Developer account ($99) - https://developer.apple.com/programs/
3. [ ] Install Xcode from Mac App Store (large download, do overnight)

### Day 2
1. [ ] Complete Apple Developer account setup
2. [ ] Create Expo account - https://expo.dev/signup
3. [ ] Install Expo CLI: `npm install -g eas-cli`
4. [ ] Verify iOS simulator works: `open -a Simulator`

### Day 3
1. [ ] Initialize mobile app: `cd apps && npx create-expo-app mobile --template blank-typescript`
2. [ ] Create `packages/shared/` directory structure
3. [ ] Configure workspace in root `package.json`

### Day 4-5
1. [ ] Extract first shared utilities from web
2. [ ] Test "Hello World" on iOS simulator
3. [ ] Commit to Git: "feat: initialize React Native mobile app"

---

**Ready to start? Let's build EverMed for iOS! 🚀**
