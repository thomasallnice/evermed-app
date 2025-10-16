# GlucoLens Implementation Roadmap

**Date**: 2025-10-16
**Current Phase**: Beta Preparation
**Document**: Based on metabolic-insights-prd.md analysis

## Executive Summary

This roadmap maps the metabolic-insights-prd.md requirements against current implementation status and defines a phased approach to reach production-ready state.

**Current Completion**: ~40% (Core logging complete, predictions/insights/social pending)

## Implementation Status Matrix

### ✅ Phase 1: Core Logging (COMPLETE)

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Photo upload & capture | ✅ Complete | `apps/web/src/app/camera/page.tsx` | Multi-photo support (up to 5) |
| AI food recognition | ✅ Complete | `apps/web/src/app/api/metabolic/food/route.ts` | Gemini 2.5 Flash integration |
| Nutritionix integration | ✅ Complete | `analyzeSinglePhoto()` in route.ts | Nutrition database lookup |
| Manual glucose entry | ✅ Complete | `apps/web/src/app/glucose/page.tsx` | Custom keypad UI |
| Meal type categorization | ✅ Complete | Camera page + FoodEntry model | Breakfast/lunch/dinner/snack |
| Multi-dish support | ✅ Complete | Migration `20251015000001`, multi-photo analysis | Each photo = separate dish |
| Food entry detail view | ✅ Complete | `apps/web/src/app/entry/[id]/page.tsx` | Multi-dish grid layout |
| Daily timeline visualization | ✅ Complete | `apps/web/src/app/dashboard/page.tsx` | Glucose + meal scatter plot |
| Time range filters | ✅ Complete | Dashboard (morning/afternoon/evening) | Added Oct 16, 2025 |

**Performance**: Photo upload + AI analysis < 10s (meets PRD requirement)

### 🔶 Phase 2: CGM Integration (IN PROGRESS)

| Feature | Status | Files | Priority | Effort |
|---------|--------|-------|----------|--------|
| CGM provider OAuth flow | ❌ Not started | New: `apps/web/src/lib/services/cgm/` | HIGH | 3 days |
| Dexcom API integration | ❌ Not started | New: CGM service layer | HIGH | 5 days |
| FreeStyle Libre support | ❌ Not started | New: CGM service layer | MEDIUM | 3 days |
| Automatic glucose sync | ❌ Not started | Background job or webhook | HIGH | 2 days |
| Glucose data validation | ❌ Not started | Validation logic | MEDIUM | 1 day |
| CGM connection UI | ❌ Not started | Settings page + onboarding | HIGH | 2 days |

**Total Effort**: ~16 days (3 weeks with testing)
**Blocker**: Dexcom/Libre sandbox access needed for testing

**Recommendation**: Use `external-api-integrator` subagent for CGM implementation

### 🔶 Phase 3: Glucose Predictions (IN PROGRESS - Mock Baseline)

| Feature | Status | Files | Priority | Effort |
|---------|--------|-------|----------|--------|
| Mock prediction baseline | 🔶 Partial | Need API endpoint | HIGH | 1 day |
| LSTM model training pipeline | ❌ Not started | New: ML training scripts | MEDIUM | 10 days |
| Per-user model versioning | ❌ Not started | PersonalModel schema exists | MEDIUM | 3 days |
| Batch prediction system | ❌ Not started | Background worker | MEDIUM | 5 days |
| Prediction API endpoint | ❌ Not started | `/api/predictions/glucose` | HIGH | 2 days |
| Model retraining triggers | ❌ Not started | After N new observations | LOW | 3 days |
| Confidence score display | ❌ Not started | UI for prediction ranges | MEDIUM | 2 days |

**Total Effort**: ~26 days (5 weeks)
**Note**: LSTM models are OPTIONAL for beta. Mock baseline sufficient for MVP.

**Recommendation**: Use `ml-pipeline-architect` subagent when implementing LSTM

### 🔶 Phase 4: Insights & Recommendations (IN PROGRESS)

| Feature | Status | Files | Priority | Effort |
|---------|--------|-------|----------|--------|
| Daily summary generation | 🔶 Partial | API exists, needs UI | HIGH | 2 days |
| Glucose spike detection | 🔶 Backend exists | `MetabolicInsight` model | HIGH | 1 day (UI) |
| Meal impact correlation | 🔶 Backend exists | Correlation API endpoint | HIGH | 2 days (UI) |
| Pattern detection (trends) | ❌ Not started | Trend analysis algorithm | MEDIUM | 5 days |
| Personalized recommendations | ❌ Not started | Rule engine or ML | MEDIUM | 7 days |
| Weekly PDF export | ❌ Not started | PDF generation library | MEDIUM | 3 days |
| Stable meal identification | ❌ Not started | Low variance detection | LOW | 2 days |

**Total Effort**: ~22 days (4 weeks)
**Current State**: Backend infrastructure exists, frontend visualization needed

**Recommendation**: Use `analytics-architect` subagent for correlation algorithms

### ❌ Phase 5: Social & Community (NOT STARTED)

| Feature | Status | Priority | Effort | Notes |
|---------|--------|----------|--------|-------|
| Meal template sharing | ❌ | LOW | 5 days | MealTemplate schema exists |
| Community recipe library | ❌ | LOW | 7 days | Moderation needed |
| Friend connections | ❌ | LOW | 10 days | Privacy-first design |
| Anonymized comparisons | ❌ | LOW | 5 days | Non-PHI aggregations only |

**Total Effort**: ~27 days (5 weeks)
**Recommendation**: Post-V1.0 feature. Focus on core product first.

### ❌ Phase 6: Premium Tier & Monetization (NOT STARTED)

| Feature | Status | Priority | Effort | Notes |
|---------|--------|----------|--------|-------|
| Subscription tiers (Free/Pro) | ❌ | MEDIUM | 3 days | SubscriptionTier schema exists |
| Stripe integration | ❌ | MEDIUM | 5 days | Webhooks for lifecycle |
| Usage limit enforcement | ❌ | MEDIUM | 2 days | Photo count, predictions |
| Upgrade prompts | ❌ | LOW | 2 days | Non-intrusive upsell |
| Admin billing dashboard | ❌ | LOW | 3 days | Stripe analytics |

**Total Effort**: ~15 days (3 weeks)
**Recommendation**: Implement before public beta launch

## Critical Path to Beta Launch

### Milestone 1: MVP Feature Complete (2 weeks)
**Goal**: All essential features functional for private beta

- [ ] **Mock glucose predictions** (1 day)
  - Simple linear baseline: last glucose + carbs → predicted spike
  - Display with ±20% confidence range
  - Medical disclaimer from `lib/copy.ts`

- [ ] **Daily insights UI** (2 days)
  - Spike detection cards
  - Meal impact correlation visualization
  - Time-in-range metrics

- [ ] **CGM OAuth flow (Dexcom only)** (5 days)
  - OAuth 2.0 implementation
  - Token storage and refresh
  - Initial data sync
  - Connection status UI

- [ ] **Weekly summary export** (3 days)
  - PDF generation with charts
  - Email delivery option
  - Share with doctor flow

**Deliverables**: Feature-complete app ready for internal testing

### Milestone 2: Beta Hardening (1 week)
**Goal**: Production-ready reliability and performance

- [ ] **Performance optimization** (2 days)
  - Timeline query optimization (p95 < 2s)
  - Image compression before upload
  - Caching for nutrition lookups

- [ ] **Error handling** (1 day)
  - Graceful degradation for API failures
  - Retry logic for CGM sync
  - User-friendly error messages

- [ ] **Security audit** (2 days)
  - RLS policy review with `supabase-rls-security`
  - API endpoint validation with `api-contract-validator`
  - Storage bucket permissions check

- [ ] **Medical compliance review** (1 day)
  - All AI outputs reviewed by `medical-compliance-guardian`
  - Non-SaMD disclaimers on predictions
  - Citation requirements verified

**Deliverables**: Beta-ready application

### Milestone 3: Beta Launch (1 week)
**Goal**: Private beta with 10-20 users

- [ ] **Deployment** (1 day)
  - Apply all migrations to production
  - Deploy to Vercel production
  - Smoke test critical flows

- [ ] **Monitoring setup** (1 day)
  - Supabase logging configured
  - Error tracking (Sentry or similar)
  - Analytics dashboard

- [ ] **User onboarding** (2 days)
  - Improved onboarding wizard
  - Tutorial tooltips for key features
  - Help documentation

- [ ] **Feedback collection** (ongoing)
  - In-app feedback form
  - Weekly user interviews
  - Bug tracking system

**Deliverables**: Live beta with real users

## Technical Debt & Improvements

### High Priority
1. **Database connection pooling** - Current Prisma errors suggest connection issues
2. **API response caching** - Timeline queries should cache for 5-10 minutes
3. **Image optimization** - Compress photos before storage (reduce 5MB → 1MB)
4. **Error boundary components** - Graceful UI fallbacks for failed API calls
5. **Loading states** - Better skeleton screens for async data

### Medium Priority
1. **TypeScript strict mode** - Enable strict null checks
2. **E2E test coverage** - Playwright tests for critical flows
3. **Accessibility audit** - WCAG 2.1 AA compliance check
4. **Mobile PWA manifest** - Installable app on iOS/Android
5. **Offline support** - Queue uploads when offline

### Low Priority
1. **Code splitting** - Reduce bundle size with dynamic imports
2. **Service worker** - Background sync for CGM data
3. **Dark mode** - User preference support
4. **i18n preparation** - Internationalization framework

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CGM API access denied | HIGH | MEDIUM | Focus on manual entry for beta |
| LSTM models underperform | MEDIUM | HIGH | Use mock baseline initially |
| Database performance issues | HIGH | MEDIUM | Add indexes, optimize queries |
| AI analysis accuracy low | HIGH | MEDIUM | Allow manual corrections |
| User adoption slow | MEDIUM | MEDIUM | Improve onboarding, collect feedback |
| Medical compliance violations | CRITICAL | LOW | Mandatory `medical-compliance-guardian` reviews |

## Success Metrics (from PRD)

### Beta Launch Targets
- **User Retention**: 60% day-7 retention
- **Engagement**: 3+ meals logged per day
- **Performance**: p95 upload time < 10s ✅ (achieved)
- **Accuracy**: 80%+ ingredient recognition accuracy
- **CGM Sync**: 95%+ successful syncs (when implemented)

### V1.0 Launch Targets
- **MAU**: 1000+ active users
- **Revenue**: $5K MRR from Pro tier
- **NPS**: 50+ Net Promoter Score
- **Time-in-Range**: 70%+ users in target range
- **Predictions**: 75%+ accuracy within ±20 mg/dL

## Phased Rollout Plan

### Phase 2A: Beta (Private) - Week 1-2
- 10-20 internal/friendly users
- Manual glucose entry only (no CGM yet)
- Mock predictions only
- Focus on core logging workflow
- Heavy monitoring and bug fixes

### Phase 2B: Beta (Expanded) - Week 3-4
- 50-100 users
- Add Dexcom CGM integration
- Roll out to 20% of users first (feature flag)
- Collect feedback on CGM UX
- Monitor sync reliability

### Phase 2C: Beta (Public) - Week 5-8
- Open beta signup
- 500+ users
- Full feature set (predictions, insights, export)
- Premium tier introduced
- Marketing campaign begins

### Phase 3: V1.0 Launch - Week 9+
- General availability
- All features stable
- Premium tier actively marketed
- App Store / Play Store submission
- Press coverage and partnerships

## Next Immediate Actions (This Week)

1. **Implement mock glucose predictions** (1 day)
   - Create `/api/predictions/glucose` POST endpoint
   - Simple formula: baseline + (carbs * 3) for 2-hour spike
   - Return prediction array with timestamps + values
   - Add medical disclaimer

2. **Build daily insights UI** (2 days)
   - Create insights dashboard page
   - Show glucose spike events
   - Visualize meal impact correlation
   - Add time-in-range stats

3. **Plan CGM integration** (1 day)
   - Research Dexcom Developer Portal requirements
   - Sign up for sandbox access
   - Design OAuth flow UX
   - Create service layer structure

**Total**: 4 days of focused work to reach MVP feature complete

## Subagent Usage Plan

**For each major feature implementation, use the appropriate subagent:**

| Feature | Subagent | When to Invoke |
|---------|----------|----------------|
| Mock predictions API | `api-contract-validator` | After implementing endpoint |
| CGM OAuth flow | `external-api-integrator` | Before starting implementation |
| CGM service layer | `external-api-integrator` | Design phase |
| LSTM model training | `ml-pipeline-architect` | Before starting implementation |
| Daily insights UI | `nextjs-ui-builder` | Before building components |
| Correlation algorithms | `analytics-architect` | Design phase |
| Weekly PDF export | `general-purpose` | Implementation phase |
| Database indexes | `database-architect` | Before schema changes |
| RLS policy review | `supabase-rls-security` | Before beta launch |
| Medical content review | `medical-compliance-guardian` | After any AI output changes |
| Pre-PR validation | `pr-validation-orchestrator` | Before EVERY pull request |

## Documentation Updates Needed

- [ ] Update `CLAUDE.md` memory with roadmap completion
- [ ] Document CGM integration in new `docs/CGM_INTEGRATION.md`
- [ ] Create `docs/PREDICTION_MODELS.md` for ML architecture
- [ ] Update `docs/project-description.md` with beta timeline
- [ ] Create user-facing help docs in `docs/user-guide/`

## Conclusion

**Current State**: Core logging workflow is production-ready. Multi-dish support, timeline visualization, and basic analytics are complete.

**Next Priority**: Focus on MVP feature completeness (predictions + insights UI) before expanding to CGM integration and advanced ML models.

**Timeline to Beta**: 4 weeks with focused execution
- Week 1: MVP features (predictions, insights)
- Week 2: Beta hardening (performance, security, compliance)
- Week 3: Internal beta testing + bug fixes
- Week 4: Expanded beta launch

**Blocker**: None currently. Can proceed with mock predictions and insights UI immediately.

**Recommendation**: Start with mock glucose predictions and daily insights UI this week. CGM integration can follow in parallel track.
