# Sprint to App Store - Implementation Plan
**Created:** 2025-10-30
**Target Launch:** 2025-12-25 (8 weeks)
**Status:** Active Development

---

## 🎯 Current Status (Week 0 - Oct 30, 2025)

**✅ Completed Features:**
- Authentication & Onboarding (Weeks 1-4)
- Food Tracking with Camera (Weeks 5-7)
- Meal Templates (Week 7.5)
- AI Food Recognition (Google Gemini 2.5 Flash)
- Nutritionix Integration
- Multi-photo upload (up to 5 photos)
- Pull-to-refresh functionality

**📱 Production Status:**
- iOS app running in production
- Backend deployed on Vercel
- Database on Supabase (PostgreSQL)
- Food analysis pipeline working

**🚀 Ready to Build:**
- Multi-dish UI enhancements
- Meal editing
- Glucose tracking
- Timeline visualization
- Weekly reports

---

## 📅 8-Week Sprint Plan

### **Sprint 1: Multi-Dish & Meal Editing (Nov 4-10, 2025)**
**Duration:** 1 week
**Goal:** Polish food tracking UX

#### Features:
1. **Multi-Dish UI Enhancements** (3 days)
   - Display dish numbers on thumbnails (Dish 1, Dish 2, etc.)
   - Per-dish nutrition breakdown
   - Horizontal scroll through dishes
   - Per-photo analysis status

2. **Meal Editing** (4 days)
   - Edit ingredients list
   - Add/remove ingredients
   - Nutritionix search integration
   - Real-time nutrition recalculation
   - PATCH `/api/metabolic/food/[id]` endpoint

#### Success Criteria:
- [ ] Users can see nutrition for each dish separately
- [ ] Users can edit meal ingredients after analysis
- [ ] Nutrition totals update in real-time
- [ ] All edits sync to backend

---

### **Sprint 2: Glucose Foundation ✅ COMPLETE (Oct 31, 2025) 🎉 11 DAYS AHEAD**
**Planned:** Nov 4-10, 2025 | **Actual:** Oct 31, 2025
**Duration:** 1 day (vs. planned 1 week)
**Goal:** Manual glucose tracking
**Commit:** 2c60056

#### Features:
1. **Glucose Entry Screen** ✅ COMPLETE
   - ✅ Manual glucose entry form (ManualEntryScreen.tsx - 429 lines)
   - ✅ Value input (mg/dL or mmol/L) with unit toggle
   - ✅ Timestamp picker (date + time, no future dates)
   - ✅ Source selection (fingerstick, lab)
   - ✅ Range validation (20-600 mg/dL)
   - ✅ Real-time color-coded range preview
   - ✅ Optional notes field

2. **Glucose List View** ✅ COMPLETE
   - ✅ Timeline of glucose readings (GlucoseListScreen.tsx - 462 lines)
   - ✅ Color-coded by range (Red <70, Green 70-180, Yellow 181-250, Red >250)
   - ✅ Long-press delete with confirmation
   - ✅ Pull-to-refresh
   - ✅ Summary stats (average, time in range %)
   - ✅ Floating Action Button for quick add

3. **Basic Glucose Chart** ✅ COMPLETE
   - ✅ Line chart with date/time on X-axis (GlucoseChart.tsx - 241 lines)
   - ✅ Glucose values on Y-axis
   - ✅ Target range shading (70-180 mg/dL with green bands)
   - ✅ Tap on point to see details (Alert dialog)
   - ✅ Legend and summary stats
   - ✅ Responsive mobile design

4. **Glucose API Integration** ✅ COMPLETE
   - ✅ POST `/api/metabolic/glucose` (create reading) - already existed
   - ✅ GET `/api/metabolic/glucose` (list readings) - already existed
   - ✅ DELETE `/api/metabolic/glucose/[id]` - already existed
   - ✅ Mobile API client with session retry logic
   - ✅ Database schema (GlucoseReading table) already existed

#### Success Criteria:
- ✅ Users can manually log glucose readings
- ✅ Chart displays glucose over time
- ✅ Target range is visible on chart
- ✅ All readings sync to backend

**Note:** Sprint 2 completed 11 days ahead of schedule because glucose API endpoints were already implemented, allowing faster mobile integration.

---

### **Sprint 3: HealthKit Integration (Nov 18-24, 2025)**
**Duration:** 1 week
**Goal:** Import glucose from Apple Health

#### Features:
1. **HealthKit Permissions** (1 day)
   - Request read permission for glucose
   - Request write permission (optional)
   - Handle permission denied gracefully
   - Info.plist configuration

2. **HealthKit Sync** (3 days)
   - Read glucose samples from HealthKit
   - Filter by date range (last 30 days)
   - Deduplicate with manual entries
   - Background sync every 15 minutes
   - Sync status indicator

3. **CGM Detection** (1 day)
   - Detect if glucose data is from CGM
   - Show CGM badge on readings
   - Identify CGM brand (Dexcom, Libre, etc.)

4. **Settings Screen** (2 days)
   - Enable/disable HealthKit sync
   - Sync frequency settings
   - Glucose unit preference (mg/dL vs mmol/L)
   - Target range configuration

#### Success Criteria:
- [ ] App imports glucose from Apple Health
- [ ] Sync runs automatically in background
- [ ] CGM data is identified correctly
- [ ] Users can configure preferences

---

### **Sprint 4: Timeline & Correlation (Nov 25-Dec 1, 2025)**
**Duration:** 1 week
**Goal:** Visualize glucose-meal relationship

#### Features:
1. **Combined Timeline View** (3 days)
   - Glucose line chart
   - Meal markers on timeline
   - Tap meal to see details
   - Tap glucose point to see reading
   - Zoom in/out with pinch gesture
   - Pan left/right to scroll through days

2. **Glucose-Meal Correlation** (2 days)
   - Detect glucose spikes (>30 mg/dL increase)
   - Link spike to meal within 2-hour window
   - Show "Glucose Response" indicator on meals
   - Color-code meals (green=stable, yellow=moderate, red=spike)

3. **Daily Summary Card** (2 days)
   - Average glucose for the day
   - Time in range (% in 70-180 mg/dL)
   - Number of spikes
   - Best/worst meals

#### Success Criteria:
- [ ] Timeline shows glucose + meals together
- [ ] Spikes are visually linked to meals
- [ ] Daily summary is accurate
- [ ] UI is smooth and responsive

---

### **Sprint 5: Insights & Analytics (Dec 2-8, 2025)**
**Duration:** 1 week
**Goal:** Pattern detection and insights

#### Features:
1. **Pattern Detection** (3 days)
   - Identify recurring spikes (same meal type)
   - Detect stable meals (no glucose response)
   - Find optimal eating times
   - Carb tolerance patterns

2. **Insights Dashboard** (2 days)
   - Daily insights card
   - Weekly trends
   - "Foods That Work" list
   - "Foods to Watch" list
   - Actionable recommendations

3. **Streak & Gamification** (2 days)
   - Logging streak counter
   - "Days in Target Range" badge
   - Milestone celebrations (50 meals, 100 readings)
   - Share achievements (optional)

#### Success Criteria:
- [ ] App generates daily insights automatically
- [ ] Insights are actionable and clear
- [ ] Gamification encourages engagement
- [ ] No false positives in pattern detection

---

### **Sprint 6: Reports & Export (Dec 9-15, 2025)**
**Duration:** 1 week
**Goal:** Weekly reports for doctors

#### Features:
1. **Weekly Report Generation** (3 days)
   - Generate PDF with glucose summary
   - Include timeline chart
   - List all meals with nutrition
   - Show glucose trends
   - Add notes section for user

2. **Export Functionality** (2 days)
   - Export to PDF
   - Export to CSV
   - Email report
   - Share via iOS share sheet

3. **Report Customization** (2 days)
   - Select date range
   - Toggle sections (meals, glucose, insights)
   - Add custom notes
   - Doctor-friendly formatting

#### Success Criteria:
- [ ] Users can generate weekly reports
- [ ] PDF is professional and readable
- [ ] Reports include all relevant data
- [ ] Export works on all iOS versions

---

### **Sprint 7: Polish & Performance (Dec 16-22, 2025)**
**Duration:** 1 week
**Goal:** Production-ready quality

#### Features:
1. **Performance Optimization** (2 days)
   - Optimize image loading (lazy load)
   - Cache API responses
   - Reduce bundle size
   - Improve chart rendering (use SkiaChart)
   - Profile with Xcode Instruments

2. **UI/UX Polish** (2 days)
   - Consistent spacing and typography
   - Smooth animations (200ms transitions)
   - Loading states everywhere
   - Empty states with guidance
   - Error states with retry buttons

3. **Accessibility** (1 day)
   - VoiceOver support
   - Dynamic Type support
   - High contrast mode
   - Reduce motion support
   - WCAG 2.1 AA compliance

4. **Error Handling** (2 days)
   - Offline mode (show cached data)
   - Network error recovery
   - Form validation
   - Retry mechanisms
   - User-friendly error messages

#### Success Criteria:
- [ ] App loads in <2 seconds
- [ ] All animations are smooth (60fps)
- [ ] VoiceOver works correctly
- [ ] App works offline
- [ ] No crashes in production

---

### **Sprint 8: Beta Testing & App Store (Dec 23-25, 2025)**
**Duration:** 3 days (compressed for Christmas launch)
**Goal:** Launch on App Store

#### Tasks:
1. **TestFlight Beta** (1 day)
   - Upload build to TestFlight
   - Invite 10-20 beta testers
   - Collect feedback
   - Fix critical bugs

2. **App Store Assets** (1 day)
   - App icon (1024x1024)
   - Screenshots (6.5", 6.7", 12.9")
   - App preview video (optional)
   - App Store description
   - Keywords optimization
   - Privacy policy
   - Support URL

3. **App Store Submission** (1 day)
   - Complete App Store Connect metadata
   - Submit for review
   - Respond to review feedback
   - Launch!

#### Success Criteria:
- [ ] Beta testers approve the app
- [ ] All App Store assets ready
- [ ] App passes review
- [ ] App is live on App Store

---

## 🛠️ Technical Implementation Notes

### Architecture
- **Frontend:** React Native (Expo SDK 54)
- **Backend:** Next.js 14 API routes on Vercel
- **Database:** PostgreSQL on Supabase
- **AI:** Google Gemini 2.5 Flash (food recognition)
- **Nutrition:** Nutritionix API
- **Charts:** react-native-chart-kit or Victory Native

### Database Schema (Already Exists)
- `Person` - User profiles with glucose targets
- `FoodEntry` - Meals with nutrition totals
- `FoodPhoto` - Photos with analysis status
- `FoodIngredient` - Per-ingredient breakdown
- `MealTemplate` - Reusable meal templates
- `GlucoseReading` - Manual + HealthKit glucose
- `MetabolicInsight` - Daily/weekly summaries

### API Endpoints (To Build)
- ✅ `POST /api/metabolic/food` - Already exists
- ✅ `GET /api/metabolic/food` - Already exists
- ✅ `DELETE /api/metabolic/food/[id]` - Already exists
- 🔲 `PATCH /api/metabolic/food/[id]` - Need to build (meal editing)
- 🔲 `POST /api/metabolic/glucose` - Need to build
- 🔲 `GET /api/metabolic/glucose` - Need to build
- 🔲 `DELETE /api/metabolic/glucose/[id]` - Need to build
- 🔲 `GET /api/analytics/correlation` - Need to build
- 🔲 `GET /api/analytics/insights/daily` - Need to build
- 🔲 `GET /api/reports/weekly` - Need to build

---

## 📊 Progress Tracking

### Overall Progress: 35% Complete

**Completed (Weeks 1-7.5):**
- [x] Authentication & Onboarding
- [x] Food Tracking & Camera
- [x] Meal Templates

**In Progress (Sprint 1):**
- [ ] Multi-Dish UI Enhancements
- [ ] Meal Editing

**Upcoming (Sprints 2-8):**
- [ ] Glucose Tracking
- [ ] HealthKit Integration
- [ ] Timeline & Correlation
- [ ] Insights & Analytics
- [ ] Reports & Export
- [ ] Polish & Performance
- [ ] Beta Testing & Launch

---

## 🎯 Success Metrics

**Beta Launch Targets:**
- [ ] 10 beta testers actively using the app
- [ ] <5% crash rate
- [ ] <2s average load time
- [ ] 95%+ success rate for food analysis
- [ ] 4+ star rating from beta testers

**App Store Launch Targets:**
- [ ] Pass App Store review on first try
- [ ] 100 downloads in first week
- [ ] 4+ star average rating
- [ ] <1% crash rate
- [ ] Featured in "New Apps We Love" (stretch goal)

---

## 🚨 Risk Mitigation

**High-Risk Items:**
1. **HealthKit Integration** - Complex permissions, requires physical device testing
   - Mitigation: Test on multiple devices, build fallback for permissions denied

2. **App Store Review** - Medical apps face extra scrutiny
   - Mitigation: Add prominent disclaimer, no diagnosis/treatment features, clear medical supervision requirement

3. **Performance** - Charts with 1000+ data points can lag
   - Mitigation: Implement data pagination, use optimized chart library, profile early

4. **Offline Support** - Network failures can break UX
   - Mitigation: Cache critical data, implement retry logic, show clear offline indicators

---

## 🎉 Launch Day Checklist

- [ ] App live on App Store
- [ ] Production monitoring enabled (Sentry)
- [ ] Analytics tracking active (Amplitude)
- [ ] Support email monitored (support@getcarbly.com)
- [ ] Social media announcement ready
- [ ] Landing page live (getcarbly.com)
- [ ] Press kit available
- [ ] Product Hunt launch scheduled

---

**Next Action:** Start Sprint 1 - Multi-Dish UI Enhancements

**Let's ship this! 🚀**
