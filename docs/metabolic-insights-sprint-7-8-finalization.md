# Metabolic Insights: Sprint 7-8 Finalization Plan

**Timeline**: 2-3 weeks (October 12 - November 2, 2025)
**Goal**: Deploy Metabolic Insights to production and launch closed beta with 100 users
**Current Status**: 85% complete (Sprint 1-6 DONE, deployment pending)

---

## Sprint 7: Staging Deployment (October 12-25, 2025)

**Goal**: Get Metabolic Insights fully functional in staging environment

### Week 1 (October 12-18): Infrastructure & Security

#### Day 1 (Oct 12) - Database Migrations + Storage Buckets ⚠️ CRITICAL
**Priority**: HIGHEST - Nothing works without these

**Tasks**:
1. **Apply Database Migrations to Staging**
   ```bash
   # Link to staging project
   supabase link --project-ref jwarorrwgpqrksrxmesx

   # Review migration files first
   ls -la db/migrations/*metabolic*
   ls -la db/migrations/*feature*

   # Apply all migrations
   supabase db push

   # Verify tables created
   psql $STAGING_DATABASE_URL -c "\dt" | grep -E "(food|glucose|metabolic|feature|analytics)"
   ```

2. **Create Storage Buckets in Staging**
   ```bash
   # food-photos bucket (PUBLIC for OpenAI Vision API)
   ./scripts/setup-food-photos-bucket.sh staging

   # Verify bucket creation
   supabase storage ls

   # Test upload
   # (Upload test image and verify public URL works)
   ```

3. **Verify RLS Policies Applied**
   ```bash
   # Check RLS is enabled on all tables
   psql $STAGING_DATABASE_URL -c "
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE tablename LIKE '%food%' OR tablename LIKE '%glucose%';
   "

   # Test with staging test account
   # (Upload photo, verify only user's own data visible)
   ```

**Success Criteria**:
- ✅ All 11 metabolic tables exist in staging database
- ✅ RLS policies applied (36 policies total)
- ✅ `food-photos` bucket created and PUBLIC
- ✅ Test photo upload works with staging test account
- ✅ User can only see their own data (RLS verified)

**Blockers if Not Done**:
- Code will crash with "Table not found" errors
- Photo uploads will fail with "Bucket not found"
- Feature completely non-functional

---

#### Day 2-3 (Oct 13-14) - Admin Authentication 🚨 SECURITY CRITICAL

**Priority**: CRITICAL - Security vulnerability if not fixed

**Task**: Implement Role-Based Access Control for Admin Endpoints

**Option A: Supabase RLS with user_roles Table (RECOMMENDED)**

1. **Create `user_roles` Table**
   ```sql
   -- db/migrations/20251013000000_add_user_roles/migration.sql
   CREATE TABLE IF NOT EXISTS user_roles (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'super_admin')),
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     created_by TEXT REFERENCES auth.users(id),
     UNIQUE(user_id, role)
   );

   CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
   CREATE INDEX idx_user_roles_role ON user_roles(role);

   -- RLS policies
   ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view their own roles"
     ON user_roles FOR SELECT
     USING (auth.uid()::text = user_id);

   CREATE POLICY "Only admins can insert roles"
     ON user_roles FOR INSERT
     WITH CHECK (
       EXISTS (
         SELECT 1 FROM user_roles
         WHERE user_id = auth.uid()::text AND role = 'admin'
       )
     );
   ```

2. **Update `isAdmin()` Function**
   ```typescript
   // apps/web/src/lib/auth.ts
   export async function isAdmin(userId: string): Promise<boolean> {
     const { data, error } = await supabase
       .from('user_roles')
       .select('role')
       .eq('user_id', userId)
       .in('role', ['admin', 'super_admin'])
       .single();

     if (error) {
       console.error('Admin check error:', error);
       return false;
     }

     return data !== null;
   }
   ```

3. **Seed Admin Users**
   ```sql
   -- Grant admin role to your user
   INSERT INTO user_roles (user_id, role)
   VALUES ('your-user-id-here', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

**Option B: JWT Claims (Alternative)**

1. **Add Custom Claims to JWT**
   ```typescript
   // Supabase Edge Function: set-admin-claim
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

   serve(async (req) => {
     const { userId } = await req.json()

     // Update user metadata
     const { error } = await supabaseAdmin.auth.admin.updateUserById(
       userId,
       { app_metadata: { role: 'admin' } }
     )

     return new Response(JSON.stringify({ success: !error }))
   })
   ```

2. **Check Claims in API Routes**
   ```typescript
   export async function isAdmin(userId: string): Promise<boolean> {
     const { data: { user } } = await supabase.auth.getUser()
     return user?.app_metadata?.role === 'admin'
   }
   ```

**Testing**:
```bash
# Test admin access with admin user
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://staging.evermed.ai/api/admin/metabolic

# Test rejection with non-admin user
curl -H "Authorization: Bearer $USER_TOKEN" \
  https://staging.evermed.ai/api/admin/metabolic
# Should return 403 Forbidden
```

**Success Criteria**:
- ✅ Admin endpoints return 403 for non-admin users
- ✅ Admin users can access `/admin/metabolic` and `/api/admin/*`
- ✅ Regular users see "Unauthorized" error when accessing admin routes
- ✅ `isAdmin()` function no longer returns `true` for everyone

**Blockers if Not Done**:
- Security vulnerability (anyone can access admin dashboard)
- Anyone can toggle feature flags
- Anyone can view aggregated metrics

---

#### Day 4 (Oct 15) - Environment Variables + Deployment

**Tasks**:
1. **Add External API Keys to Vercel Staging**
   ```bash
   # Log in to Vercel
   vercel login

   # Link to staging environment
   vercel link

   # Add environment variables
   vercel env add GOOGLE_VISION_API_KEY preview
   # (Enter key when prompted)

   vercel env add NUTRITIONIX_APP_ID preview
   vercel env add NUTRITIONIX_APP_KEY preview
   ```

2. **Deploy to Staging**
   ```bash
   # Merge dev to staging branch
   git checkout staging
   git merge dev
   git push origin staging

   # Vercel auto-deploys staging branch
   # Monitor deployment: https://vercel.com/thomasallnices-projects/evermed-app
   ```

3. **Verify Build Success**
   - Check Vercel dashboard for green checkmark
   - Review build logs for errors
   - Confirm environment variables loaded

**Success Criteria**:
- ✅ Staging deployment succeeds (no build errors)
- ✅ All environment variables set correctly
- ✅ External API keys working (test food photo analysis)

---

#### Day 5 (Oct 16) - Validation Testing

**Manual Test Checklist**:

1. **User Flow**
   - [ ] Sign up / Login with staging test account
   - [ ] Complete onboarding modal (if first time)
   - [ ] Navigate to `/metabolic/camera`
   - [ ] Upload food photo via camera or file
   - [ ] Wait for AI analysis (~15-25 seconds)
   - [ ] View meal on `/metabolic/dashboard` with ingredients
   - [ ] Click meal to open `/metabolic/entry/[id]`
   - [ ] Edit ingredients manually (add/remove/edit quantity)
   - [ ] Save changes and verify updated totals
   - [ ] Return to dashboard and verify changes reflected

2. **Glucose Integration** (if applicable)
   - [ ] Add manual glucose reading
   - [ ] View glucose timeline chart
   - [ ] Check glucose-meal correlation

3. **Insights & Predictions** (optional for Sprint 7)
   - [ ] View daily insights (if enough data)
   - [ ] Request glucose prediction
   - [ ] Verify prediction includes disclaimer

4. **Admin Flow** (requires admin role)
   - [ ] Access `/admin/metabolic` dashboard
   - [ ] View adoption metrics
   - [ ] Check feature flag section
   - [ ] Toggle feature flag (test only, revert immediately)
   - [ ] Adjust rollout percentage

5. **Error Scenarios**
   - [ ] Camera permission denied → File upload shown
   - [ ] Photo too large (>5MB) → Error message
   - [ ] Network error → Retry button
   - [ ] Invalid food photo (no food) → Appropriate message

**Chrome DevTools MCP Validation** (invoke `deployment-validator` subagent):
```typescript
// Use Chrome DevTools MCP to validate staging
mcp__chrome_devtools__navigate_page({ url: 'https://staging.evermed.ai/metabolic/dashboard' });
mcp__chrome_devtools__take_screenshot({ filePath: 'tests/screenshots/staging-metabolic-dashboard.png' });
mcp__chrome_devtools__list_console_errors(); // Should be zero
mcp__chrome_devtools__performance_start_trace({ reload: true, autoStop: true });
// Verify p95 < 2s for dashboard load
```

**Success Criteria**:
- ✅ All manual test checklist items pass
- ✅ Zero console errors in Chrome DevTools
- ✅ Dashboard loads in <2 seconds (p95)
- ✅ Photo upload → analysis → dashboard display works end-to-end
- ✅ Admin authentication working (403 for non-admins)

---

### Week 2 (October 19-25): Bug Fixes & Optimization

#### Day 6-8 (Oct 17-19) - Bug Fixes

**Process**:
1. **Triage Issues from Testing**
   - Create GitHub issues for each bug found
   - Categorize by severity (Blocker/Critical/Medium/Low)
   - Assign priorities

2. **Fix Critical Bugs First**
   - Focus on feature-breaking issues
   - Security vulnerabilities
   - Data integrity problems

3. **Test Fixes**
   - Verify fix in dev environment
   - Deploy to staging
   - Re-test affected functionality

**Common Issues to Watch For**:
- Photo analysis timeouts
- Incorrect nutrition calculations
- Missing meal entries in dashboard
- RLS policy bypasses
- Loading state issues
- Mobile responsive problems

---

#### Day 9-10 (Oct 20-21) - Performance Optimization

**Tasks**:
1. **Optimize Photo Upload Flow**
   - Add image compression before upload
   - Implement optimistic UI updates
   - Add progress indicators

2. **Optimize Dashboard Queries**
   - Review database indexes
   - Add caching for timeline queries
   - Implement pagination for meal list

3. **Optimize API Response Times**
   - Add Redis caching (if needed)
   - Optimize Prisma queries
   - Reduce unnecessary database calls

**Performance Targets**:
- Photo upload: <500ms (upload only, not including analysis)
- Dashboard load: <2s (p95)
- API endpoints: <300ms (p95)
- Food analysis: <25s total (including OpenAI API)

---

## Sprint 8: Production Launch (October 26 - November 2, 2025)

**Goal**: Deploy to production and launch closed beta with 100 users

### Week 1 (October 26-November 1): Production Deployment

#### Day 1 (Oct 26) - Production Database Setup

**Tasks**:
1. **Link to Production Supabase Project**
   ```bash
   supabase link --project-ref nqlxlkhbriqztkzwbdif
   ```

2. **Review Migrations Before Applying**
   ```bash
   # Dry run - review SQL first
   supabase db diff

   # If migrations look good, apply
   supabase db push
   ```

3. **Create Storage Buckets**
   ```bash
   ./scripts/setup-food-photos-bucket.sh prod
   ```

4. **Seed Admin Users**
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('production-admin-user-id', 'admin');
   ```

5. **Test with Production Test Account**
   - Upload test photo
   - Verify RLS works
   - Check admin access

**Success Criteria**:
- ✅ All migrations applied successfully
- ✅ Buckets created and accessible
- ✅ Production test account works
- ✅ RLS policies enforced

---

#### Day 2 (Oct 27) - Production Deployment

**Tasks**:
1. **Add Environment Variables to Vercel Production**
   ```bash
   vercel env add GOOGLE_VISION_API_KEY production
   vercel env add NUTRITIONIX_APP_ID production
   vercel env add NUTRITIONIX_APP_KEY production
   ```

2. **Merge Staging to Main**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

3. **Monitor Deployment**
   - Watch Vercel deployment logs
   - Check for build errors
   - Verify successful deployment

4. **Smoke Test Production**
   ```bash
   ./scripts/smoke-e2e.sh --auth --env=production
   ```

**Success Criteria**:
- ✅ Deployment succeeds
- ✅ Smoke tests pass
- ✅ No critical errors in logs

---

#### Day 3 (Oct 28) - Feature Flag Configuration

**Tasks**:
1. **Create Feature Flag**
   ```sql
   INSERT INTO feature_flags (name, enabled, rollout_percent, description)
   VALUES (
     'metabolic_insights_enabled',
     true,
     10, -- Start with 10% rollout
     'Enable Metabolic Insights premium feature for beta users'
   );
   ```

2. **Implement Feature Flag Check**
   ```typescript
   // apps/web/src/lib/feature-flags.ts
   export async function isFeatureEnabled(
     userId: string,
     featureName: string
   ): Promise<boolean> {
     const flag = await prisma.featureFlag.findUnique({
       where: { name: featureName }
     });

     if (!flag || !flag.enabled) return false;

     // Hash-based bucketing for deterministic rollout
     const hash = createHash('sha256')
       .update(userId + featureName)
       .digest('hex');
     const bucket = parseInt(hash.slice(0, 8), 16) % 100;

     return bucket < flag.rolloutPercent;
   }
   ```

3. **Add Feature Flag Guards to Routes**
   ```typescript
   // apps/web/src/app/metabolic/layout.tsx
   export default async function MetabolicLayout({ children }) {
     const userId = await requireUserId();
     const enabled = await isFeatureEnabled(userId, 'metabolic_insights_enabled');

     if (!enabled) {
       return redirect('/');
     }

     return <div>{children}</div>;
   }
   ```

4. **Create Admin UI for Flag Management**
   - Already implemented in `/admin/metabolic`
   - Test toggling flags
   - Test rollout percentage adjustments

**Success Criteria**:
- ✅ Feature flag controls access to metabolic routes
- ✅ Only 10% of users see feature (hash-based)
- ✅ Admin can adjust rollout percentage
- ✅ Users consistently see or don't see feature (deterministic)

---

#### Day 4-5 (Oct 29-30) - Beta User Recruitment

**Tasks**:
1. **Identify Beta Users**
   - Select 100 existing premium users
   - Prioritize engaged users (login in last 7 days)
   - Include mix of demographics (age, diagnosis type)

2. **Manually Add to Beta**
   ```sql
   -- Option A: Whitelist specific users (override rollout)
   UPDATE feature_flags
   SET rollout_percent = 100
   WHERE name = 'metabolic_insights_enabled';

   -- Or create user_features override table
   CREATE TABLE user_feature_overrides (
     user_id TEXT PRIMARY KEY,
     feature_name TEXT NOT NULL,
     enabled BOOLEAN NOT NULL DEFAULT true
   );
   ```

3. **Send Beta Invitation Emails**
   - Draft email with:
     - Feature overview
     - Instructions to access
     - Feedback collection form link
     - Support contact
   - Send via email platform (SendGrid/Mailchimp)

4. **Create Onboarding Resources**
   - User guide: "Getting Started with Metabolic Insights"
   - Video walkthrough (optional)
   - FAQ document
   - Support email: support@evermed.ai

**Success Criteria**:
- ✅ 100 users invited
- ✅ Invitation emails delivered (no bounces)
- ✅ Onboarding guide accessible
- ✅ Feedback form ready

---

#### Day 6-7 (Oct 31 - Nov 1) - Monitoring & Early Feedback

**Tasks**:
1. **Set Up Monitoring Dashboard**
   - Use `/admin/metabolic` dashboard
   - Monitor key metrics:
     - Activation rate (% of invited users who log first meal)
     - Meals logged per day
     - Photo analysis success rate
     - Error rate
     - API latency (p95, p99)

2. **Configure Alerts**
   ```typescript
   // Set up alerts for critical metrics
   if (errorRate > 0.02) {
     sendAlert('High error rate in Metabolic Insights');
   }

   if (photoAnalysisFailureRate > 0.10) {
     sendAlert('Food recognition failing frequently');
   }
   ```

3. **Collect Early Feedback**
   - Send 48-hour follow-up email
   - Ask for quick survey (5 questions)
   - Schedule 1:1 calls with 10 users
   - Monitor in-app feedback form submissions

4. **Daily Check-ins**
   - Review metrics every morning
   - Triage new issues
   - Respond to user feedback within 24 hours
   - Weekly retrospective

**Success Criteria (Week 1)**:
- ✅ 50+ users activated (50% of invited)
- ✅ 30+ meals logged per day
- ✅ Error rate <2%
- ✅ No critical security issues
- ✅ At least 20 feedback responses

---

## Week 2 (November 2-8): Beta Iteration

### LSTM Integration (Optional)

**If Time Permits and Team Agrees**:

#### Day 1-3 (Nov 2-4) - TensorFlow.js Integration

**Tasks**:
1. **Install Dependencies**
   ```bash
   npm install @tensorflow/tfjs-node
   ```

2. **Complete LSTM Training Implementation**
   - Review `apps/web/src/lib/ml/training.ts`
   - Implement all TODO markers
   - Add feature engineering
   - Add model evaluation

3. **Train Baseline Models**
   - Use existing beta user data
   - Train one model per user (minimum 7 days data)
   - Store models in Supabase Storage

4. **Replace Mock Predictor**
   ```typescript
   // apps/web/src/lib/ml/prediction.ts
   import { loadModel } from './training';

   export async function predictGlucose(
     personId: string,
     foodEntry: FoodEntry
   ): Promise<GlucosePrediction> {
     // Load user's trained model
     const model = await loadModel(personId);

     if (!model) {
       // Fallback to baseline if no model trained yet
       return baselinePredictor(foodEntry);
     }

     // Run LSTM prediction
     const features = await engineerFeatures(personId, foodEntry);
     const prediction = model.predict(features);

     return {
       currentGlucose: features.currentGlucose,
       predictedPeak: prediction.peak,
       timeToHeak: prediction.timeMinutes,
       confidence: prediction.confidence,
       modelVersion: model.version
     };
   }
   ```

#### Day 4-5 (Nov 5-6) - Validation & Deployment

**Tasks**:
1. **Validate Accuracy**
   - Compare LSTM vs baseline predictions
   - Target: MAE < 12 mg/dL (better than baseline 15-20)
   - Calculate R² score (target > 0.75)

2. **A/B Test Setup**
   - Deploy LSTM as canary (10% of users)
   - Compare metrics: accuracy, engagement, satisfaction
   - Gradual rollout if successful

3. **Monitor Performance**
   - Prediction latency (target: <2s with caching)
   - Model loading time (target: <50ms cached)
   - Training job success rate

**Success Criteria**:
- ✅ LSTM MAE <12 mg/dL (improvement over baseline)
- ✅ Prediction latency <2s
- ✅ No regression in user engagement
- ✅ Users notice improved accuracy

**Fallback Plan**:
- If LSTM doesn't improve accuracy, keep baseline predictor
- Iterate on model architecture in Sprint 9
- Collect more training data from beta users

---

## Success Metrics Summary

### Sprint 7 (Staging) Success Criteria
- ✅ All deployment blockers resolved
- ✅ Staging environment fully functional
- ✅ Zero critical bugs
- ✅ Admin authentication secured
- ✅ Performance targets met (p95 < 2s)

### Sprint 8 Week 1 (Beta Launch) Success Criteria
- ✅ Production deployment successful
- ✅ 50+ beta users activated (50% of invited)
- ✅ 30+ meals logged per day (avg 0.6 meals/user/day)
- ✅ Error rate <2%
- ✅ >4.0/5.0 user satisfaction rating

### Sprint 8 Week 2 (Iteration) Success Criteria
- ✅ 60+ beta users active (60% activation)
- ✅ 100+ meals logged per day (avg 1.7 meals/user/day)
- ✅ 7-day retention >60%
- ✅ LSTM integrated (optional) with MAE <12 mg/dL

---

## Risk Mitigation

### High-Risk Scenarios

1. **Database Migration Fails in Production**
   - **Mitigation**: Test thoroughly in staging first
   - **Rollback Plan**: Keep backup of production database before migration
   - **Time to Recover**: 30 minutes (restore from backup)

2. **Feature Flag Logic Bug (All Users See Feature)**
   - **Mitigation**: Test hash-based bucketing with multiple test accounts
   - **Rollback Plan**: Disable feature flag immediately
   - **Time to Recover**: 5 minutes (SQL update)

3. **OpenAI Vision API Rate Limit Hit**
   - **Mitigation**: Implement rate limiting on our side (max 10 photos/user/hour)
   - **Fallback**: Queue photos for delayed processing
   - **Time to Recover**: Immediate (queue starts processing when rate limit resets)

4. **Storage Costs Exceed Budget**
   - **Mitigation**: Monitor storage usage daily
   - **Fallback**: Implement photo compression, auto-delete after 90 days
   - **Budget Cap**: $200/month max

### Medium-Risk Scenarios

5. **Poor LSTM Accuracy (MAE >15 mg/dL)**
   - **Mitigation**: Launch with baseline predictor, iterate
   - **Fallback**: Keep baseline indefinitely
   - **User Communication**: "Early Beta - Predictions Improving"

6. **Low Beta Activation Rate (<30%)**
   - **Mitigation**: Send follow-up emails, offer incentives
   - **Fallback**: Recruit more beta users from wider audience
   - **Time to Adjust**: 1 week

---

## Deliverables Checklist

### Sprint 7
- [ ] Database migrations applied to staging
- [ ] Storage buckets created in staging
- [ ] Admin authentication implemented
- [ ] Staging deployment successful
- [ ] All validation tests pass
- [ ] Performance benchmarks met
- [ ] Bug fixes completed

### Sprint 8
- [ ] Database migrations applied to production
- [ ] Storage buckets created in production
- [ ] Production deployment successful
- [ ] Feature flag configured (10% rollout)
- [ ] 100 beta users invited
- [ ] Monitoring dashboard operational
- [ ] Early feedback collected
- [ ] LSTM integrated (optional)

### Documentation
- [ ] Sprint 7-8 completion report
- [ ] Beta launch announcement
- [ ] User guide published
- [ ] API documentation updated
- [ ] Troubleshooting guide created

---

## Next Steps After Sprint 8

### Phase 2 (Month 2-3)
- CGM provider integrations (Dexcom, FreeStyle Libre OAuth)
- Background job workers (Cloud Run for async processing)
- LSTM model improvements (if not done in Sprint 8)
- Comprehensive test coverage (Sprint 4-6 tests)
- Increase beta to 500 users

### Phase 3 (Month 4-6)
- Social features (meal sharing, community)
- Caregiver mode (family accounts)
- Clinical report export (PDF generation)
- Gradual rollout to all premium users (100% feature flag)

---

**Document Created**: October 12, 2025
**Author**: Claude Code
**Method**: Mandatory Subagent Architecture
**Co-Authored-By**: Claude <noreply@anthropic.com>
