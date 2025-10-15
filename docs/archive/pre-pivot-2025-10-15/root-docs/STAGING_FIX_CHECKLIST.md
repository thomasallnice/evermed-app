# Staging Deployment Fix - Step-by-Step Guide

**Objective:** Fix authentication issues on staging deployment
**Current Status:** Deployment successful, but authentication broken
**Target URL:** https://evermed-9nnk2slhs-thomasallnices-projects.vercel.app

---

## Step 1: Verify Supabase Environment Variables in Vercel

### 1.1 Navigate to Vercel Dashboard

1. Open browser and go to: https://vercel.com/dashboard
2. Find your project: **evermed** (or **evermed-app**)
3. Click on the project to open it

### 1.2 Check Environment Variables

1. Click **Settings** in the top navigation
2. Click **Environment Variables** in the left sidebar
3. Verify the following variables are present:

#### Required Variables Checklist:

- [ ] **NEXT_PUBLIC_SUPABASE_URL**
  - Value: `https://jwarorrwgpqrksrxmesx.supabase.co`
  - Environment: ✅ Preview ✅ Production

- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY**
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3YXJvcnJ3Z3BxcmtzcnhtZXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjcxMjcsImV4cCI6MjA2OTQ0MzEyN30.z2DTxPK62BKN5qbB_tRpqXpOoq1hPcDbAP7YxVDK84g`
  - Environment: ✅ Preview ✅ Production

- [ ] **SUPABASE_URL**
  - Value: `https://jwarorrwgpqrksrxmesx.supabase.co`
  - Environment: ✅ Preview ✅ Production

- [ ] **SUPABASE_ANON_KEY**
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3YXJvcnJ3Z3BxcmtzcnhtZXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjcxMjcsImV4cCI6MjA2OTQ0MzEyN30.z2DTxPK62BKN5qbB_tRpqXpOoq1hPcDbAP7YxVDK84g`
  - Environment: ✅ Preview ✅ Production

- [ ] **SUPABASE_SERVICE_ROLE_KEY**
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3YXJvcnJ3Z3BxcmtzcnhtZXN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzg2NzEyNywiZXhwIjoyMDY5NDQzMTI3fQ.rJ6zJCoT0-7q6fCWvKlNWxdGvhtNXddCpPJB6oqQ1uM`
  - Environment: ✅ Preview ✅ Production

- [ ] **DATABASE_URL**
  - Value: `postgres://postgres.jwarorrwgpqrksrxmesx:PX?&onwW4n36d?Cr3nHsnM7r@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
  - Environment: ✅ Preview ✅ Production

### 1.3 Add Missing Variables (if any)

If any variable is missing:

1. Click **Add New** button
2. Enter the **Key** (e.g., `SUPABASE_URL`)
3. Enter the **Value** from the checklist above
4. Select environments: **Preview** and **Production**
5. Click **Save**
6. Repeat for all missing variables

### 1.4 Verify Variable Environments

⚠️ **IMPORTANT:** Each variable must be available in both Preview AND Production environments

To check:
- Click the **Edit** icon (✏️) next to each variable
- Verify checkboxes: ☑️ Preview ☑️ Production
- If unchecked, check them and click **Save**

---

## Step 2: Verify Demo User Exists in Supabase

### 2.1 Access Supabase Dashboard

1. Open browser and go to: https://supabase.com/dashboard
2. Select your project: **development** (staging environment)
3. Click **Authentication** in the left sidebar
4. Click **Users** tab

### 2.2 Find Demo User

1. Look for user with email: `demo@evermed.local`
2. Check if user exists:

   **If user EXISTS:**
   - [ ] User is present in the list
   - [ ] Email confirmed (green checkmark)
   - [ ] Note the User UID (you'll need it)
   - ✅ **GOOD** - Proceed to Step 2.3

   **If user DOES NOT exist:**
   - [ ] User is missing
   - ⚠️ **NEED TO CREATE** - Proceed to Step 2.4

### 2.3 Verify Demo User Password (If User Exists)

**Option A: Test Login Locally**

1. Open terminal and run:
   ```bash
   npm run dev
   ```

2. Open browser to: http://localhost:3000/auth/login

3. Try logging in with:
   - Email: `demo@evermed.local`
   - Password: `demo123`

4. If login succeeds:
   - ✅ **Password is correct** - Proceed to Step 3

5. If login fails:
   - ❌ **Password may be wrong** - Proceed to Step 2.4 to reset

**Option B: Reset Password via Supabase Dashboard**

Skip to Step 2.4 and use the password reset method.

### 2.4 Create or Reset Demo User

**If user doesn't exist OR password is wrong:**

1. In Supabase Dashboard → Authentication → Users
2. Click **Add user** button (or click user to edit)
3. Fill in:
   - Email: `demo@evermed.local`
   - Password: `demo123`
   - Email confirmation: ✅ **Auto-confirm email**
4. Click **Create user** (or **Save**)
5. ✅ User created/reset successfully

---

## Step 3: Redeploy to Staging

After fixing environment variables, you need to trigger a new deployment.

### 3.1 Trigger Redeployment via Git

**Option A: Redeploy via Vercel Dashboard (Fastest)**

1. Go to Vercel Dashboard → Your Project
2. Click **Deployments** tab
3. Find the latest deployment (top of list)
4. Click the **⋯** (three dots) menu
5. Click **Redeploy**
6. Confirm **Use existing Build Cache: No**
7. Click **Redeploy**
8. ✅ Wait for deployment to complete (~2 minutes)

**Option B: Trigger via Git Push (Alternative)**

1. Open terminal in project directory
2. Make a small change to force redeployment:
   ```bash
   echo "# Trigger redeploy" >> README.md
   git add README.md
   git commit -m "chore: trigger staging redeployment after env var fix"
   git push origin refit/user-auth-onboarding
   ```
3. ✅ Vercel will automatically deploy

### 3.2 Wait for Deployment

1. Go to Vercel Dashboard → Deployments
2. Wait for status to change from **Building** → **Ready**
3. Note the deployment URL (e.g., `evermed-xyz123.vercel.app`)

---

## Step 4: Re-Validate Staging Deployment

Now that environment variables are fixed and app redeployed, let's test it.

### 4.1 Test Authentication Manually

1. Open browser to the staging URL:
   ```
   https://evermed-[latest-hash].vercel.app
   ```

2. Click **Login** or navigate to `/auth/login`

3. Enter credentials:
   - Email: `demo@evermed.local`
   - Password: `demo123`

4. Click **Sign In**

5. Expected result:
   - ✅ **SUCCESS:** Redirected to `/vault` page showing documents
   - ❌ **FAIL:** Error message or stays on login page

**If authentication succeeds:** ✅ Proceed to Step 4.2

**If authentication fails:** ❌ Return to Step 2 and verify user credentials

### 4.2 Run Automated Validation Script

Once authentication works, run the comprehensive validation:

```bash
# From project root directory
npm run test:staging
```

Or manually run:

```bash
node scripts/validate-staging-comprehensive.js
```

This will:
- Test all pages (vault, profile, chat, upload, packs, track)
- Verify new health profile fields (heightCm, weightKg, allergies)
- Confirm chat bubble design (not ChatGPT style)
- Check for console errors (zero tolerance)
- Measure performance (< 10s per page)
- Generate screenshots and report

### 4.3 Review Validation Report

After script completes, review the report:

1. Check console output for summary
2. Open generated report:
   ```
   STAGING_DEPLOYMENT_VALIDATION_COMPREHENSIVE.md
   ```

3. Look for:
   - ✅ **All pages accessible** (not redirecting to login)
   - ✅ **Zero console errors**
   - ✅ **Profile page shows heightCm, weightKg, allergies fields**
   - ✅ **Chat page shows bubble design**
   - ✅ **Performance < 10s for all pages**

---

## Step 5: Verify Critical Deployment Changes

Now manually test the specific features added in this deployment.

### 5.1 Test Profile Page Health Fields

1. Navigate to: `https://evermed-[hash].vercel.app/profile`

2. Scroll to **Health Profile** section

3. Verify these fields are present:
   - [ ] **Height (cm)** - input field
   - [ ] **Weight (kg)** - input field
   - [ ] **Allergies** - multi-select or text input
   - [ ] **Diet** - multi-select or text input
   - [ ] **Behaviors** - multi-select or text input

4. Test saving:
   - Enter values:
     - Height: `175`
     - Weight: `70`
     - Allergies: `peanuts`
   - Click **Save** button
   - Expected: Toast notification appears (green with checkmark)
   - Verify: "Profile saved successfully" message

5. Reload page and verify:
   - [ ] Height shows `175`
   - [ ] Weight shows `70`
   - [ ] Allergies shows `peanuts`
   - ✅ **Data persisted correctly**

### 5.2 Verify Chat Interface Bubble Design

1. Navigate to: `https://evermed-[hash].vercel.app/chat`

2. Visual inspection:
   - [ ] **Empty state:** Shows "Start a conversation" with bullet points
   - [ ] **User messages:** Gray speech bubbles on the right side
   - [ ] **AI messages:** White cards (full width, NOT bubbles)
   - [ ] **NOT ChatGPT style:** No conversation starters, no message actions

3. Test sending a message:
   - Type: "Hello"
   - Press Enter
   - Verify:
     - [ ] Your message appears in gray bubble on right
     - [ ] AI response appears in white card
     - [ ] Proper spacing and design

4. Take screenshot for documentation:
   - Save as: `chat-bubble-design-verified.png`
   - ✅ **Bubble design confirmed**

### 5.3 Test API Endpoints

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Navigate to profile page
4. Look for API calls:

   **Expected API calls:**
   - [ ] `GET /api/profile` → **200 OK** (not 500 or 401)
   - [ ] Response includes: `heightCm`, `weightKg`, `allergies`, `diet`, `behaviors`

5. Test profile save:
   - Make a change and click Save
   - Look for:
     - [ ] `PATCH /api/profile` → **200 OK**
     - [ ] Toast notification appears

6. Navigate to chat page:
   - [ ] `GET /api/chat/messages` → **200 OK**

7. Navigate to vault page:
   - [ ] `GET /api/documents` → **200 OK**

✅ **All API endpoints working**

---

## Step 6: Check Console for Errors

### 6.1 Open Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Clear existing messages (🚫 icon)

### 6.2 Navigate Through All Pages

Visit each page and check console after each:

- [ ] **Home** (`/`) - No errors
- [ ] **Login** (`/auth/login`) - No errors
- [ ] **Vault** (`/vault`) - No errors
- [ ] **Profile** (`/profile`) - No errors
- [ ] **Chat** (`/chat`) - No errors
- [ ] **Upload** (`/upload`) - No errors
- [ ] **Packs** (`/packs`) - No errors

### 6.3 Document Any Errors

**If you see any errors:**

1. Take screenshot of console
2. Copy error messages
3. Note which page caused the error
4. Report back for troubleshooting

**Expected result:**
- ✅ **ZERO console errors** across all pages
- ⚠️ Console warnings are acceptable (yellow)
- ❌ Console errors (red) are NOT acceptable

---

## Step 7: Final Production Readiness Check

### 7.1 Review Validation Checklist

Go through this final checklist:

**Authentication:**
- [ ] Demo login works (`demo@evermed.local` / `demo123`)
- [ ] All protected pages accessible (not redirecting to login)
- [ ] Session persists across page reloads

**New Features (This Deployment):**
- [ ] Profile page shows health fields (heightCm, weightKg, allergies)
- [ ] Profile save displays toast notifications
- [ ] Health data persists after save
- [ ] Chat interface uses bubble design (not ChatGPT style)

**Database:**
- [ ] Summary table exists (check via Supabase Dashboard)
- [ ] Person table has new health columns
- [ ] Migrations all applied (check `_prisma_migrations` table)

**API Endpoints:**
- [ ] `/api/profile` returns 200 (not 500)
- [ ] `/api/documents` works
- [ ] `/api/chat/messages` works
- [ ] All endpoints include proper authentication

**Quality:**
- [ ] Zero console errors across all pages
- [ ] Performance < 10s for all pages
- [ ] Mobile responsive (test on phone or DevTools)
- [ ] No visual regressions

**Security:**
- [ ] RLS policies enforced (cannot access other users' data)
- [ ] Authentication required for protected routes
- [ ] API endpoints validate user permissions

### 7.2 Generate Final Report

Run this command to create a final validation report:

```bash
node scripts/generate-staging-final-report.js
```

Or manually document:
- ✅ All tests passed
- 📸 Screenshots captured
- 📊 Performance metrics recorded
- ✅ **READY FOR PRODUCTION**

---

## Step 8: Promote to Production (If All Tests Pass)

### 8.1 Backup Current Production

**BEFORE promoting to production:**

1. Document current production state:
   - [ ] Note current production URL
   - [ ] Take screenshots of key pages
   - [ ] Backup production database (Supabase Dashboard → Database → Backup)

### 8.2 Promote Staging to Production

**Option A: Promote via Vercel Dashboard**

1. Go to Vercel Dashboard → Deployments
2. Find the validated staging deployment
3. Click **⋯** (three dots) menu
4. Click **Promote to Production**
5. Confirm promotion
6. ✅ Wait for production deployment (~2 minutes)

**Option B: Merge to Main Branch (If using Git-based promotion)**

1. Create pull request:
   ```bash
   gh pr create --title "feat: add health profile and Summary model" \
     --body "Deployment validated on staging. Ready for production."
   ```

2. Merge PR:
   ```bash
   gh pr merge --squash
   ```

3. ✅ Vercel automatically deploys to production

### 8.3 Verify Production Deployment

After promotion:

1. Visit production URL (e.g., `https://evermed.app`)
2. Test demo login: `demo@evermed.local` / `demo123`
3. Quick smoke test:
   - [ ] Login works
   - [ ] Vault shows documents
   - [ ] Profile shows health fields
   - [ ] Chat shows bubble design
   - [ ] No console errors

4. ✅ **PRODUCTION DEPLOYMENT COMPLETE**

---

## Rollback Plan (If Something Goes Wrong)

### If Production Has Issues After Promotion:

**Immediate Rollback via Vercel:**

1. Go to Vercel Dashboard → Deployments
2. Find the previous working deployment (marked "Production" before your promotion)
3. Click **⋯** (three dots) menu
4. Click **Promote to Production**
5. Confirm rollback
6. ✅ Previous version restored in ~30 seconds

**Database Rollback (If Needed):**

```bash
# Connect to production database
export DATABASE_URL="<production-database-url>"

# Rollback Person health fields
psql "$DATABASE_URL" -f db/migrations/20251009000000_add_health_profile_to_person/rollback.sql

# Rollback Summary table
psql "$DATABASE_URL" << 'EOF'
DROP POLICY IF EXISTS "summary_owner_select" ON "Summary";
DROP POLICY IF EXISTS "summary_owner_mod" ON "Summary";
DROP TABLE IF EXISTS "Summary";
EOF
```

---

## Troubleshooting Common Issues

### Issue 1: "Invalid login credentials" Error

**Cause:** Demo user password incorrect or user doesn't exist

**Fix:**
1. Return to **Step 2.4**
2. Reset demo user password in Supabase Dashboard
3. Redeploy (Step 3)

### Issue 2: Console Error "Failed to load resource: 401"

**Cause:** Supabase environment variables not set correctly

**Fix:**
1. Return to **Step 1.2**
2. Verify ALL 6 environment variables are present
3. Ensure variables are enabled for "Preview" environment
4. Redeploy (Step 3)

### Issue 3: Profile Page Missing Health Fields

**Cause:** Migration not applied to database OR Prisma client not regenerated

**Fix:**
```bash
# Connect to staging database
export DATABASE_URL="<staging-database-url>"

# Check if columns exist
psql "$DATABASE_URL" -c "\d Person"

# If columns missing, reapply migration
psql "$DATABASE_URL" -f db/migrations/20251009000000_add_health_profile_to_person/migration.sql

# Redeploy to regenerate Prisma client
```

### Issue 4: Chat Shows ChatGPT Style (Not Bubble Design)

**Cause:** Old deployment cached OR wrong branch deployed

**Fix:**
1. Verify correct git branch deployed (should be `refit/user-auth-onboarding`)
2. Clear Vercel build cache:
   - Vercel Dashboard → Settings → General
   - Scroll to "Build & Development Settings"
   - Click "Clear Cache"
3. Redeploy (Step 3.1 Option A)

---

## Summary

✅ **You have successfully:**
1. Fixed Supabase environment variables
2. Verified demo user exists and works
3. Redeployed staging with correct configuration
4. Validated all critical features work
5. Confirmed zero console errors
6. Verified new health profile fields
7. Confirmed chat bubble design
8. Promoted to production (if applicable)

🎉 **Staging deployment is now fully functional and validated!**

---

## Next Actions

- [ ] **Save this checklist** for future deployments
- [ ] **Update deployment documentation** with lessons learned
- [ ] **Create monitoring alerts** for authentication failures
- [ ] **Schedule production deployment** (if not already done)

---

**Questions or Issues?**

If you encounter any problems not covered in this guide, please provide:
1. Which step you're on
2. Error messages (screenshots preferred)
3. Console logs
4. What you've already tried

I'll help troubleshoot and update this guide accordingly.
