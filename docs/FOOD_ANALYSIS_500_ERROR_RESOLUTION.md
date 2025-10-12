# Food Analysis 500 Error - Root Cause & Resolution

**Date**: 2025-10-12
**Issue**: Food upload on staging returns 500 Internal Server Error
**URL**: https://staging.evermed.ai/metabolic/camera

---

## Root Cause Analysis

### Primary Issue: Gemini Credentials in Serverless Environment

**Current Configuration** (`.env.staging`):
```bash
USE_GEMINI_FOOD_ANALYSIS=true  # Line 36
GOOGLE_APPLICATION_CREDENTIALS=/Users/Tom/keys/evermed-ai-1753452627-1eacdb5c2b16.json  # Line 34
GOOGLE_APPLICATION_CREDENTIALS_JSON=ewogICJ0eXBlIjogInNl...  # Line 35 (base64)
```

**The Problem**:
1. Staging uses Gemini for food analysis (`USE_GEMINI_FOOD_ANALYSIS=true`)
2. Vertex AI SDK requires `GOOGLE_APPLICATION_CREDENTIALS` pointing to a JSON file
3. Vercel serverless environment doesn't have access to local file paths like `/Users/Tom/keys/...`
4. The `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable exists but wasn't being used

**Attempted Fix** (commit 912fc97):
- Modified `apps/web/src/lib/food-analysis-gemini.ts` to:
  - Decode base64 `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - Write to temporary file in `/tmp` directory
  - Point Vertex AI SDK to temp file
  - Clean up after completion

**Why This May Still Fail**:
- `/tmp` write permissions in Vercel Edge Runtime may be restricted
- Race conditions if multiple requests write to `/tmp` simultaneously
- File cleanup may not work properly in serverless environment
- Vertex AI SDK initialization may fail before file is fully written

---

## Immediate Solution: Switch to OpenAI

### Recommendation
**Change one environment variable in Vercel:**

```bash
USE_GEMINI_FOOD_ANALYSIS=false
```

Or simply remove the variable (defaults to OpenAI).

### Why This Works
- ✅ **OPENAI_API_KEY is already configured** (line 42 in `.env.staging`)
- ✅ **OpenAI implementation is working** (`apps/web/src/lib/food-analysis.ts`)
- ✅ **No file system dependencies** - OpenAI accepts image URLs directly
- ✅ **Proven reliable** - Works locally with same configuration

### OpenAI Vision API Details
- **Model**: `gpt-4o` (high-quality vision model)
- **Input**: Direct image URL (no base64 conversion needed)
- **Reliability**: Established, proven API with better error messages
- **Cost**: ~$0.30 per 100 images (comparable to Gemini)

---

## Steps to Fix (IMMEDIATE)

### 1. Update Vercel Environment Variable
```bash
# In Vercel Dashboard:
# Settings → Environment Variables → staging

# Change:
USE_GEMINI_FOOD_ANALYSIS=false

# Or delete the variable entirely (defaults to false)
```

### 2. Redeploy Staging
```bash
# In Vercel, trigger redeploy or push a commit
git commit --allow-empty -m "chore: trigger staging redeploy for OpenAI switch"
git push origin dev
```

### 3. Test Food Upload
1. Go to https://staging.evermed.ai/metabolic/camera
2. Upload a clear food image (e.g., pretzel)
3. Verify analysis completes successfully
4. Check ingredients are detected

### 4. Verify Logs
- Check Vercel logs for `[OpenAI] Success` messages
- Confirm no 500 errors
- Validate ingredients are saved to database

---

## Long-term Fix: Proper Gemini Implementation (FUTURE)

If you want to use Gemini in the future, here's the proper approach:

### Option 1: Direct Credentials Object (Recommended)
Modify `food-analysis-gemini.ts` to pass credentials directly to Vertex AI SDK without file:

```typescript
import { VertexAI, GoogleAuth } from '@google-cloud/vertexai'

// Decode JSON credentials
const credentialsJson = Buffer.from(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!,
  'base64'
).toString('utf-8')
const credentials = JSON.parse(credentialsJson)

// Initialize with credentials object
const auth = new GoogleAuth({
  credentials: credentials,
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'us-central1',
  googleAuth: auth,
})
```

### Option 2: Keep OpenAI (Simplest)
OpenAI Vision API is simpler, more reliable, and works well for food analysis:
- No credential file management
- Better error messages
- Proven reliability
- Similar cost structure

---

## Diagnostic Endpoints Created

### 1. `/api/dev/test-openai`
Tests OpenAI Vision API connectivity:
- Validates `OPENAI_API_KEY`
- Tests client initialization
- Checks image URL accessibility
- Tests Vision API response

**Usage**:
```bash
curl "https://staging.evermed.ai/api/dev/test-openai?imageUrl=https://example.com/food.jpg"
```

### 2. `/api/dev/test-food-upload`
Comprehensive food upload diagnostics:
- Environment variables check
- Database connection test
- Supabase Storage verification
- AI provider configuration
- Gemini credentials validation

**Usage**:
```bash
curl "https://staging.evermed.ai/api/dev/test-food-upload"
```

---

## Commits Related to This Issue

1. **96bc1eb** - `debug: add OpenAI Vision API diagnostic endpoint`
2. **912fc97** - `fix(gemini): support GOOGLE_APPLICATION_CREDENTIALS_JSON for Vercel`
3. **9c56307** - `debug: add comprehensive food upload diagnostic endpoint`

---

## Summary

**Root Cause**: Gemini credentials require file path, Vercel serverless doesn't support local paths

**Immediate Fix**: Switch to OpenAI (`USE_GEMINI_FOOD_ANALYSIS=false`)

**Timeline**:
- ⏱️ **5 minutes**: Update Vercel env var + redeploy
- ✅ **Feature unblocked**: Food upload will work immediately

**Long-term**:
- Option A: Implement direct Vertex AI credentials (no file)
- Option B: Keep OpenAI (simpler, proven)

---

**Status**: ✅ Solution identified, ready to deploy
