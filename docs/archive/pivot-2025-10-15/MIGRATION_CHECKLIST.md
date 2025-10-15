# **GlucoLens Migration Checklist**

**Execution Order: Follow strictly for clean migration**

---

## **WEEK 1: Cleanup & Foundation**

### **Day 1-2: Database & Backend Cleanup**

- [ ] **Backup everything** first (`pg_dump` production database)
- [ ] Create migration file: `20251015_glucolens_pivot.sql`
- [ ] Drop unused tables (see PIVOT_BRIEFING.md section 1.2)
- [ ] Remove unused API routes
- [ ] Clean up environment variables
- [ ] Remove unused npm packages
- [ ] Update package.json name to "glucolens"

### **Day 3-4: Frontend Cleanup**

- [ ] Delete old feature directories (`/vault`, `/chat`, `/packs`)
- [ ] Remove old components
- [ ] Clean up unused styles
- [ ] Update all "EverMed" references to "GlucoLens"
- [ ] Update public/manifest.json
- [ ] Create new favicon and app icons

### **Day 5: New Foundation**

- [ ] Implement new simplified schema
- [ ] Create new app structure (`/dashboard`, `/onboarding`)
- [ ] Set up new routing
- [ ] Build mobile-first base layout
- [ ] Implement PWA basics

---

## **WEEK 2: Core Features**

### **Day 6-7: Food & Camera**

- [ ] Optimize existing Gemini food analysis
- [ ] Build new camera UI (full-screen, single tap)
- [ ] Add portion size estimation
- [ ] Implement food entry CRUD
- [ ] Add manual nutrition editing
- [ ] Create food history view

### **Day 8-9: Glucose Tracking**

- [ ] Build quick glucose entry (number pad)
- [ ] Implement manual entry flow
- [ ] Create glucose history view
- [ ] Add glucose graph component
- [ ] Build correlation logic (meal ↔ glucose)
- [ ] Implement time range analysis

### **Day 10: Predictions**

- [ ] Build basic prediction model
- [ ] Create prediction API
- [ ] Implement prediction UI
- [ ] Add confidence indicators
- [ ] Store predictions for learning
- [ ] Build accuracy tracking

---

## **WEEK 3: Polish & Launch**

### **Day 11-12: Apple Health Integration**

- [ ] Implement HealthKit permissions
- [ ] Build two-way sync
- [ ] Create sync status UI
- [ ] Add conflict resolution
- [ ] Test with real CGM data
- [ ] Add background sync

### **Day 13-14: Insights & Analytics**

- [ ] Build insight generation engine
- [ ] Create insight cards UI
- [ ] Implement pattern detection
- [ ] Add daily/weekly summaries
- [ ] Build trends view
- [ ] Create achievements system

### **Day 15: Launch Prep**

- [ ] Performance optimization
- [ ] Mobile testing (iOS Safari, Chrome)
- [ ] Create app store screenshots
- [ ] Write app store description
- [ ] Set up analytics
- [ ] Deploy to production

---

## **Testing Checklist**

### **Core Flows**
- [ ] Onboarding (< 2 minutes)
- [ ] Take food photo → see nutrition (< 5 seconds)
- [ ] Enter glucose manually (< 10 seconds)
- [ ] View prediction for meal
- [ ] Sync with Apple Health
- [ ] Work offline

### **Mobile Specific**
- [ ] PWA installs correctly
- [ ] Camera works on all devices
- [ ] Touch targets >= 44px
- [ ] Scrolling is 60fps
- [ ] Works one-handed
- [ ] Landscape orientation handled

### **Data Accuracy**
- [ ] Food recognition > 80% accurate
- [ ] Predictions within 20 mg/dL
- [ ] Sync doesn't lose data
- [ ] Timestamps are correct
- [ ] Unit conversion works (mg/dL ↔ mmol/L)

---

## **Launch Metrics Dashboard**

Set up tracking for:
```javascript
// Key events to track
analytics.track({
  'app_opened': { source: 'pwa' | 'web' },
  'onboarding_started': {},
  'onboarding_completed': { duration_seconds: 0 },
  'food_photo_taken': {},
  'food_analysis_completed': { duration_ms: 0, accuracy: 0 },
  'glucose_entered': { source: 'manual' | 'cgm' },
  'prediction_viewed': {},
  'insight_viewed': { type: '' },
  'healthkit_connected': {},
  'subscription_started': { plan: 'monthly' | 'annual' }
})
```

---

## **Risk Mitigation**

### **If Gemini API fails:**
- [ ] Implement OpenAI fallback (keep for now)
- [ ] Cache common foods locally
- [ ] Allow manual entry always

### **If predictions are wrong:**
- [ ] Show low confidence clearly
- [ ] Allow user corrections
- [ ] Improve with more data

### **If HealthKit sync breaks:**
- [ ] Queue syncs for retry
- [ ] Show clear error states
- [ ] Allow manual entry fallback

---

## **Post-Launch Roadmap**

### **Month 2:**
- Native iOS app (React Native)
- Dexcom G7 direct integration
- Meal templates/favorites
- Social features (share safe meals)

### **Month 3:**
- Android app
- FreeStyle Libre integration
- Insulin tracking
- Exercise correlation

### **Month 4:**
- Predictive alerts
- Meal planning
- Doctor reports
- Premium features

---

## **Definition of Done:**

**The pivot is complete when:**

1. ✅ Old features completely removed
2. ✅ New schema in production
3. ✅ Food photo → prediction flow works
4. ✅ Apple Health sync functional
5. ✅ PWA installable on iPhone
6. ✅ Landing page explains value clearly
7. ✅ Onboarding takes < 2 minutes
8. ✅ 10 beta users successfully using it
9. ✅ Domain glucolens.ai pointing to app
10. ✅ Analytics tracking all key events

---

**Remember: We're building the "Instagram for glucose tracking" - simple, visual, addictive, and incredibly useful for millions of people.**
