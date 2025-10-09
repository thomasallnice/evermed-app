# Quick Start: Manual Deployment Validation

## TL;DR

Automated validation is blocked by Vercel deployment protection. You need to manually test the deployment OR provide a Vercel bypass token.

---

## Option 1: Manual Testing (Quick - 10 minutes)

### Step 1: Test Critical Pages
Open your browser and navigate to each page. Check for errors in the browser console (F12 → Console).

**Pages to test:**
1. https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app/auth/login
2. https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app/auth/onboarding
3. https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app (vault)
4. https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app/upload
5. https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app/profile
6. https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app/chat
7. https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app/packs

### Step 2: Check for Console Errors
For EACH page:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. **If you see ANY errors, report them immediately**

### Step 3: Test Upload (CRITICAL - Was Previously Broken)
1. Navigate to /upload
2. Try to upload a test PDF file
3. **Check for "Bucket not found" error** (should be fixed)
4. Verify file uploads successfully

### Step 4: Check API Health
After logging in, visit:
```
https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app/api/health
```

Expected response:
```json
{
  "checks": {
    "supabase": { "ok": true },
    "openai": { "ok": true }
  }
}
```

### Step 5: Report Findings
Reply with:
- ✅ All pages load without console errors
- ❌ Found errors on [page name]: [error message]

---

## Option 2: Enable Automated Testing (Recommended for CI/CD)

### Get Vercel Bypass Token
1. Go to Vercel Dashboard
2. Select your project: `evermed-app`
3. Settings → Deployment Protection
4. Click "Protection Bypass for Automation"
5. Copy the bypass token
6. Provide it to me so I can run full automated validation

**Benefits:**
- Full automated validation with Chrome DevTools
- Screenshot capture for visual proof
- Performance metrics (p95 render time)
- Zero console error verification
- Mobile responsiveness testing

---

## Option 3: Temporarily Disable Protection (Not Recommended)

1. Vercel Dashboard → Project Settings → Deployment Protection
2. Disable protection temporarily
3. I'll run automated validation
4. Re-enable protection after testing

**Warning**: Exposes preview deployment publicly during testing.

---

## Critical Questions to Answer

### 1. DATABASE_URL Fix Verified?
- [ ] Can you successfully log in and see your data?
- [ ] No database connection errors?

### 2. Storage Bucket Fix Verified?
- [ ] Upload page loads without "Bucket not found" error?
- [ ] Profile page loads without avatar upload errors?

### 3. Console Errors?
- [ ] Zero console errors on all pages?
- [ ] No JavaScript exceptions?

### 4. Performance?
- [ ] Pages load quickly (< 10 seconds)?
- [ ] No long loading spinners?

---

## What I Need From You

**Minimum:**
- Manual test results (5-10 minutes)
- Report any console errors found
- Confirm upload and profile pages work

**Ideal:**
- Vercel bypass token for full automated validation
- Screenshots of each page
- Performance observations

---

## Next Steps Based on Results

### If All Tests Pass ✅
- **Verdict**: Ready for production promotion
- **Action**: Merge to main branch
- **Follow-up**: Set up automated validation for future deployments

### If Errors Found ❌
- **Action**: Block deployment
- **Fix**: Address console errors and re-test
- **Re-validate**: After fixes, run validation again

### If Unclear/Need Help
- **Action**: Provide detailed error messages
- **Support**: I'll help debug and provide fixes
- **Re-test**: After fixes applied

---

## Contact

If you encounter any issues or need clarification, provide:
1. Page URL where error occurred
2. Exact error message from console
3. Screenshot (if possible)
4. Steps to reproduce

I'll provide immediate fix and re-validation plan.
