# URGENT VERCEL FIX

## Issue 1: DATABASE_URL Must Be Direct Value

**ERROR:** "the URL must start with the protocol postgresql:// or postgres://"

**CAUSE:** In your local .env, you have:
```
DATABASE_URL=${SUPABASE_DB_URL}
```

This shell variable substitution **does NOT work** in Vercel!

**FIX IN VERCEL:**

Go to: https://vercel.com/thomasallnices-projects/evermed-app/settings/environment-variables

Find `DATABASE_URL` and change it to the **direct value**:

```
DATABASE_URL=postgres://postgres:jd60945lkdjfaljDjDDDDjg89jfkl@db.wukrnqifpgjwbqxpockm.supabase.co:5432/postgres
```

**NOT:**
```
DATABASE_URL=${SUPABASE_DB_URL}  ❌ This doesn't work in Vercel
```

---

## Issue 2: Supabase Storage Bucket Missing

**ERROR:** "Bucket not found"

**CAUSE:** The `documents` storage bucket doesn't exist in your Supabase project yet.

**FIX IN SUPABASE:**

### Step 1: Create Bucket

1. Go to: https://supabase.com/dashboard/project/wukrnqifpgjwbqxpockm/storage/buckets
2. Click **"New Bucket"**
3. **Name:** `documents`
4. **Public bucket:** ❌ No (keep private)
5. Click **"Create bucket"**

### Step 2: Add RLS Policies

Go to: https://supabase.com/dashboard/project/wukrnqifpgjwbqxpockm/storage/policies

Click **"New Policy"** and run this SQL:

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

---

## After Both Fixes

1. ✅ Fix DATABASE_URL in Vercel (use direct value, not ${VAR})
2. ✅ Create storage bucket in Supabase
3. ✅ Add RLS policies
4. Go to Vercel → Deployments → Click "Redeploy"
5. Test the app again

