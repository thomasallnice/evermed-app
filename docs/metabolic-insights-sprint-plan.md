# Metabolic Insights - Sprint Plan

**Duration:** 12 weeks (Oct 7, 2025 - Dec 27, 2025)
**Sprints:** 6 × 2-week sprints
**Goal:** Launch MVP with food logging + basic glucose predictions

---

## Sprint Overview

| Sprint | Dates | Focus | Deliverables |
|--------|-------|-------|--------------|
| 1 | Oct 7-18 | Foundation | Database, APIs, Storage |
| 2 | Oct 21-Nov 1 | Intelligence | Food recognition, Nutrition data |
| 3 | Nov 4-15 | Correlation | Glucose tracking, Timeline |
| 4 | Nov 18-29 | ML Training | Personal models, Predictions |
| 5 | Dec 2-13 | UI Polish | Mobile optimization, UX |
| 6 | Dec 16-27 | Beta Launch | Testing, Monitoring, Launch |

---

## Sprint 1: Foundation (Oct 7-18, 2025)

### Theme
**"Build the foundation for metabolic data"**

### Goals
- Complete database schema with migrations
- Implement RLS security policies
- Configure Supabase storage
- Build core API endpoints
- Update project documentation

### User Stories

#### US-1.1: Database Schema
**As a developer, I need a complete database schema so that I can store metabolic data securely.**

**Acceptance Criteria:**
- [x] 9 new tables created via Prisma migrations
- [ ] All foreign keys and indexes defined
- [ ] Migrations applied to development database
- [ ] Schema documented in README

**Tasks:**
1. Create `food_entries` table migration
2. Create `food_photos` table migration
3. Create `food_ingredients` table migration
4. Create `glucose_readings` table migration
5. Create `glucose_predictions` table migration
6. Create `personal_models` table migration
7. Create `meal_templates` table migration
8. Create `metabolic_insights` table migration
9. Create `subscription_tiers` table migration
10. Update `Person` table with metabolic fields

**Estimate:** 8 hours

---

#### US-1.2: RLS Policies
**As a user, I need my metabolic data to be private so that only I can access it.**

**Acceptance Criteria:**
- [ ] RLS policies for all 9 tables
- [ ] Users can only see their own data
- [ ] Admin role can view all data
- [ ] Cascade deletes work correctly
- [ ] Policies tested with demo users

**Tasks:**
1. Write SELECT policy for food_entries
2. Write INSERT policy for food_entries
3. Write UPDATE/DELETE policies
4. Repeat for all 9 tables
5. Test with multiple users
6. Document policy patterns

**Estimate:** 6 hours

---

#### US-1.3: Storage Configuration
**As a user, I need to upload food photos so that the app can analyze them.**

**Acceptance Criteria:**
- [ ] food-photos bucket created
- [ ] Authenticated-only access
- [ ] 10MB file size limit
- [ ] Image optimization enabled
- [ ] Signed URLs working

**Tasks:**
1. Create bucket via Supabase dashboard
2. Configure bucket policies
3. Set file size limits
4. Test upload/download
5. Generate signed URLs
6. Document setup process

**Estimate:** 3 hours

---

#### US-1.4: Food Upload API
**As a user, I need to upload a photo of my meal so that the app can log it.**

**Acceptance Criteria:**
- [ ] POST /api/metabolic/food endpoint
- [ ] Accepts multipart form data
- [ ] Saves photo to storage
- [ ] Creates database records
- [ ] Returns structured response
- [ ] Error handling implemented

**Tasks:**
1. Create API route file
2. Implement auth check
3. Parse multipart form data
4. Upload photo to storage
5. Create food_entry record
6. Create food_photo record
7. Return response with IDs
8. Add error handling
9. Write unit tests

**Estimate:** 8 hours

---

#### US-1.5: Food List API
**As a user, I need to see my previous meals so that I can track my eating patterns.**

**Acceptance Criteria:**
- [ ] GET /api/metabolic/food endpoint
- [ ] Date range filtering
- [ ] Pagination support
- [ ] Includes photos and ingredients
- [ ] Optimized query performance

**Tasks:**
1. Create API route file
2. Implement query filters
3. Add pagination logic
4. Join related tables
5. Optimize with indexes
6. Return structured response
7. Write unit tests

**Estimate:** 6 hours

---

### Sprint Capacity
- **Total Capacity:** 80 hours (2 developers × 40 hours)
- **Allocated:** 31 hours (stories above)
- **Buffer:** 49 hours (testing, documentation, contingency)

### Dependencies
- None (foundation sprint)

### Risks
- **Medium:** Database migration complexity
  - Mitigation: Review existing patterns, test locally first
- **Low:** Storage configuration issues
  - Mitigation: Follow Supabase documentation closely

### Success Metrics
- [ ] All migrations applied without errors
- [ ] Zero RLS policy violations in tests
- [ ] Photo upload completes in <2 seconds
- [ ] API returns valid JSON responses
- [ ] 100% test coverage for API endpoints

### Demo
- Upload a photo via API
- Show database record created
- Display photo from storage with signed URL
- List all food entries for a user

---

## Sprint 2: Intelligence (Oct 21 - Nov 1, 2025)

### Theme
**"Add AI-powered food recognition and nutrition data"**

### Goals
- Integrate Google Cloud Vision API
- Integrate Nutritionix API for nutrition data
- Implement food recognition pipeline
- Build ingredient editing UI
- Create glucose entry functionality

### User Stories

#### US-2.1: Food Recognition Integration
**As a user, I need the app to automatically identify foods in my photo so that I don't have to type them manually.**

**Acceptance Criteria:**
- [ ] Google Vision API integrated
- [ ] Foods identified with confidence scores
- [ ] Ingredients saved to database
- [ ] >60% accuracy on test photos
- [ ] Fallback for low confidence

**Tasks:**
1. Set up Google Cloud Vision API key
2. Create image analysis service
3. Parse API response
4. Map to food categories
5. Save ingredients to database
6. Handle confidence thresholds
7. Add error handling
8. Write integration tests

**Estimate:** 10 hours

---

#### US-2.2: Nutrition Data Integration
**As a user, I need to see nutritional information for my meals so that I can make informed choices.**

**Acceptance Criteria:**
- [ ] Nutritionix API integrated
- [ ] Calories, carbs, protein, fat calculated
- [ ] Per-ingredient and total nutrition
- [ ] Portion size estimation
- [ ] Data cached for performance

**Tasks:**
1. Set up Nutritionix API key
2. Create nutrition lookup service
3. Map ingredients to nutrition DB
4. Calculate totals
5. Implement caching
6. Handle missing data
7. Write integration tests

**Estimate:** 8 hours

---

#### US-2.3: Ingredient Editor
**As a user, I need to correct misidentified foods so that my logs are accurate.**

**Acceptance Criteria:**
- [ ] Edit ingredient names
- [ ] Adjust portion sizes
- [ ] Add missing ingredients
- [ ] Remove incorrect items
- [ ] Recalculate nutrition totals

**Tasks:**
1. Create IngredientEditor.tsx component
2. Implement edit/add/remove actions
3. Update PATCH /api/metabolic/food/[id]
4. Recalculate nutrition on change
5. Show confidence scores
6. Add validation
7. Write component tests

**Estimate:** 8 hours

---

#### US-2.4: Glucose Entry
**As a user, I need to log my blood sugar readings so that I can correlate them with meals.**

**Acceptance Criteria:**
- [ ] POST /api/metabolic/glucose endpoint
- [ ] Manual entry form
- [ ] Timestamp and source tracking
- [ ] Value validation (20-600 mg/dL)
- [ ] Integration with food entries

**Tasks:**
1. Create glucose entry API
2. Validate glucose values
3. Save to database
4. Build entry form component
5. Add date/time picker
6. Implement source tracking
7. Write unit tests

**Estimate:** 6 hours

---

#### US-2.5: Food Camera Component
**As a user, I need an easy way to take photos of my meals so that logging is fast.**

**Acceptance Criteria:**
- [ ] Camera access via Web API
- [ ] Instant photo capture
- [ ] Photo preview before submit
- [ ] Meal type selection
- [ ] Optional notes field

**Tasks:**
1. Create FoodCamera.tsx component
2. Request camera permissions
3. Implement capture button
4. Show photo preview
5. Add meal type selector
6. Connect to POST API
7. Handle errors gracefully
8. Test on mobile devices

**Estimate:** 10 hours

---

### Sprint Capacity
- **Total Capacity:** 80 hours
- **Allocated:** 42 hours
- **Buffer:** 38 hours

### Dependencies
- Sprint 1 completion (database + APIs)
- External API keys configured

### Risks
- **High:** Google Vision API accuracy
  - Mitigation: Implement manual correction UI
- **Medium:** API rate limits
  - Mitigation: Implement caching, monitor usage

### Success Metrics
- [ ] Food recognition accuracy >60%
- [ ] Nutrition data found for >80% of foods
- [ ] Photo → result time <5 seconds
- [ ] User can correct all misidentified items
- [ ] Manual glucose entry works correctly

### Demo
- Take photo of meal
- Show AI-identified ingredients
- Display nutritional breakdown
- Manually correct one ingredient
- Enter glucose reading
- See both entries in list

---

## Sprint 3: Correlation (Nov 4-15, 2025)

### Theme
**"Connect meals with glucose responses"**

### Goals
- Build glucose-meal correlation engine
- Create timeline visualization
- Implement daily insights
- Add meal tagging and context

### User Stories

#### US-3.1: Glucose-Meal Correlation
**As a user, I need to see how meals affect my glucose so that I can learn my patterns.**

**Acceptance Criteria:**
- [ ] Time-align meals with glucose readings
- [ ] Identify peak glucose times
- [ ] Calculate area under curve
- [ ] Tag anomalies (exercise, stress)
- [ ] Store correlation data

**Tasks:**
1. Create correlation algorithm
2. Find glucose peaks after meals
3. Calculate time to peak
4. Compute glucose spike magnitude
5. Store results in database
6. Handle missing data
7. Write algorithm tests

**Estimate:** 10 hours

---

#### US-3.2: Timeline Visualization
**As a user, I need to see my meals and glucose on a timeline so that I can understand the relationship.**

**Acceptance Criteria:**
- [ ] Daily timeline view
- [ ] Meals plotted with photos
- [ ] Glucose curve overlay
- [ ] Interactive hover states
- [ ] Responsive on mobile

**Tasks:**
1. Create GlucoseTimeline.tsx component
2. Fetch meals and glucose for day
3. Plot on time axis
4. Draw glucose curve
5. Add meal markers
6. Implement hover tooltips
7. Make responsive
8. Write component tests

**Estimate:** 12 hours

---

#### US-3.3: Daily Insights
**As a user, I need personalized insights so that I can improve my glucose control.**

**Acceptance Criteria:**
- [ ] Best/worst meals identified
- [ ] Time-in-range percentage
- [ ] Pattern recognition
- [ ] Actionable recommendations
- [ ] Daily summary generated

**Tasks:**
1. Create insights generation service
2. Analyze glucose patterns
3. Identify best/worst meals
4. Calculate time-in-range
5. Generate recommendations
6. Store insights in database
7. Build insights display component
8. Write algorithm tests

**Estimate:** 10 hours

---

#### US-3.4: Meal Context Tags
**As a user, I need to add context to meals so that I can understand anomalies.**

**Acceptance Criteria:**
- [ ] Exercise tag
- [ ] Stress level tag
- [ ] Sleep quality tag
- [ ] Illness tag
- [ ] Custom notes

**Tasks:**
1. Add context fields to food_entries
2. Update POST API to accept tags
3. Create tag selector component
4. Show tags in timeline
5. Filter by tags
6. Write tests

**Estimate:** 6 hours

---

### Sprint Capacity
- **Total Capacity:** 80 hours
- **Allocated:** 38 hours
- **Buffer:** 42 hours

### Dependencies
- Sprint 2 completion (food + glucose data)
- Sufficient test data (50+ meals, 200+ glucose readings)

### Risks
- **Medium:** Correlation algorithm complexity
  - Mitigation: Start with simple heuristics, iterate
- **Low:** Timeline performance with large datasets
  - Mitigation: Implement pagination, optimize queries

### Success Metrics
- [ ] Correlation identified for >90% of meals
- [ ] Timeline renders <1 second
- [ ] Insights generated daily
- [ ] >70% of users add context tags

### Demo
- Show daily timeline with 5 meals
- Point out glucose spikes after each meal
- Display calculated correlations
- Show daily insights summary
- Add context tag to a meal

---

## Sprint 4: ML Training (Nov 18-29, 2025)

### Theme
**"Build personalized prediction models"**

### Goals
- Implement ML training pipeline
- Create prediction API
- Build model retraining schedule
- Track prediction accuracy

### User Stories

#### US-4.1: Personal ML Model Training
**As a user, I need the app to learn my unique responses so that predictions are personalized.**

**Acceptance Criteria:**
- [ ] LSTM model per user
- [ ] Training on 20+ meals
- [ ] Model stored in database
- [ ] Nightly retraining
- [ ] Fallback to population model

**Tasks:**
1. Design LSTM architecture
2. Create training pipeline
3. Prepare training data
4. Train initial models
5. Store model weights
6. Schedule nightly retraining
7. Implement fallback logic
8. Write tests

**Estimate:** 16 hours

---

#### US-4.2: Glucose Prediction API
**As a user, I need to see predicted glucose response so that I can make better meal choices.**

**Acceptance Criteria:**
- [ ] POST /api/metabolic/predict endpoint
- [ ] Predicts peak glucose
- [ ] Predicts time to peak
- [ ] Confidence score included
- [ ] Recommendations provided

**Tasks:**
1. Create prediction API route
2. Load user's model
3. Run inference
4. Generate prediction
5. Calculate confidence
6. Add recommendations
7. Store prediction
8. Write tests

**Estimate:** 8 hours

---

#### US-4.3: Prediction Display
**As a user, I need to see predictions before I eat so that I can adjust my meal.**

**Acceptance Criteria:**
- [ ] PredictionCard component
- [ ] Shows predicted peak
- [ ] Shows time to peak
- [ ] Displays confidence level
- [ ] Lists recommendations

**Tasks:**
1. Create PredictionCard.tsx
2. Fetch prediction from API
3. Display predicted curve
4. Show confidence visually
5. List recommendations
6. Add call-to-action
7. Write tests

**Estimate:** 6 hours

---

#### US-4.4: Accuracy Tracking
**As a developer, I need to track prediction accuracy so that I can improve models.**

**Acceptance Criteria:**
- [ ] Compare predicted vs actual
- [ ] Calculate error metrics
- [ ] Store accuracy data
- [ ] Dashboard for monitoring
- [ ] Alert if accuracy drops

**Tasks:**
1. Create accuracy tracking service
2. Compare predictions to actuals
3. Calculate RMSE, MAE
4. Store metrics in database
5. Build monitoring dashboard
6. Set up alerts
7. Write tests

**Estimate:** 8 hours

---

### Sprint Capacity
- **Total Capacity:** 80 hours
- **Allocated:** 38 hours
- **Buffer:** 42 hours (ML experimentation)

### Dependencies
- Sprint 3 completion (correlation data)
- 100+ correlated meals for training
- TensorFlow.js or Python ML environment

### Risks
- **High:** Model training complexity
  - Mitigation: Start with simple models, use pre-trained weights
- **High:** Prediction accuracy below target
  - Mitigation: Conservative confidence intervals, manual override

### Success Metrics
- [ ] Models trained for 50+ users
- [ ] Prediction error <20 mg/dL average
- [ ] Predictions generated in <500ms
- [ ] >80% of users view predictions

### Demo
- Show user with 30+ logged meals
- Display personal model training progress
- Generate prediction for new meal
- Show predicted glucose curve
- Compare actual vs predicted (next day)

---

## Sprint 5: UI Polish (Dec 2-13, 2025)

### Theme
**"Optimize for mobile and polish UX"**

### Goals
- Mobile-first UI refinements
- Performance optimization
- Error handling and loading states
- Onboarding flow for metabolic feature

### User Stories

#### US-5.1: Mobile Optimization
**As a user, I need the app to work perfectly on my phone so that I can log meals anywhere.**

**Acceptance Criteria:**
- [ ] All screens responsive
- [ ] Touch targets >44px
- [ ] Camera works on mobile
- [ ] Fast load times
- [ ] Offline support (PWA)

**Tasks:**
1. Audit all components on mobile
2. Fix responsive issues
3. Increase touch targets
4. Test camera on iOS/Android
5. Implement offline queue
6. Add PWA manifest
7. Test on 5+ devices

**Estimate:** 12 hours

---

#### US-5.2: Loading & Error States
**As a user, I need clear feedback during operations so that I know what's happening.**

**Acceptance Criteria:**
- [ ] Loading spinners for all async ops
- [ ] Progress bars for uploads
- [ ] Error messages with recovery
- [ ] Empty states with guidance
- [ ] Success confirmations

**Tasks:**
1. Add loading states to components
2. Implement progress bars
3. Create error boundaries
4. Design empty states
5. Add success toasts
6. Test error scenarios
7. Write tests

**Estimate:** 8 hours

---

#### US-5.3: Metabolic Onboarding
**As a new user, I need guidance to start using metabolic insights so that I can get value quickly.**

**Acceptance Criteria:**
- [ ] Welcome modal for feature
- [ ] Guided first meal log
- [ ] Glucose entry tutorial
- [ ] Timeline walkthrough
- [ ] Premium upgrade prompt

**Tasks:**
1. Create onboarding modal
2. Build step-by-step guide
3. Add interactive tooltips
4. Implement progress tracking
5. Add skip option
6. Test user flow
7. Write tests

**Estimate:** 10 hours

---

#### US-5.4: Performance Tuning
**As a user, I need the app to be fast so that logging meals is effortless.**

**Acceptance Criteria:**
- [ ] Photo upload <2s
- [ ] Timeline renders <1s
- [ ] API responses <500ms
- [ ] Images optimized
- [ ] Queries indexed

**Tasks:**
1. Optimize image uploads
2. Add database indexes
3. Implement API caching
4. Lazy load components
5. Code split bundles
6. Measure performance
7. Fix bottlenecks

**Estimate:** 10 hours

---

### Sprint Capacity
- **Total Capacity:** 80 hours
- **Allocated:** 40 hours
- **Buffer:** 40 hours (polish and refinement)

### Dependencies
- Sprint 4 completion (full feature working)
- Beta users for feedback

### Risks
- **Medium:** Mobile device compatibility
  - Mitigation: Test on wide range of devices
- **Low:** Performance issues at scale
  - Mitigation: Load testing, optimization

### Success Metrics
- [ ] Photo upload <2s on 4G network
- [ ] All interactions <100ms response
- [ ] 90% of new users complete onboarding
- [ ] Zero critical bugs in production

### Demo
- Full user journey on mobile device
- Log meal from camera
- View timeline
- See prediction
- Get insights
- Upgrade to premium

---

## Sprint 6: Beta Launch (Dec 16-27, 2025)

### Theme
**"Launch to beta users and monitor"**

### Goals
- Implement feature flag system
- Beta user invite mechanism
- Analytics and monitoring
- User documentation
- Launch communication

### User Stories

#### US-6.1: Feature Flag System
**As a developer, I need to control feature rollout so that I can gradually enable for users.**

**Acceptance Criteria:**
- [ ] Feature flag in database
- [ ] Admin toggle in UI
- [ ] User-level override
- [ ] Default to disabled
- [ ] Monitoring enabled

**Tasks:**
1. Add feature_flags table
2. Create admin UI
3. Implement flag checks
4. Add user overrides
5. Test rollout scenarios
6. Document usage

**Estimate:** 6 hours

---

#### US-6.2: Beta Invites
**As a user, I need to be invited to beta so that I can try new features early.**

**Acceptance Criteria:**
- [ ] Beta invite system
- [ ] Email invitations
- [ ] Waitlist management
- [ ] Feedback collection
- [ ] Beta badge display

**Tasks:**
1. Create beta_users table
2. Build invite UI
3. Send email invitations
4. Track acceptances
5. Collect feedback
6. Show beta badge
7. Write tests

**Estimate:** 8 hours

---

#### US-6.3: Analytics & Monitoring
**As a developer, I need to monitor feature usage so that I can identify issues quickly.**

**Acceptance Criteria:**
- [ ] Event tracking implemented
- [ ] Error logging configured
- [ ] Usage dashboard created
- [ ] Alerts for critical issues
- [ ] Weekly reports generated

**Tasks:**
1. Set up analytics (PostHog/Mixpanel)
2. Add event tracking
3. Configure error monitoring (Sentry)
4. Build usage dashboard
5. Set up Slack alerts
6. Create weekly report
7. Document metrics

**Estimate:** 10 hours

---

#### US-6.4: User Documentation
**As a user, I need documentation so that I can learn how to use metabolic insights.**

**Acceptance Criteria:**
- [ ] Getting started guide
- [ ] Feature walkthrough
- [ ] FAQ section
- [ ] Video tutorials
- [ ] In-app help

**Tasks:**
1. Write getting started guide
2. Create feature walkthrough
3. Document FAQ
4. Record video tutorials
5. Add in-app help
6. Publish docs site
7. Test with beta users

**Estimate:** 12 hours

---

#### US-6.5: Launch Communication
**As a user, I need to know about the new feature so that I can try it.**

**Acceptance Criteria:**
- [ ] Launch blog post
- [ ] Email announcement
- [ ] In-app notification
- [ ] Social media posts
- [ ] Press release

**Tasks:**
1. Write launch blog post
2. Create email template
3. Design in-app notification
4. Prepare social posts
5. Draft press release
6. Coordinate launch timing
7. Execute communication plan

**Estimate:** 8 hours

---

### Sprint Capacity
- **Total Capacity:** 80 hours
- **Allocated:** 44 hours
- **Buffer:** 36 hours (launch contingency)

### Dependencies
- Sprint 5 completion (polished UI)
- 50+ beta users identified
- Marketing materials prepared

### Risks
- **Medium:** Beta user feedback requires changes
  - Mitigation: Plan for quick iteration cycle
- **Low:** Monitoring gaps
  - Mitigation: Comprehensive event tracking from start

### Success Metrics
- [ ] 100+ beta users invited
- [ ] 70% invitation acceptance
- [ ] 50+ meals logged in first week
- [ ] <5% error rate
- [ ] 4.0+ feature rating

### Demo
- Launch day walkthrough
- Show feature flag toggle
- Invite beta users live
- Display real-time analytics
- Share user feedback
- Celebrate launch!

---

## Cross-Sprint Concerns

### Testing Strategy

#### Unit Tests
- All API endpoints
- Utility functions
- ML prediction algorithms
- Database queries

#### Integration Tests
- Photo upload → storage → database flow
- Food recognition pipeline
- Glucose correlation logic
- ML training pipeline

#### E2E Tests
- Complete user journeys
- Mobile device testing
- Cross-browser compatibility
- Performance testing

#### Testing Cadence
- Unit tests: Every commit
- Integration tests: Daily
- E2E tests: Weekly
- Performance tests: Per sprint

---

### Documentation Requirements

#### Developer Documentation
- API specifications
- Database schema diagrams
- ML model architecture
- Deployment procedures

#### User Documentation
- Getting started guide
- Feature tutorials
- FAQ and troubleshooting
- Video walkthroughs

#### Maintenance Documentation
- Monitoring dashboards
- Alert procedures
- Backup and recovery
- Scaling guidelines

---

### Dependencies & External Services

#### Required API Keys
- **Google Cloud Vision API**
  - When: Sprint 2
  - Setup time: 2 hours
  - Monthly cost: ~$50 (estimated)

- **Nutritionix API**
  - When: Sprint 2
  - Setup time: 1 hour
  - Monthly cost: Free tier → $99/month at scale

#### Infrastructure Requirements
- **Supabase Storage**
  - Additional quota for food photos
  - Estimated: +10GB/month
  - Cost: ~$5/month

- **Compute Resources**
  - ML model training
  - Consider GPU for inference
  - Cost: TBD based on usage

---

## Success Criteria (MVP)

### Technical Metrics
- [ ] Food recognition accuracy >80%
- [ ] Photo → result time <2 seconds
- [ ] Prediction error <20 mg/dL
- [ ] API uptime >99.5%
- [ ] Zero RLS violations

### User Metrics
- [ ] 100+ beta users activated
- [ ] 15+ meals logged per user (30 days)
- [ ] 70% retention after 30 days
- [ ] 15% free-to-premium conversion
- [ ] 4.0+ app rating maintained

### Business Metrics
- [ ] $1,000 MRR from premium ($100 × 10 users)
- [ ] <$50 CAC (customer acquisition cost)
- [ ] >3:1 LTV:CAC ratio
- [ ] Product-market fit validation

---

## Post-MVP Roadmap (Q1 2026)

### Phase 2: CGM Integration
- HealthKit integration (iOS)
- Google Fit integration (Android)
- Real-time glucose sync
- Automated correlations

### Phase 3: Advanced ML
- Multi-user models
- Transfer learning
- Recommendation engine
- Anomaly detection

### Phase 4: Social Features
- Meal sharing
- Community challenges
- Expert consultations
- Recipe database

### Phase 5: Clinical Validation
- Academic partnership
- IRB approval
- 500-patient study
- Peer-reviewed publication

---

**Document Version:** 1.0
**Last Updated:** 2025-10-10
**Next Review:** 2025-10-18 (after Sprint 1)
