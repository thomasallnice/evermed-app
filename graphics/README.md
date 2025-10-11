# Graphics Test Assets

**Purpose:** This folder contains test images for benchmarking and comparing LLM food recognition capabilities.

**Status:** Gitignored (contents not committed to repository)

---

## Contents

### `/dummy-food/`

Collection of diverse food images used for testing and benchmarking:
- **Gemini 2.5 Flash** (Google Vertex AI)
- **GPT-5-mini** (OpenAI)

**Use Cases:**
- Food recognition accuracy testing
- Nutritional analysis validation
- Response time benchmarking
- Cost comparison analysis
- JSON parsing consistency testing

---

## Test Images

The `dummy-food/` subdirectory contains various food photos representing different cuisines and complexity levels:

- Pizza, pasta, salads
- Breakfast bowls, sandwiches
- Mixed dishes, single ingredients
- Various portion sizes
- Different lighting conditions

---

## Running Tests

### Test Gemini with local images:
```bash
node scripts/test-gemini-local-image.mjs graphics/dummy-food/pizza.jpg
```

### Compare Gemini vs OpenAI:
```bash
npm run test:compare-food-analysis
```

### Batch test all images:
```bash
npm run test:food-batch
```

---

## Benchmarking Results

Results are documented in:
- `docs/GEMINI_VS_OPENAI_TEST_RESULTS.md`
- `docs/TECH_STACK_GPT5_MINI_VS_GEMINI_COMPARISON.md`

---

## Adding New Test Images

1. Add images to `graphics/dummy-food/`
2. Use descriptive filenames (e.g., `mediterranean-salad-bowl.jpg`)
3. Supported formats: JPG, PNG, WebP
4. Recommended size: < 5MB (matches production limits)

---

## Notes

- **Not committed:** All images in this folder are gitignored to keep repository size small
- **Local only:** Test images should be stored locally or in a separate asset repository
- **Production images:** Real user photos are stored in Supabase Storage with RLS policies

---

**Last Updated:** 2025-01-11
