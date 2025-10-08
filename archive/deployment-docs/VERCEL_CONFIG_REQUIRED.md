# ⚠️ FIXED: Vercel Configuration Issue Resolved

## The Problem (Now Fixed)

The deployment was failing with:
```
Error: The file "/vercel/path0/.next/routes-manifest.json" couldn't be found.
```

### Root Cause Identified

**Outdated `infra/vercel.json` from pre-monorepo refactor:**

```json
"buildCommand": "cd app && npm install && npm run build",  ❌
"outputDirectory": "app/.next",                            ❌
```

The old config referenced `app/` directory, but the monorepo structure uses `apps/web/`.

### The Fix (Applied)

✅ **Created new `vercel.json` at repository root** with correct monorepo paths:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm install"
}
```

This tells Vercel:
- Install from root (handles all workspaces) ✅
- Run build from root (delegates to `apps/web`) ✅
- Find output in `apps/web/.next/` ✅

✅ **Archived old config** to `infra/vercel.json.old`

### Alternative Approach (If Needed)

If the `vercel.json` approach doesn't work, use **Root Directory setting** in Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Select your project → **Settings** → **General**
3. **Root Directory** → Click **"Override"**
4. Enter: `apps/web`
5. Click **Save**
6. Redeploy

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
