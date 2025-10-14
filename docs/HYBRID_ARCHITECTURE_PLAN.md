# Hybrid Architecture Plan: Next.js Web + React Native Mobile

**Last Updated:** 2025-10-15
**Status:** Planning Phase
**Goal:** Native iOS + Android apps while maintaining superior web SEO/performance

---

## Executive Summary

### Strategy
Keep existing Next.js web app for superior SEO and performance, add React Native mobile apps for iOS and Android app store presence and native features.

### Why Hybrid Over "React Native for Everything"
1. ✅ **Preserve SEO advantage** - Next.js web already ranks well, has organic traffic
2. ✅ **Best tool for each platform** - Next.js optimized for web, React Native optimized for mobile
3. ✅ **No regression risk** - Web app continues working, mobile is pure addition
4. ✅ **Faster to market** - Don't rewrite web, only build mobile (2-3 months vs 4-6 months)
5. ✅ **Better user experience** - Each platform gets optimal framework

### What We're Building
```
┌─────────────────────────────────────────┐
│         getclarimed.com                 │
│       Next.js 14 Web App                │
│  ✅ SEO-optimized (SSR/SSG)              │
│  ✅ Google indexing                      │
│  ✅ Fast Core Web Vitals                 │
│  ✅ Current production app               │
└─────────────────────────────────────────┘
                    ↓
        Shared Supabase Backend
                    ↓
┌─────────────────────────────────────────┐
│      EverMed Mobile (React Native)      │
│  📱 iOS App (App Store)                  │
│  📱 Android App (Google Play)            │
│  ✅ Native performance                   │
│  ✅ Biometric auth                       │
│  ✅ Offline support                      │
│  ✅ Camera, push notifications           │
└─────────────────────────────────────────┘
```

---

## Architecture Overview

### Current Monorepo Structure
```
2025_EverMed/
├── apps/
│   ├── web/              # Next.js 14 (KEEP)
│   └── workers/          # OCR workers (KEEP)
├── packages/
│   ├── config/           # ESLint, TS configs (KEEP)
│   ├── types/            # Shared types (EXPAND for mobile)
│   └── ui/               # Web components (KEEP web-only)
├── db/
│   └── schema.prisma     # Single source of truth (SHARED)
└── tests/                # Vitest tests (EXPAND for mobile)
```

### Updated Monorepo Structure
```
2025_EverMed/
├── apps/
│   ├── web/              # Next.js 14 web app
│   ├── mobile/           # 🆕 React Native Expo app (iOS + Android)
│   └── workers/          # OCR workers
├── packages/
│   ├── config/           # ESLint, TS, Prettier configs
│   ├── types/            # 🔄 SHARED types (web + mobile)
│   ├── shared/           # 🆕 SHARED business logic
│   │   ├── validation/   # Zod schemas
│   │   ├── utils/        # Date, format, calculation helpers
│   │   ├── constants/    # Meal types, glucose thresholds
│   │   └── api/          # Supabase client wrappers
│   └── ui/               # Web-only components (Next.js specific)
├── db/
│   └── schema.prisma     # Single database schema (SHARED)
└── tests/
    ├── unit/             # Shared logic tests
    ├── integration/      # API tests
    └── mobile/           # 🆕 Mobile-specific tests
```

---

## Code Sharing Strategy

### What's 100% Shared (Zero Duplication)

#### 1. Database Schema
```prisma
// db/schema.prisma - SINGLE SOURCE OF TRUTH
// Used by: Web (Prisma Client) + Mobile (Supabase SDK)

model Person { ... }
model FoodEntry { ... }
model GlucoseReading { ... }
model Document { ... }
```

**Web access:**
```typescript
import { prisma } from '@/lib/prisma'
const person = await prisma.person.findUnique({ where: { id } })
```

**Mobile access:**
```typescript
import { supabase } from '@evermed/shared/api'
const { data: person } = await supabase
  .from('Person')
  .select('*')
  .eq('id', id)
  .single()
```

#### 2. TypeScript Types
```typescript
// packages/types/src/index.ts - SHARED
export interface FoodEntry {
  id: string
  name: string
  calories: number
  photoUrl?: string
  analysisStatus: 'pending' | 'completed' | 'failed'
}

export interface GlucoseReading {
  id: string
  value: number
  timestamp: Date
  source: 'manual' | 'cgm'
}

// Used identically in web and mobile
```

#### 3. Business Logic & Utilities
```typescript
// packages/shared/src/validation/food.ts
import { z } from 'zod'

export const foodEntrySchema = z.object({
  name: z.string().min(1).max(100),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
})

// packages/shared/src/utils/glucose.ts
export function calculateGlucoseTrend(readings: GlucoseReading[]) {
  // Algorithm used by BOTH web and mobile
  const sorted = readings.sort((a, b) => a.timestamp - b.timestamp)
  // ... trend calculation logic
}

// packages/shared/src/constants/metabolic.ts
export const GLUCOSE_THRESHOLDS = {
  LOW: 70,
  HIGH: 180,
  SPIKE_DELTA: 50,
} as const

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
```

#### 4. Supabase Configuration
```typescript
// packages/shared/src/api/supabase-client.ts
import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

// Used by both web and mobile with platform-specific env vars
```

### What's Platform-Specific (70-80%)

#### Web (Next.js)
```typescript
// apps/web/src/app/metabolic/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { LineChart } from '@/components/charts/LineChart' // Recharts
import { foodEntrySchema } from '@evermed/shared/validation' // SHARED

export default function DashboardPage() {
  // Web-specific: Next.js page component, Recharts, Tailwind CSS
}
```

#### Mobile (React Native)
```typescript
// apps/mobile/src/screens/DashboardScreen.tsx
import { View, ScrollView, StyleSheet } from 'react-native'
import { LineChart } from 'react-native-chart-kit' // Different chart library
import { foodEntrySchema } from '@evermed/shared/validation' // SHARED

export function DashboardScreen() {
  // Mobile-specific: React Native components, different chart library
}
```

---

## Backend Architecture (100% Shared)

### Supabase as Universal Backend

```
┌──────────────────────────────────────────────────┐
│           Supabase (Single Instance)             │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                       │ │
│  │  - Person, FoodEntry, GlucoseReading, etc  │ │
│  │  - Single schema, accessed by web + mobile │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Supabase Auth                             │ │
│  │  - Email/password, OAuth (Google, Apple)   │ │
│  │  - Session management (web + mobile)       │ │
│  │  - RLS policies (ownerId = auth.uid())     │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Supabase Storage                          │ │
│  │  - documents/ (PDFs, medical records)      │ │
│  │  - food-photos/ (meal images)              │ │
│  │  - RLS policies on storage buckets         │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Row Level Security (RLS)                  │ │
│  │  - Enforced at database level              │ │
│  │  - Web and mobile BOTH protected           │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
         ↓                           ↓
    Web (Prisma)               Mobile (Supabase SDK)
```

### API Layer Strategy

**Option 1: Direct Supabase (Recommended for Mobile)**
```typescript
// apps/mobile/src/api/food.ts
import { supabase } from '@evermed/shared/api'

export async function createFoodEntry(entry: FoodEntry) {
  const { data, error } = await supabase
    .from('FoodEntry')
    .insert(entry)
    .select()
    .single()

  if (error) throw error
  return data
}
```

**Option 2: Next.js API Routes (Optional, for complex logic)**
```typescript
// apps/web/src/app/api/metabolic/food/route.ts
// Mobile can call these if needed:
// POST https://getclarimed.com/api/metabolic/food

// But direct Supabase is simpler and faster
```

**Recommendation:** Mobile uses Supabase SDK directly (same as web's `apiFetch` already does). API routes only needed for:
- OpenAI integrations (food photo analysis)
- Complex multi-step operations
- External API calls (Nutritionix, Google Vision)

---

## Development Phases & Timeline

### Phase 1: Foundation Setup (Week 1-2)

**Tasks:**
- [ ] Install Expo in monorepo (`apps/mobile/`)
- [ ] Create `packages/shared/` for business logic
- [ ] Extract validation schemas from web to `packages/shared/validation/`
- [ ] Extract utility functions to `packages/shared/utils/`
- [ ] Create shared Supabase client wrapper
- [ ] Configure TypeScript paths for cross-package imports
- [ ] Set up mobile testing framework (Jest)

**Deliverable:** Mobile app runs "Hello World" with shared types compiling

### Phase 2: Authentication & Core Navigation (Week 3-4)

**Mobile Features:**
- [ ] Supabase Auth integration (email/password)
- [ ] Biometric login (Face ID / Touch ID / Fingerprint)
- [ ] Secure session storage
- [ ] Bottom tab navigation (Dashboard, Food, Documents, Profile)
- [ ] Onboarding wizard (reuse logic from web)

**Shared Code:**
- [ ] `packages/shared/validation/auth.ts` - Login/signup schemas
- [ ] `packages/shared/utils/onboarding.ts` - Validation logic

**Deliverable:** Users can sign up, log in, and navigate app

### Phase 3: Food Tracking & Photos (Week 5-7)

**Mobile Features:**
- [ ] Native camera integration (`expo-camera`)
- [ ] Photo upload to Supabase Storage
- [ ] Food entry creation (manual + AI-analyzed)
- [ ] Meal list view (today's meals)
- [ ] Meal detail view (ingredients, nutrition)
- [ ] Edit/delete meals

**Shared Code:**
- [ ] `packages/shared/validation/food.ts` - Food entry schemas
- [ ] `packages/shared/utils/nutrition.ts` - Calorie calculations
- [ ] `packages/shared/constants/meals.ts` - Meal types, categories

**API Integration:**
- [ ] Mobile calls same `/api/metabolic/food` endpoint for AI analysis
- [ ] Direct Supabase for CRUD operations

**Deliverable:** Users can photograph food, log meals, view nutrition

### Phase 4: Glucose Tracking & Dashboard (Week 8-10)

**Mobile Features:**
- [ ] Manual glucose entry form
- [ ] Glucose reading list (sortable, filterable)
- [ ] Timeline visualization (glucose + meals)
- [ ] Daily insights (patterns, spikes, trends)
- [ ] Chart library integration (`react-native-chart-kit` or Victory Native)

**Shared Code:**
- [ ] `packages/shared/validation/glucose.ts` - Glucose schemas
- [ ] `packages/shared/utils/glucose.ts` - Trend calculations, spike detection
- [ ] `packages/shared/constants/glucose.ts` - Thresholds (70/180 mg/dL)

**Deliverable:** Users see glucose timeline with meal correlation

### Phase 5: Documents & Vault (Week 11)

**Mobile Features:**
- [ ] Document upload (camera + file picker)
- [ ] Document list (grid view with thumbnails)
- [ ] Document viewer (PDF rendering)
- [ ] Document download/share (native share sheet)

**Shared Code:**
- [ ] `packages/shared/validation/documents.ts` - Upload schemas
- [ ] `packages/shared/utils/files.ts` - File size, type validation

**Deliverable:** Users can upload and view medical documents

### Phase 6: Polish & Native Features (Week 12)

**Mobile Features:**
- [ ] Push notifications (meal reminders, glucose alerts)
- [ ] Offline support (queue uploads when offline)
- [ ] App icon, splash screen, branding
- [ ] Haptic feedback
- [ ] Dark mode support
- [ ] Accessibility (screen reader, font scaling)

**Deliverable:** Production-ready mobile app

### Phase 7: Testing & App Store Submission (Week 13-14)

**Testing:**
- [ ] Internal TestFlight beta (iOS)
- [ ] Internal testing track (Android)
- [ ] Fix critical bugs
- [ ] Performance testing (ensure p95 < 2s for all screens)
- [ ] Security audit (RLS policies, data encryption)

**App Store Prep:**
- [ ] Screenshots (all device sizes)
- [ ] App Store descriptions (iOS + Android)
- [ ] Privacy policy updates (mobile app specific)
- [ ] Medical disclaimers in app descriptions
- [ ] Submit to App Store Review
- [ ] Submit to Google Play Review

**Deliverable:** Apps live on App Store + Google Play

---

## Detailed File Structure

### Mobile App Structure
```
apps/mobile/
├── package.json
├── app.json                    # Expo config
├── babel.config.js
├── tsconfig.json
├── eas.json                    # EAS Build config (iOS + Android)
├── src/
│   ├── screens/                # Main app screens
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── SignupScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── food/
│   │   │   ├── CameraScreen.tsx
│   │   │   ├── MealListScreen.tsx
│   │   │   ├── MealDetailScreen.tsx
│   │   │   └── FoodEntryFormScreen.tsx
│   │   ├── glucose/
│   │   │   ├── GlucoseListScreen.tsx
│   │   │   └── GlucoseEntryScreen.tsx
│   │   ├── documents/
│   │   │   ├── VaultScreen.tsx
│   │   │   ├── DocumentDetailScreen.tsx
│   │   │   └── UploadScreen.tsx
│   │   └── profile/
│   │       └── ProfileScreen.tsx
│   ├── components/             # Reusable UI components
│   │   ├── MealCard.tsx
│   │   ├── GlucoseChart.tsx
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── AuthNavigator.tsx
│   ├── api/                    # API client (Supabase)
│   │   ├── supabase.ts
│   │   ├── food.ts
│   │   ├── glucose.ts
│   │   └── documents.ts
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useFoodEntries.ts
│   │   └── useGlucoseReadings.ts
│   ├── contexts/               # React Context providers
│   │   └── AuthContext.tsx
│   └── utils/                  # Mobile-specific utilities
│       ├── biometrics.ts
│       ├── camera.ts
│       └── notifications.ts
└── assets/
    ├── icon.png                # App icon
    ├── splash.png              # Splash screen
    └── adaptive-icon.png       # Android adaptive icon
```

### Shared Packages Structure
```
packages/shared/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                # Main exports
│   ├── validation/             # Zod schemas
│   │   ├── auth.ts
│   │   ├── food.ts
│   │   ├── glucose.ts
│   │   └── documents.ts
│   ├── utils/                  # Pure functions
│   │   ├── date.ts             # Date formatting, timezone handling
│   │   ├── nutrition.ts        # Calorie calculations, macro ratios
│   │   ├── glucose.ts          # Trend detection, spike calculation
│   │   └── format.ts           # Number formatting, units
│   ├── constants/              # Shared constants
│   │   ├── meals.ts            # MEAL_TYPES, default portions
│   │   ├── glucose.ts          # GLUCOSE_THRESHOLDS
│   │   └── nutrients.ts        # RDA values, macro ratios
│   ├── api/                    # Supabase client wrapper
│   │   ├── client.ts           # createSupabaseClient
│   │   └── types.ts            # Database types (generated from Prisma)
│   └── types/                  # Business logic types
│       ├── food.ts
│       ├── glucose.ts
│       └── user.ts
└── tests/
    ├── validation/
    ├── utils/
    └── constants/
```

---

## Code Sharing Examples

### Example 1: Food Entry Validation (100% Shared)

```typescript
// packages/shared/src/validation/food.ts
import { z } from 'zod'

export const foodEntrySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  timestamp: z.date(),
  calories: z.number().min(0).max(10000).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  photoUrl: z.string().url().optional(),
})

export type FoodEntryInput = z.infer<typeof foodEntrySchema>

// Web usage (apps/web/src/app/metabolic/food/new/page.tsx)
import { foodEntrySchema } from '@evermed/shared/validation'

const result = foodEntrySchema.safeParse(formData)
if (!result.success) {
  setErrors(result.error.flatten())
}

// Mobile usage (apps/mobile/src/screens/food/FoodEntryFormScreen.tsx)
import { foodEntrySchema } from '@evermed/shared/validation'

const result = foodEntrySchema.safeParse(formData)
if (!result.success) {
  Alert.alert('Validation Error', result.error.issues[0].message)
}
```

### Example 2: Glucose Trend Calculation (100% Shared)

```typescript
// packages/shared/src/utils/glucose.ts
import { GLUCOSE_THRESHOLDS } from '../constants/glucose'

export interface GlucoseReading {
  value: number
  timestamp: Date
}

export type GlucoseTrend = 'rising' | 'falling' | 'stable'

export function calculateGlucoseTrend(
  readings: GlucoseReading[]
): GlucoseTrend {
  if (readings.length < 2) return 'stable'

  const sorted = [...readings].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  const recent = sorted.slice(-3) // Last 3 readings
  const deltas = recent.slice(1).map((r, i) => r.value - recent[i].value)
  const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length

  if (avgDelta > 5) return 'rising'
  if (avgDelta < -5) return 'falling'
  return 'stable'
}

export function detectGlucoseSpike(
  current: number,
  baseline: number
): boolean {
  return current - baseline > GLUCOSE_THRESHOLDS.SPIKE_DELTA
}

// Used identically in web and mobile dashboards
```

### Example 3: Supabase API Wrapper (100% Shared)

```typescript
// packages/shared/src/api/food.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { FoodEntryInput } from '../validation/food'

export async function createFoodEntry(
  supabase: SupabaseClient,
  entry: FoodEntryInput,
  userId: string
) {
  const { data, error } = await supabase
    .from('FoodEntry')
    .insert({
      ...entry,
      ownerId: userId,
      analysisStatus: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create food entry: ${error.message}`)
  return data
}

export async function getFoodEntries(
  supabase: SupabaseClient,
  userId: string,
  options?: { limit?: number; date?: Date }
) {
  let query = supabase
    .from('FoodEntry')
    .select('*')
    .eq('ownerId', userId)
    .order('timestamp', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.date) {
    const startOfDay = new Date(options.date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(options.date)
    endOfDay.setHours(23, 59, 59, 999)

    query = query
      .gte('timestamp', startOfDay.toISOString())
      .lte('timestamp', endOfDay.toISOString())
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch food entries: ${error.message}`)
  return data
}

// Web usage (apps/web/src/lib/api-client.ts)
import { getSupabase } from '@/lib/supabase/client'
import { getFoodEntries } from '@evermed/shared/api'

export async function fetchTodaysMeals() {
  const supabase = getSupabase()
  const user = await supabase.auth.getUser()
  return getFoodEntries(supabase, user.data.user!.id, { date: new Date() })
}

// Mobile usage (apps/mobile/src/api/food.ts)
import { supabase } from './supabase'
import { getFoodEntries } from '@evermed/shared/api'

export async function fetchTodaysMeals() {
  const { data: { user } } = await supabase.auth.getUser()
  return getFoodEntries(supabase, user!.id, { date: new Date() })
}
```

---

## Platform-Specific Features

### Web-Only Features (Keep in apps/web/)
- Server-side rendering (SSR/SSG)
- Next.js API routes
- SEO metadata (`<Head>`, Open Graph)
- Recharts visualizations
- Tailwind CSS styling
- File-based routing
- Server components

### Mobile-Only Features (New in apps/mobile/)
- Native camera (`expo-camera`)
- Biometric authentication (`expo-local-authentication`)
- Push notifications (`expo-notifications`)
- Offline queue (`@react-native-async-storage/async-storage`)
- Native share sheet (`expo-sharing`)
- Haptic feedback (`expo-haptics`)
- HealthKit integration (iOS) (`react-native-health`)
- Google Fit integration (Android)
- App state detection (background/foreground)
- Deep linking (`expo-linking`)

---

## Testing Strategy

### Shared Package Tests (packages/shared/tests/)
```typescript
// packages/shared/tests/utils/glucose.test.ts
import { describe, it, expect } from 'vitest'
import { calculateGlucoseTrend, detectGlucoseSpike } from '../src/utils/glucose'

describe('calculateGlucoseTrend', () => {
  it('detects rising trend', () => {
    const readings = [
      { value: 100, timestamp: new Date('2025-01-01T08:00:00Z') },
      { value: 110, timestamp: new Date('2025-01-01T08:15:00Z') },
      { value: 120, timestamp: new Date('2025-01-01T08:30:00Z') },
    ]
    expect(calculateGlucoseTrend(readings)).toBe('rising')
  })

  it('detects falling trend', () => {
    const readings = [
      { value: 140, timestamp: new Date('2025-01-01T08:00:00Z') },
      { value: 130, timestamp: new Date('2025-01-01T08:15:00Z') },
      { value: 120, timestamp: new Date('2025-01-01T08:30:00Z') },
    ]
    expect(calculateGlucoseTrend(readings)).toBe('falling')
  })
})

describe('detectGlucoseSpike', () => {
  it('detects spike when delta > 50', () => {
    expect(detectGlucoseSpike(160, 100)).toBe(true)
  })

  it('no spike when delta < 50', () => {
    expect(detectGlucoseSpike(130, 100)).toBe(false)
  })
})
```

### Mobile Tests (apps/mobile/__tests__/)
```typescript
// apps/mobile/__tests__/screens/FoodEntryForm.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { FoodEntryFormScreen } from '@/screens/food/FoodEntryFormScreen'

describe('FoodEntryFormScreen', () => {
  it('validates required fields', async () => {
    const { getByText, getByPlaceholderText } = render(<FoodEntryFormScreen />)

    const submitButton = getByText('Save Meal')
    fireEvent.press(submitButton)

    expect(getByText('Name is required')).toBeTruthy()
  })

  it('submits valid food entry', async () => {
    const { getByPlaceholderText, getByText } = render(<FoodEntryFormScreen />)

    fireEvent.changeText(getByPlaceholderText('Meal name'), 'Oatmeal')
    fireEvent.changeText(getByPlaceholderText('Calories'), '300')

    const submitButton = getByText('Save Meal')
    fireEvent.press(submitButton)

    // Assert API call was made
  })
})
```

---

## Deployment Strategy

### Web Deployment (Unchanged)
```bash
# Current Vercel deployment - NO CHANGES
git push origin main
# → Vercel auto-deploys to https://getclarimed.com
```

### Mobile Deployment (New)

**iOS (App Store):**
```bash
# Build for iOS
cd apps/mobile
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

**Android (Google Play):**
```bash
# Build for Android
cd apps/mobile
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

**Beta Testing:**
```bash
# iOS TestFlight
eas build --platform ios --profile preview
eas submit --platform ios --profile preview

# Android Internal Testing
eas build --platform android --profile preview
```

---

## Cost Analysis

### Development Costs
| Phase | Duration | Notes |
|-------|----------|-------|
| Foundation setup | 2 weeks | Monorepo, shared packages |
| Auth & navigation | 2 weeks | Supabase integration |
| Food tracking | 3 weeks | Camera, AI analysis |
| Glucose & dashboard | 3 weeks | Charts, insights |
| Documents & vault | 1 week | Upload, viewer |
| Polish & native features | 1 week | Push, offline, branding |
| Testing & submission | 2 weeks | TestFlight, app stores |
| **Total** | **14 weeks** | **~3.5 months** |

### Ongoing Costs
| Service | Cost | Notes |
|---------|------|-------|
| Apple Developer Account | $99/year | Required for App Store |
| Google Play Developer | $25 one-time | Required for Play Store |
| Expo EAS Build | $0 (free tier) | Up to 30 builds/month |
| Supabase | $0 (current tier) | Same database, no increase |
| Vercel | $0 (current tier) | Web deployment unchanged |
| **Total Year 1** | **$124** | Minimal additional cost |

### Code Maintenance
- Web codebase: Unchanged (~40 hours/month currently)
- Mobile codebase: +20 hours/month (updates, bug fixes)
- Shared packages: +10 hours/month (improvements)
- **Total:** ~70 hours/month (+30 hours for mobile)

---

## Risk Mitigation

### Technical Risks

**Risk 1: Supabase SDK compatibility (web vs mobile)**
- **Mitigation:** Use shared API wrappers in `packages/shared/api/`
- **Testing:** Integration tests validate both platforms

**Risk 2: RLS policies work differently on mobile**
- **Mitigation:** RLS enforced at database level, platform-agnostic
- **Testing:** Run same RLS tests against mobile SDK

**Risk 3: App Store rejection (medical app)**
- **Mitigation:** Follow Apple Health App guidelines
- **Testing:** Beta test with TestFlight, gather feedback

**Risk 4: Performance issues on low-end Android devices**
- **Mitigation:** Test on budget devices (Pixel 4a, Samsung A series)
- **Optimization:** Use React Native Performance Monitor

### Business Risks

**Risk 1: Low adoption (users prefer web)**
- **Mitigation:** Offer mobile-exclusive features (push notifications, biometrics)
- **Metrics:** Track DAU/MAU for web vs mobile

**Risk 2: Maintenance burden (2 codebases)**
- **Mitigation:** Maximize code sharing (95% backend logic shared)
- **Automation:** CI/CD for both platforms

**Risk 3: App Store review delays**
- **Mitigation:** Submit 2 weeks before target launch
- **Preparation:** Have all medical disclaimers ready

---

## Success Metrics

### Technical KPIs
- [ ] Code sharing: ≥80% of business logic shared
- [ ] Build time: <5 minutes for iOS + Android
- [ ] Test coverage: ≥80% for shared packages
- [ ] App size: <50MB for iOS, <30MB for Android
- [ ] Performance: p95 load time <2s for all screens
- [ ] Crash rate: <0.1% (industry standard for health apps)

### Business KPIs
- [ ] App Store approval: Within 2 weeks of submission
- [ ] User retention: 60% D1, 30% D7, 15% D30 (typical for health apps)
- [ ] Feature parity: 100% of core web features in mobile (6 months)
- [ ] User satisfaction: 4.5+ stars on App Store + Google Play
- [ ] DAU: 10% of web DAU within 3 months

---

## Next Steps (After Plan Approval)

### Immediate Actions (This Week)
1. [ ] Approve this architecture plan
2. [ ] Set up Apple Developer account ($99)
3. [ ] Set up Google Play Developer account ($25)
4. [ ] Install Expo CLI: `npm install -g eas-cli`
5. [ ] Create Expo account (free)

### Week 1 Actions
1. [ ] Initialize Expo app: `cd apps && npx create-expo-app mobile`
2. [ ] Create `packages/shared/` structure
3. [ ] Extract first shared utilities from web
4. [ ] Configure TypeScript workspace paths
5. [ ] Run "Hello World" on iOS simulator + Android emulator

### Week 2 Actions
1. [ ] Supabase auth integration in mobile
2. [ ] Test login/signup flow
3. [ ] Configure bottom tab navigation
4. [ ] Deploy first TestFlight build
5. [ ] Internal team testing

---

## Questions to Answer Before Starting

1. **Timeline:** Is 14 weeks (3.5 months) acceptable?
2. **Resources:** Who will develop the mobile app? (In-house vs contractor)
3. **Priority:** Should we launch iOS first, then Android? Or both simultaneously?
4. **Features:** Any mobile-exclusive features to add (e.g., Apple Health sync)?
5. **Budget:** Approved for $124/year + developer time?

---

## Appendix A: Technology Stack Comparison

| Technology | Web (Current) | Mobile (New) | Shared |
|------------|---------------|--------------|--------|
| **Framework** | Next.js 14 | React Native + Expo | - |
| **Language** | TypeScript | TypeScript | TypeScript |
| **UI Library** | Tailwind CSS | React Native Paper | - |
| **Charts** | Recharts | Victory Native | - |
| **Auth** | Supabase Auth | Supabase Auth | ✅ Same |
| **Database** | Prisma + Supabase | Supabase SDK | ✅ Same schema |
| **Storage** | Supabase Storage | Supabase Storage | ✅ Same buckets |
| **Validation** | Zod | Zod | ✅ Same schemas |
| **Testing** | Vitest | Jest + React Native Testing Library | Vitest (shared) |
| **Deployment** | Vercel | EAS Build (iOS + Android) | - |

---

## Appendix B: Key Dependencies

### Mobile App Dependencies
```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react": "18.3.1",
    "react-native": "0.74.0",
    "@supabase/supabase-js": "^2.45.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "expo-camera": "~15.0.0",
    "expo-local-authentication": "~14.0.0",
    "expo-notifications": "~0.28.0",
    "react-native-chart-kit": "^6.12.0",
    "zod": "^3.25.0"
  }
}
```

### Shared Package Dependencies
```json
{
  "dependencies": {
    "zod": "^3.25.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "vitest": "^2.0.5"
  }
}
```

---

**End of Hybrid Architecture Plan**
