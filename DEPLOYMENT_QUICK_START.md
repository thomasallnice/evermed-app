# Deployment Quick Start

## What's Been Set Up

I've configured the deployment infrastructure for EverMed.ai. Here's what's ready:

### ✅ Files Created

1. **DEPLOYMENT.md** - Complete deployment guide with step-by-step instructions
2. **scripts/deploy-db.js** - Automated database deployment script
3. **.env.staging.template** - Template for Vercel staging environment variables
4. **.env.production.template** - Template for Vercel production environment variables
5. **.env** - Updated with deployment variable placeholders

### ✅ npm Scripts Added

- `npm run deploy:staging` - Deploy database migrations to staging
- `npm run deploy:production` - Deploy database migrations to production

## Next Steps (In Order)

### 1. Complete .env Configuration

Fill in these values in your `.env` file:

```bash
# From: https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=sbp_...

# Staging (you need to add these)
SUPABASE_STAGING_PROJECT_REF=...
SUPABASE_STAGING_DB_PASSWORD=...

# Production (you've already added!)
SUPABASE_PRODUCTION_PROJECT_REF=nqlxlkhbriqztkzwbdif  ✓
SUPABASE_PRODUCTION_DB_PASSWORD=FFr#su46VK9mk%EDu9LaJGMW  ✓
```

### 2. Deploy Database to Production

Once you've filled in `.env`, run:

```bash
npm run deploy:production
```

This will:
- Connect to your production Supabase
- Run all Prisma migrations
- Set up all tables (Person, Document, Observation, SharePack, etc.)

⚠️  **Note**: The script will ask you to type "DEPLOY" to confirm since it's production.

### 3. Set Up Supabase Storage

After database deployment, you need to create the storage bucket.

**In Supabase Dashboard** → Production Project → Storage:

1. Create new bucket: `documents` (private)
2. Run these SQL policies in SQL Editor:

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

### 4. Configure Vercel Environment Variables

**For Production Vercel Project:**

Go to: https://vercel.com/YOUR_TEAM/evermed-production/settings/environment-variables

Copy all variables from `.env.production.template` and add them in Vercel:

**Critical variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - From Supabase Dashboard → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase Dashboard → Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard → Project Settings → API
- `DATABASE_URL` - Connection string (see template for format)
- `SHARE_LINK_PEPPER` - Generate new random string (NOT from .env!)
- `OPENAI_API_KEY` - Your production OpenAI key
- All other variables from the template

### 5. Deploy to Vercel

```bash
# Make sure all changes are committed
git add .
git commit -m "feat: add deployment configuration"

# Push to main (triggers production deployment)
git push origin main
```

Vercel will automatically:
- Detect the push to main
- Build the Next.js app
- Deploy to production URL
- Use the environment variables you configured

### 6. Verify Deployment

After Vercel deployment completes:

1. Visit your production URL
2. Test authentication (sign up/login)
3. Upload a document
4. Verify all features work:
   - [ ] Upload works
   - [ ] Explain generates summaries
   - [ ] Chat works
   - [ ] Track page loads
   - [ ] Packs can be created

### 7. Monitor

Check logs for any errors:

```bash
# Vercel logs
vercel logs YOUR_PROJECT_NAME --follow

# Supabase logs
# Go to: https://supabase.com/dashboard/project/nqlxlkhbriqztkzwbdif/logs/explorer
```

## For Staging (Later)

When you're ready to set up staging:

1. Create a new Supabase project for staging
2. Fill in `SUPABASE_STAGING_*` variables in `.env`
3. Run `npm run deploy:staging`
4. Set up Vercel staging environment
5. Use `.env.staging.template` for Vercel env vars

## Troubleshooting

### Database Connection Fails

If you see "Failed to connect to database":

1. Check password has special characters URL-encoded
2. Verify project ref is correct
3. Make sure you're using connection pooler (port 6543)

Example correct format:
```
postgresql://postgres.nqlxlkhbriqztkzwbdif:FFr%23su46VK9mk%25EDu9LaJGMW@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

Note the URL encoding:
- `#` → `%23`
- `%` → `%25`

### Vercel Build Fails

Check that all required environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `DATABASE_URL`

### Storage Upload Fails

Make sure:
1. Bucket `documents` exists in Supabase Storage
2. RLS policies are applied (see SQL above)
3. `SUPABASE_SERVICE_ROLE_KEY` is correct in Vercel

## Need Help?

Refer to the complete guide: **DEPLOYMENT.md**
