# ⚠️ CRITICAL: Vercel Configuration Required

## Current Deployment Blocker

Your code is **ready for deployment**, but Vercel needs manual configuration.

### The Error You're Seeing

```
Error: The file "/vercel/path0/.next/routes-manifest.json" couldn't be found.
This is often caused by a misconfiguration in your project.
```

### Root Cause

This is a **monorepo project**. The Next.js app is located in `apps/web/`, but Vercel is building from the repository root.

Vercel builds successfully, but outputs to the wrong directory, causing the routes manifest lookup to fail.

### The Fix (Manual - Required Now)

**You MUST configure this in Vercel Dashboard:**

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click **Settings** → **General**
4. Find **"Root Directory"** section
5. Click **"Override"** button
6. Enter: `apps/web`
7. Click **Save**
8. Trigger a new deployment (push to branch or click "Redeploy")

### Why This Can't Be Automated

Vercel's root directory setting is a **project-level configuration** that can only be changed through the dashboard UI or Vercel CLI. It cannot be set via `vercel.json` or environment variables.

### After Configuration

Once you set Root Directory to `apps/web`, your next deployment will:

1. ✅ Install dependencies from repository root (correct - monorepo)
2. ✅ Build from `apps/web/` (correct - where Next.js is)
3. ✅ Output to `apps/web/.next/` (correct - where routes-manifest.json will be)
4. ✅ Deploy successfully

### Verification

After configuring and redeploying, you should see in build logs:

```
Build Command: npm run build
Building from directory: apps/web
```

### Complete Deployment Instructions

See **DEPLOYMENT.md** for full staging and production deployment steps, including:
- Database migrations
- Supabase storage configuration
- Environment variable setup
- Post-deployment verification

---

**Status:** Waiting for manual Vercel configuration before deployment can proceed.
