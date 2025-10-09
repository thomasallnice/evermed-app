# Vercel Bypass Token Setup for Automated Testing

## What is a Vercel Bypass Token?

A Vercel bypass token allows automated tools (like our deployment-validator subagent) to access deployment preview URLs that are protected by Vercel's deployment protection feature.

**Use case:** Enables Chrome DevTools MCP to test protected deployments without disabling security.

---

## How to Get the Bypass Token

### Step 1: Go to Vercel Dashboard

1. Navigate to: https://vercel.com/thomasallnices-projects/evermed-app
2. Click on **Settings** in the top navigation
3. Click on **Deployment Protection** in the left sidebar

### Step 2: Generate Protection Bypass Token

1. Scroll to the **"Protection Bypass for Automation"** section
2. Click **"Create Token"** or **"Generate New Token"**
3. **Copy the token** (it will look like: `bypass_xxxxxxxxxxxxxxxxxxxxx`)
4. **Store it securely** - you'll only see it once

### Step 3: Provide Token to Claude Code

Once you have the token, provide it to me in this format:

```
Here's the Vercel bypass token: bypass_xxxxxxxxxxxxxxxxxxxxx
```

---

## What Happens Next

After you provide the token, I will:

1. **Invoke deployment-validator subagent** with bypass token
2. **Run comprehensive automated tests:**
   - Navigate to all critical pages with token authentication
   - Take screenshots of each page
   - Check for zero console errors (BLOCK if any found)
   - Validate performance (p95 < 10s requirement)
   - Test mobile responsiveness (3 breakpoints)
   - Verify API health (no 500 errors, no broken endpoints)
   - Confirm DATABASE_URL works (no Prisma errors)
   - Confirm storage bucket works (no "Bucket not found")

3. **Generate validation report:**
   - ✅ Passed tests (count)
   - ❌ Failed tests (count)
   - Console errors list (if any)
   - Performance metrics (LCP, FID, CLS, p95)
   - Screenshots stored in `tests/screenshots/deployment-verification/`
   - **VERDICT: Ready for production YES/NO**

---

## Security Notes

✅ **Safe to use:**
- Token only works for preview deployments, not production
- Token can be revoked anytime from Vercel Dashboard
- Token is scoped to this project only
- Token bypasses deployment protection, not authentication/authorization

⚠️ **Best practices:**
- Don't commit token to git
- Store in environment variables for CI/CD
- Revoke token when no longer needed
- Rotate token periodically

---

## Alternative: Vercel CLI Method

If you prefer using Vercel CLI:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Generate bypass token
vercel project ls
vercel env add VERCEL_AUTOMATION_BYPASS_SECRET
# Paste the token when prompted
```

---

## Troubleshooting

**"I don't see Protection Bypass for Automation"**
- Ensure you're on a paid Vercel plan (Hobby plan may not have this feature)
- Ensure deployment protection is enabled first
- Contact Vercel support if option is missing

**"Token doesn't work"**
- Verify token is copied correctly (no extra spaces)
- Ensure token starts with `bypass_`
- Check token hasn't been revoked
- Try regenerating a new token

---

## Ready?

Once you have the bypass token, paste it here and I'll immediately start the automated validation!

Format:
```
bypass_xxxxxxxxxxxxxxxxxxxxx
```
