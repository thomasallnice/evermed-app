# Google Cloud Setup for Gemini 2.5 Flash

**Purpose:** Configure Google Cloud Vertex AI for food analysis with Gemini 2.5 Flash

---

## Prerequisites

- [ ] Google Cloud account (already have ✅)
- [ ] Google Cloud project created
- [ ] Billing enabled on project (required for Vertex AI)

---

## Step 1: Enable Vertex AI API

### Via Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project (or create new one)
3. Navigate to "APIs & Services" → "Library"
4. Search for "Vertex AI API"
5. Click "Enable"

### Via gcloud CLI (Alternative)
```bash
gcloud services enable aiplatform.googleapis.com
```

---

## Step 2: Create Service Account

### Via Google Cloud Console
1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Name: `evermed-vertex-ai`
4. Description: "Service account for Vertex AI food analysis"
5. Click "Create and Continue"

### Grant Roles
Add these roles to the service account:
- **Vertex AI User** (required for Gemini API access)
- **Storage Object Viewer** (optional, for Cloud Storage integration)

### Create Key
1. Click on the newly created service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Download the key file (e.g., `evermed-vertex-ai-key.json`)

---

## Step 3: Configure Environment Variables

### Local Development (.env.local)
```bash
# Google Cloud Vertex AI
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./keys/evermed-vertex-ai-key.json
USE_GEMINI_FOOD_ANALYSIS=true

# Keep OpenAI as fallback during migration
OPENAI_API_KEY=your-existing-openai-key
```

### Staging (.env.staging)
```bash
# Google Cloud Vertex AI (Staging)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./keys/evermed-vertex-ai-staging-key.json
USE_GEMINI_FOOD_ANALYSIS=true
```

### Production (.env.production)
```bash
# Google Cloud Vertex AI (Production)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./keys/evermed-vertex-ai-prod-key.json
USE_GEMINI_FOOD_ANALYSIS=true
```

---

## Step 4: Store Service Account Key Securely

### Local Development
1. Create `keys/` directory in project root:
   ```bash
   mkdir -p keys
   ```
2. Move downloaded JSON key to `keys/evermed-vertex-ai-key.json`
3. Add `keys/` to `.gitignore` (should already be there)
4. Verify key is NOT committed:
   ```bash
   git status # Should NOT show keys/ directory
   ```

### Vercel Deployment
**Option A: Environment Variable (Recommended for Vercel)**
1. Encode service account JSON to base64:
   ```bash
   cat keys/evermed-vertex-ai-key.json | base64
   ```
2. Add to Vercel environment variables:
   ```bash
   # Copy the base64 output, then:
   vercel env add GOOGLE_APPLICATION_CREDENTIALS_BASE64 production
   # Paste the base64 string when prompted
   ```
3. Decode in application startup (add to `apps/web/next.config.js`):
   ```javascript
   // Decode base64 service account key for Vercel
   if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
     const keyJson = Buffer.from(
       process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
       'base64'
     ).toString('utf-8')
     process.env.GOOGLE_APPLICATION_CREDENTIALS = keyJson
   }
   ```

**Option B: Vercel Secret Files (Alternative)**
- Not recommended: More complex, harder to rotate

---

## Step 5: Verify Configuration

### Test Script
Create `scripts/test-vertex-ai.mjs`:
```javascript
import { VertexAI } from '@google-cloud/vertexai'

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'us-central1',
})

const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
})

console.log('Testing Vertex AI connection...')

try {
  const result = await model.generateContent('Hello, Gemini!')
  console.log('✅ Success:', result.response.text())
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
```

### Run Test
```bash
npm run test:vertex-ai
# OR
node scripts/test-vertex-ai.mjs
```

Expected output:
```
Testing Vertex AI connection...
✅ Success: Hello! How can I help you today?
```

---

## Step 6: Update package.json

Add scripts for testing:
```json
{
  "scripts": {
    "test:vertex-ai": "node scripts/test-vertex-ai.mjs"
  }
}
```

---

## Security Best Practices

### ✅ DO
- Store service account keys in `keys/` directory (gitignored)
- Use separate service accounts for dev/staging/prod
- Rotate keys every 90 days
- Use base64 encoding for Vercel environment variables
- Limit service account permissions (Vertex AI User only)
- Enable audit logging for Vertex AI API usage

### ❌ DON'T
- Commit service account keys to git
- Share keys via Slack/email
- Use production keys in development
- Grant Owner or Editor roles to service accounts
- Store keys in public repositories

---

## Cost Monitoring

### Set Budget Alerts
1. Go to "Billing" → "Budgets & alerts"
2. Create budget: $50/month
3. Set alerts at 50%, 90%, 100%
4. Add email notifications

### Monitor Usage
- Dashboard: https://console.cloud.google.com/vertex-ai
- View token usage, API calls, costs
- Export billing data to BigQuery (optional)

### Expected Costs (EverMed)
- **Beta (200 photos/day):** ~$6.50/month
- **Scale (1,000 photos/day):** ~$32.50/month
- **Free tier:** First 1M Vertex AI API calls/month free

---

## Troubleshooting

### Error: "Permission denied"
**Solution:** Verify service account has "Vertex AI User" role

### Error: "Project not found"
**Solution:** Check `GOOGLE_CLOUD_PROJECT` matches your project ID (not project name)

### Error: "API not enabled"
**Solution:** Enable Vertex AI API (see Step 1)

### Error: "Invalid credentials"
**Solution:**
1. Verify JSON key file path is correct
2. Check key file is valid JSON
3. Ensure key hasn't been deleted from GCP console

### Error: "Quota exceeded"
**Solution:** Request quota increase or wait for quota reset (daily limits)

---

## Migration Checklist

- [ ] Enable Vertex AI API
- [ ] Create service account with Vertex AI User role
- [ ] Download service account key JSON
- [ ] Add `GOOGLE_CLOUD_PROJECT` to all `.env` files
- [ ] Add `GOOGLE_APPLICATION_CREDENTIALS` to all `.env` files
- [ ] Add `USE_GEMINI_FOOD_ANALYSIS=false` initially (feature flag)
- [ ] Verify keys are in `.gitignore`
- [ ] Test connection with `scripts/test-vertex-ai.mjs`
- [ ] Set billing alerts at $50/month
- [ ] Document key rotation schedule (90 days)

---

## Additional Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini API Reference](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)

---

## Next Steps

After completing this setup:
1. ✅ Install `@google-cloud/vertexai` SDK: `npm install @google-cloud/vertexai`
2. ✅ Implement `apps/web/src/lib/food-analysis-gemini.ts`
3. ✅ Add feature flag to API route
4. ✅ Test with sample photos
5. ✅ Deploy to staging
6. ✅ Monitor performance for 2 weeks
7. ✅ Remove OpenAI implementation after validation

**Estimated Setup Time:** 30-60 minutes
