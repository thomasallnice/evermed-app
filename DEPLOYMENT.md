# EverMed.ai Deployment Guide

This guide covers deploying EverMed to **Staging** and **Production** environments using Supabase Cloud and Vercel.

## Prerequisites

1. **Supabase Projects**: Create two separate Supabase projects:
   - Staging: `https://supabase.com/dashboard/new/project`
   - Production: `https://supabase.com/dashboard/new/project`

2. **Vercel Projects**: Create two Vercel projects linked to your GitHub repository:
   - Staging: Connected to `staging` branch (or main with staging environment)
   - Production: Connected to `main` branch

3. **Supabase CLI**: Install globally
   ```bash
   npm install -g supabase
   ```

4. **Access Tokens**: Generate at https://supabase.com/dashboard/account/tokens

## Step 1: Configure Environment Variables

### 1.1 Update `.env` file

Fill in these values in your `.env` file:

```bash
# Get from: https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx

# Staging Project
SUPABASE_STAGING_PROJECT_REF=abcdefghijklmnop  # From project settings
SUPABASE_STAGING_DB_PASSWORD=your_staging_db_password

# Production Project
SUPABASE_PRODUCTION_PROJECT_REF=qrstuvwxyzabcdef  # From project settings
SUPABASE_PRODUCTION_DB_PASSWORD=your_production_db_password
```

**How to find these values:**

- **Access Token**: Supabase Dashboard → Account → Access Tokens → Generate new token
- **Project Ref**: Supabase Dashboard → Project → Settings → General → Reference ID
- **DB Password**: The password you set when creating the project (reset in Settings → Database if needed)

### 1.2 Configure Vercel Monorepo Settings

**⚠️ CRITICAL**: This is a monorepo project. You MUST configure Vercel correctly or deployments will fail.

In Vercel Dashboard → Your Project → Settings → General:

1. **Root Directory**: Set to `apps/web` (click Override and enter `apps/web`)
2. **Build Command**: Leave as default (`npm run build`)
3. **Output Directory**: Leave as default (`.next`)
4. **Install Command**: Leave as default (`npm install`)

**Without setting Root Directory to `apps/web`, the build will fail with "routes-manifest.json not found".**

### 1.3 Create Vercel Environment Variables

You'll need to add environment variables in Vercel for each project.

**For STAGING Vercel Project:**

Go to Vercel Dashboard → Your Staging Project → Settings → Environment Variables

Add these variables (using your **staging** Supabase credentials):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_STAGING_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  (from Supabase project settings)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...      (from Supabase project settings)
SUPABASE_DB_URL=postgres://postgres.YOUR_STAGING_REF:DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
DATABASE_URL=postgres://postgres.YOUR_STAGING_REF:DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres

SHARE_LINK_PEPPER=YOUR_RANDOM_SECURE_STRING  (generate a new one for staging)

OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL_INTERPRET=gpt-4o
OPENAI_MODEL_SUMMARY=gpt-4o-mini
OPENAI_MODEL_EMBED=text-embedding-3-small
OPENAI_ORG_ID=org-...
OPENAI_PROJECT_ID=proj_...

PDF_EXTRACT_URL=https://pdf-extractor-927839796089.europe-west3.run.app/extract
PDF_EXTRACT_BEARER=YOUR_BEARER_TOKEN
PDF_EXTRACT_TIMEOUT_MS=20000
```

**For PRODUCTION Vercel Project:**

Same variables as staging, but use your **production** Supabase credentials and a different `SHARE_LINK_PEPPER`.

## Step 2: Deploy Database to Staging

Run this script to deploy migrations to your **Staging** environment:

```bash
npm run deploy:staging
```

This will:
1. Link to your staging Supabase project
2. Push all Prisma migrations
3. Verify the deployment

**Manual alternative:**
```bash
source .env
export PGPASSWORD=$SUPABASE_STAGING_DB_PASSWORD
export DATABASE_URL="postgresql://postgres:$SUPABASE_STAGING_DB_PASSWORD@db.$SUPABASE_STAGING_PROJECT_REF.supabase.co:5432/postgres"

cd db
npx prisma migrate deploy
```

## Step 3: Deploy Database to Production

**IMPORTANT**: Only do this after thoroughly testing staging!

```bash
npm run deploy:production
```

**Manual alternative:**
```bash
source .env
export PGPASSWORD=$SUPABASE_PRODUCTION_DB_PASSWORD
export DATABASE_URL="postgresql://postgres:$SUPABASE_PRODUCTION_DB_PASSWORD@db.$SUPABASE_PRODUCTION_PROJECT_REF.supabase.co:5432/postgres"

cd db
npx prisma migrate deploy
```

## Step 4: Configure Supabase Storage

For each environment (Staging & Production), you need to create the storage bucket:

### 4.1 Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/storage/buckets
2. Click **New Bucket**
3. Name: `documents`
4. Public bucket: **No** (keep private)
5. Click **Create bucket**

### 4.2 Configure Storage RLS Policies

Run this SQL in the Supabase SQL Editor for each environment:

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

-- Allow service role to read all files (for admin operations)
CREATE POLICY "Service role can read all files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'documents');
```

## Step 5: Deploy to Vercel

### 5.1 Staging Deployment

Push to your staging branch:

```bash
git checkout -b staging
git push origin staging
```

Vercel will automatically deploy. Monitor at: `https://vercel.com/your-team/evermed-staging`

### 5.2 Production Deployment

Merge to main and push:

```bash
git checkout main
git merge staging
git push origin main
```

Vercel will automatically deploy. Monitor at: `https://vercel.com/your-team/evermed-production`

## Step 6: Post-Deployment Verification

### 6.1 Smoke Test Checklist

For each environment, verify:

- [ ] **Auth**: Can sign up and log in
- [ ] **Upload**: Can upload a PDF document
- [ ] **OCR**: Image uploads extract text
- [ ] **Explain**: Documents get AI explanations
- [ ] **Chat**: Can ask questions about documents
- [ ] **Track**: Can view lab observations
- [ ] **Packs**: Can create and share appointment packs
- [ ] **Vault**: Can filter by person and topic

### 6.2 Check Logs

**Vercel Logs:**
```bash
vercel logs YOUR_PROJECT_NAME --follow
```

**Supabase Logs:**
Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/logs/explorer

## Deployment Scripts

Add these to your root `package.json`:

```json
{
  "scripts": {
    "deploy:staging": "node scripts/deploy-db.js staging",
    "deploy:production": "node scripts/deploy-db.js production"
  }
}
```

## Rollback Procedure

If something goes wrong:

### Database Rollback

Prisma migrations are forward-only. To rollback:

1. Restore from Supabase backup:
   - Go to: Dashboard → Database → Backups
   - Select a backup from before the deployment
   - Click Restore

### Application Rollback

1. In Vercel, go to Deployments
2. Find the previous working deployment
3. Click "Promote to Production"

## Security Checklist

Before going live:

- [ ] Rotate `SHARE_LINK_PEPPER` (different for staging/prod)
- [ ] Use separate OpenAI API keys for staging/prod
- [ ] Enable Vercel protection for staging (password protect)
- [ ] Set up monitoring (Sentry, Vercel Analytics, Supabase Logs)
- [ ] Configure rate limiting in Vercel
- [ ] Review all RLS policies in Supabase
- [ ] Test with PHI data only in staging (never production test data)
- [ ] Set up automated backups in Supabase

## Troubleshooting

### "Permission denied for schema public"

This means RLS policies aren't set up. We use Prisma with service role, so this shouldn't happen. But if it does, ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly in Vercel.

### "Failed to connect to database"

Check:
1. `DATABASE_URL` is correct in Vercel
2. Connection pooler URL is used (port 6543, not 5432)
3. Password doesn't have special characters that need escaping

### Migrations fail

```bash
# Reset and re-run (STAGING ONLY!)
cd db
npx prisma migrate reset --force
npx prisma migrate deploy
```

### Storage upload fails

Check:
1. Bucket `documents` exists
2. RLS policies are created
3. `SUPABASE_SERVICE_ROLE_KEY` is correct

## Monitoring & Alerts

Set up monitoring for:

- **Vercel**: Function errors, build failures
- **Supabase**: Auth errors, database errors, storage errors
- **OpenAI**: Rate limits, API errors
- **Custom**: Track P0/P1 incidents in analytics events

## Next Steps

1. Set up CI/CD pipeline with automatic migrations
2. Configure staging → production promotion workflow
3. Set up monitoring and alerting
4. Create runbook for common issues
5. Schedule regular backup testing
