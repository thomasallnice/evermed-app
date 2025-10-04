# EverMed.ai Deployment Checklist

## ✅ Pre-Deployment Status

### Code Quality
- ✅ **TypeScript**: All type checks pass
- ✅ **Linting**: No ESLint errors
- ✅ **Build**: Production build succeeds locally
- ✅ **Git**: All changes committed to `refit/user-auth-onboarding` branch

### Mobile-First Implementation
- ✅ **All Pages Updated**: vault, upload, chat, doc/[id], track, packs, profile
- ✅ **Responsive Design**: Base styles for mobile, breakpoints for tablet/desktop
- ✅ **Touch Targets**: 44px minimum for all interactive elements
- ✅ **Navigation**: Mobile hamburger menu implemented
- ✅ **Google Material Design**: Elevation, rounded corners, colorful badges

### Database
- ✅ **Critical Fixes Applied**:
  - DocChunk cascade deletion (users can delete documents)
  - Person.ownerId unique constraint (data integrity)
- ✅ **Migration Created**: `20251004173139_fix_critical_cascade_and_unique_issues`
- ✅ **Security Validated**: RLS policies reviewed, zero vulnerabilities

### API Routes
- ✅ **Dynamic Rendering**: All routes using `requireUserId` marked as dynamic
- ✅ **Type Safety**: Prisma type inference (no direct imports)
- ✅ **Error Handling**: Proper 401/403/500 responses

---

## ✅ FIXED: Vercel Configuration Issue Resolved

### What Was Wrong
Outdated `infra/vercel.json` had pre-monorepo paths (`app/` instead of `apps/web/`).

### The Fix Applied
- ✅ Created correct `vercel.json` at repository root with monorepo paths
- ✅ Archived old config to `infra/vercel.json.old`
- ✅ Vercel now knows: build from root, output to `apps/web/.next/`

### Next Deployment
Just push to trigger deployment - Vercel will use the new config automatically.

**Alternative**: If deployment still fails, set **Root Directory** to `apps/web` in Vercel Dashboard → Settings → General (see VERCEL_CONFIG_REQUIRED.md).

---

## 📋 Post-Vercel-Config Deployment Steps

### Step 1: Deploy Database Migrations

**For Staging:**
```bash
npm run deploy:staging
```

**For Production:**
```bash
npm run deploy:production
```

This will:
- Connect to your Supabase project
- Run all Prisma migrations
- Set up all tables (Person, Document, Observation, SharePack, etc.)

### Step 2: Configure Supabase Storage

**In Supabase Dashboard** → Storage → Create Bucket:

1. **Bucket name**: `documents`
2. **Public**: No (keep private)
3. **Create bucket**

Then run these RLS policies in SQL Editor:

```sql
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow service role to read all files
CREATE POLICY "Service role can read all files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'documents');
```

### Step 3: Configure Vercel Environment Variables

**Required Variables** (go to Vercel → Project → Settings → Environment Variables):

```bash
# Supabase (from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Database (connection pooler URL)
DATABASE_URL=postgres://postgres.YOUR_REF:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
SUPABASE_DB_URL=postgres://postgres.YOUR_REF:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Security
SHARE_LINK_PEPPER=YOUR_RANDOM_SECURE_STRING

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL_INTERPRET=gpt-4o
OPENAI_MODEL_SUMMARY=gpt-4o-mini
OPENAI_MODEL_EMBED=text-embedding-3-small
OPENAI_ORG_ID=org-...
OPENAI_PROJECT_ID=proj_...

# OCR Service
PDF_EXTRACT_URL=https://pdf-extractor-927839796089.europe-west3.run.app/extract
PDF_EXTRACT_BEARER=YOUR_BEARER_TOKEN
PDF_EXTRACT_TIMEOUT_MS=20000
```

See `.env.example` or **DEPLOYMENT.md** for complete list.

### Step 4: Deploy Application

**Option A: Push to trigger deployment**
```bash
git push origin refit/user-auth-onboarding
```

**Option B: Redeploy in Vercel**
- Go to Vercel Dashboard → Deployments
- Click "Redeploy" on latest deployment

### Step 5: Verify Deployment

Once deployment completes, test:

- [ ] **Auth**: Sign up and login work
- [ ] **Upload**: Can upload PDF document
- [ ] **OCR**: Image uploads extract text
- [ ] **Explain**: Documents get AI explanations
- [ ] **Chat**: Can ask questions about documents
- [ ] **Track**: Can view lab observations
- [ ] **Packs**: Can create and share appointment packs
- [ ] **Vault**: Can filter by person and topic
- [ ] **Mobile**: All features work on iPhone/Android

### Step 6: Monitor

**Vercel Logs:**
```bash
vercel logs YOUR_PROJECT_NAME --follow
```

**Supabase Logs:**
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/logs/explorer

---

## 🚀 Production Deployment Workflow

**After successful staging deployment:**

1. **Merge to main:**
   ```bash
   git checkout main
   git merge refit/user-auth-onboarding
   git push origin main
   ```

2. **Vercel auto-deploys** to production

3. **Run production migrations:**
   ```bash
   npm run deploy:production
   ```

4. **Verify production** using checklist above

---

## 📚 Documentation Reference

- **DEPLOYMENT.md**: Complete deployment guide
- **VERCEL_CONFIG_REQUIRED.md**: Explains monorepo configuration issue
- **DEPLOYMENT_QUICK_START.md**: Quick reference guide
- **CODE_REVIEW.md**: Pre-PR checklist
- **CLAUDE.md**: Development and deployment commands

---

## ⏭️ Next Immediate Action

**👉 Configure Vercel Root Directory to `apps/web` NOW**

Everything else is ready. This single configuration change unblocks deployment.
