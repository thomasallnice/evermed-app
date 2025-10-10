# Metabolic Insights - Implementation Status

**Feature:** Premium Metabolic Insights
**Timeline:** 12 weeks (October 2025 - January 2026)
**Current Sprint:** Sprint 1 - Foundation (Weeks 1-2)
**Status:** Planning Complete, Ready to Implement
**Last Updated:** 2025-10-10

---

## Overview

Metabolic Insights is a premium feature addition to EverMed.ai that enables users to:
- Track food intake through photos
- Monitor blood sugar responses
- Receive personalized glucose predictions
- Learn individual metabolic patterns

**Pricing:** $9.99/month (Freemium: 5 meals/week free)

---

## Sprint Plan (12 Weeks)

### Sprint 1: Foundation (Weeks 1-2) - CURRENT
**Goal:** Database, storage, and basic API infrastructure

**Deliverables:**
- [x] PRD and Technical Plan created
- [ ] Database schema (9 new tables)
- [ ] RLS policies for all metabolic tables
- [ ] Supabase storage bucket (food-photos)
- [ ] POST /api/metabolic/food endpoint
- [ ] GET /api/metabolic/food endpoint

**Success Criteria:**
- Can upload food photo via API
- Photo stored in Supabase with RLS
- Food entry created in database
- API returns structured response

---

### Sprint 2: Intelligence (Weeks 3-4)
**Goal:** Food recognition and nutrition data integration

**Deliverables:**
- [ ] Google Cloud Vision API integration
- [ ] Nutritionix API integration
- [ ] Food recognition service
- [ ] Nutrition data service
- [ ] Ingredient editor UI component
- [ ] Glucose entry API endpoints

**Success Criteria:**
- Food photos analyzed with >60% accuracy
- Nutrition data populated automatically
- Manual correction UI functional
- Glucose entry working (manual + CGM)

---

### Sprint 3: Correlation (Weeks 5-6)
**Goal:** Meal-glucose correlation and basic insights

**Deliverables:**
- [ ] Glucose-meal correlation engine
- [ ] Timeline visualization component
- [ ] Daily insights generation
- [ ] Meal context tags (exercise, stress)
- [ ] Basic pattern detection

**Success Criteria:**
- Can correlate meals with glucose peaks
- Timeline shows meals and glucose together
- Daily summary generates insights
- Patterns detected (e.g., "morning carbs spike harder")

---

### Sprint 4: ML Training (Weeks 7-8)
**Goal:** Personal prediction models

**Deliverables:**
- [ ] ML model training pipeline
- [ ] Personal response model per user
- [ ] Prediction API endpoint
- [ ] Model retraining scheduler
- [ ] Accuracy tracking

**Success Criteria:**
- Individual models train on 20+ meals
- Predictions within 20 mg/dL error
- Models retrain nightly with new data
- Cold start uses population model

---

### Sprint 5: UI Polish (Weeks 9-10)
**Goal:** Mobile-optimized UX

**Deliverables:**
- [ ] Food camera component (mobile-first)
- [ ] Metabolic dashboard page
- [ ] Entry detail view
- [ ] Settings/preferences page
- [ ] Responsive design all screens

**Success Criteria:**
- Camera works on mobile browsers
- All screens responsive (mobile → desktop)
- 44px touch targets for accessibility
- Loading states and error handling

---

### Sprint 6: Beta Launch (Weeks 11-12)
**Goal:** Production readiness and beta rollout

**Deliverables:**
- [ ] Feature flag implementation
- [ ] Beta user invite system
- [ ] Analytics and monitoring
- [ ] User documentation
- [ ] Launch blog post

**Success Criteria:**
- 100+ beta users activated
- <5% error rate
- >70% complete first week
- >4.0 app rating maintained

---

## Database Schema (Sprint 1)

### New Tables (9 total)
1. **food_entries** - Main meal logging
2. **food_photos** - Photo metadata
3. **food_ingredients** - Detected ingredients
4. **glucose_readings** - Blood sugar data
5. **glucose_predictions** - ML predictions
6. **personal_models** - User ML models
7. **meal_templates** - Saved meals
8. **metabolic_insights** - Generated insights
9. **subscription_tiers** - Premium access

### Person Model Extensions
- `cgm_connected` (boolean)
- `target_glucose_min` (float)
- `target_glucose_max` (float)

---

## Technical Stack

**No Changes to Existing Stack:**
- Frontend: Next.js 14, React 18, Tailwind CSS
- Backend: Next.js API routes
- Database: PostgreSQL (Supabase) + Prisma
- Auth/Storage: Supabase
- AI/ML: OpenAI (for now)

**New External Services:**
- Google Cloud Vision API (food recognition)
- Nutritionix API (nutrition database)
- Supabase Storage bucket (food-photos)

---

## Integration Points

### With Existing EverMed:
- **Person Entity:** Add metabolic preferences
- **Navigation:** New "Metabolic" tab
- **Track Page:** Include glucose trends
- **Appointment Packs:** Add glucose data
- **Document Vault:** Store food logs as structured data

### File Structure:
```
apps/web/src/
├── app/metabolic/           # New pages
│   ├── page.tsx            # Dashboard
│   ├── camera/page.tsx     # Food camera
│   └── entry/[id]/page.tsx # Entry detail
├── components/metabolic/    # New components
│   ├── FoodCamera.tsx
│   ├── GlucoseTimeline.tsx
│   └── PredictionCard.tsx
├── lib/metabolic/           # Business logic
│   ├── food-recognition.ts
│   ├── nutrition-data.ts
│   └── correlation.ts
└── app/api/metabolic/       # API routes
    ├── food/route.ts
    ├── glucose/route.ts
    └── predict/route.ts
```

---

## Success Metrics (MVP - Month 3)

### Technical:
- [x] Food recognition accuracy >80%
- [ ] Photo → result time <2 seconds
- [ ] Prediction model trained on test data
- [ ] Manual glucose entry functional
- [ ] Daily timeline view complete

### Business:
- [ ] 100+ beta users in first month
- [ ] 15% free-to-premium conversion
- [ ] >70% log 3+ meals in first week
- [ ] 4.0+ app store rating maintained

### Health:
- [ ] Time in range improvement +10% after 90 days
- [ ] User-reported energy: 70% improvement
- [ ] Prediction accuracy <15 mg/dL error after 30 days

---

## Risk Mitigation

### Technical Risks:
- **Food recognition accuracy** → Manual correction UI, hybrid approach
- **ML model complexity** → Start simple, iterate based on data
- **Performance (photo uploads)** → Image optimization, CDN

### Business Risks:
- **Feature adoption** → Strong onboarding, gamification
- **Premium conversion** → Clear value prop, free tier limits
- **Competition** → Deep integration with health vault differentiator

---

## Next Steps (This Week)

1. **Database Implementation:**
   - Create Prisma migration for 9 tables
   - Write RLS policies for each table
   - Test with demo data

2. **Storage Setup:**
   - Create `food-photos` bucket in Supabase
   - Configure bucket RLS policies
   - Test upload/download flow

3. **API Foundation:**
   - Build POST /api/metabolic/food endpoint
   - Build GET /api/metabolic/food endpoint
   - Add placeholder AI analysis

4. **Documentation:**
   - Update project-state.md
   - Create metabolic-insights-setup.md
   - Document API contracts

---

## Dependencies

### External APIs (To Configure):
- [ ] Google Cloud Vision API key
- [ ] Nutritionix API key
- [ ] Supabase storage quota check

### Internal (Existing):
- [x] Supabase auth system
- [x] Person entity and RLS
- [x] Document storage patterns

---

## Team Notes

**Development Approach:**
- Start backend (database + APIs)
- Build minimal UI to test
- Add ML once data flows work
- Polish UI in final sprints

**Testing Strategy:**
- Unit tests for API contracts
- Integration tests for ML pipeline
- Manual testing with real food photos
- Beta testing with 10-20 users

**Compliance:**
- Maintain HIPAA compliance
- Start as wellness app (non-SaMD)
- FDA pathway in parallel (Month 7+)
- Medical disclaimers on all predictions

---

**Status Legend:**
- ✅ Complete
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked
- 🚨 Critical Issue
