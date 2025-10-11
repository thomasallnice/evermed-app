# Gemini 2.5 Flash Deployment Summary

**Date:** 2025-10-12
**Feature:** Gemini 2.5 Flash food photo analysis
**Status:** Ready for staging deployment
**Risk Level:** Low (feature flag, backwards compatible)

---

## Quick Overview

### What's Being Deployed
- **New feature:** Gemini 2.5 Flash food photo analysis via Google Vertex AI
- **Feature flag:** `USE_GEMINI_FOOD_ANALYSIS=true` enables Gemini, `false` falls back to OpenAI
- **No database changes:** No migrations, no RLS policy changes
- **Backwards compatible:** Existing OpenAI integration remains as fallback

### Why Gemini 2.5 Flash?
- **Better contextual understanding:** Correctly identifies complex dishes (e.g., Chicken Kiev vs. breaded strips)
- **Strategic fit:** Google Cloud Platform alignment, healthcare AI expertise (Med-PaLM)
- **Cost optimization:** Context caching (90% discount) planned for Phase 2
- **Future-proof:** Multimodal capabilities (audio, video) for advanced features

**Trade-off:** 33% higher cost ($0.000972 vs $0.000732) but mitigated with caching to ~$0.000300

---

## Deployment Steps (High-Level)

1. **Prepare Google Cloud credentials** → Base64 encode service account key
2. **Configure Vercel staging** → Set 3 new environment variables
3. **Run deployment script** → `./scripts/deploy-staging.sh`
4. **Deploy to Vercel** → Push `dev` branch or manual deploy
5. **Validate functionality** → Upload test photo, verify Gemini provider used
6. **Monitor for 24-48 hours** → Check errors, performance, cost
7. **Deploy to production** → After staging validation passes

**Estimated time:** 15-20 minutes
**Rollback time:** < 2 minutes (feature flag toggle)

---

## Key Environment Variables

| Variable | Value | Environment | Notes |
|----------|-------|-------------|-------|
| `GOOGLE_CLOUD_PROJECT` | `evermed-ai-1753452627` | Staging/Production | Project ID |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | `<base64-encoded>` | Staging/Production | Service account key (Secret) |
| `USE_GEMINI_FOOD_ANALYSIS` | `true` | Staging/Production | Feature flag |

**Fallback:** If Gemini fails, API route automatically falls back to OpenAI (no downtime)

---

## Success Criteria

### Technical
- [x] Build passes locally
- [ ] No console errors in staging
- [ ] Food analysis completes in < 15s
- [ ] Gemini provider logs present
- [ ] Database records created correctly

### Functional
- [ ] User can upload food photo
- [ ] Ingredients detected correctly (≥80% accuracy)
- [ ] Nutrition totals calculated
- [ ] Fallback to OpenAI works

### Business
- [ ] Cost per photo ≤ $0.001
- [ ] No critical errors in 24-hour monitoring
- [ ] Ready for production deployment

---

## Rollback Plan

**If critical issues found:**
1. Set `USE_GEMINI_FOOD_ANALYSIS=false` in Vercel (< 2 minutes)
2. Or revert git commit and redeploy (< 5 minutes)

**When to rollback:**
- Error rate > 5%
- Average response time > 20s
- Cost spike (> $0.01 per photo)
- Authentication errors with Vertex AI

---

## Documentation

- **Deployment Plan:** `docs/deployments/GEMINI_STAGING_DEPLOYMENT_PLAN.md` (comprehensive guide)
- **Execution Checklist:** `docs/deployments/GEMINI_STAGING_EXECUTION_CHECKLIST.md` (step-by-step)
- **Decision Doc:** `docs/FOOD_ANALYSIS_MODEL_DECISION.md` (rationale and benchmarks)
- **Benchmark Report:** `docs/GEMINI_VS_OPENAI_BENCHMARK_REPORT.md` (performance comparison)

---

## What to Monitor After Deployment

### Vercel Logs
- Check for 500 errors
- Verify Gemini provider logs
- Confirm no missing env var warnings

### Google Cloud Console
- Monitor Vertex AI usage
- Verify cost per request (~$0.000972)
- Check for authentication errors

### Database
- Verify FoodEntry records created
- Check FoodPhoto `analysisStatus = 'completed'`
- Confirm FoodIngredient records populated

### Performance
- Average response time: 10-12s (target)
- Cold start time: < 20s
- Error rate: < 1%

---

## Next Steps

### After Staging (24-48 hours)
1. Collect internal team feedback
2. Validate cost projections
3. Document any issues found
4. Update decision doc with results

### Production Deployment (Week 1)
1. Fix pre-existing test failures
2. Get stakeholder approval
3. Deploy to production with monitoring
4. Monitor for 2 weeks (see decision doc success criteria)

### Optimization (Month 1)
1. Implement context caching (90% discount)
2. Optimize prompt for better granularity
3. Collect user feedback on accuracy

---

## Known Issues

- ⚠️ 9 pre-existing test failures (analytics suite - unrelated to Gemini)
- ⚠️ Cold start may take 15-20s (show loading spinner)
- ⚠️ Context caching not yet implemented (Phase 2)
- ⚠️ Service account key rotation due in 90 days

---

**Status:** ✅ Ready for staging deployment
**Owner:** Engineering Team
**Last Updated:** 2025-10-12
