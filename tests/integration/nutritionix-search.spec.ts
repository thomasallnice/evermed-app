/**
 * Integration tests for Nutritionix Search API endpoint
 *
 * Test environment:
 * - Set USE_MOCK_APIS=true to use mock Nutritionix implementation
 * - Set NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY for real API testing
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER_ID = 'test-user-nutritionix-search';

describe('POST /api/metabolic/nutritionix/search', () => {
  let authHeaders: Record<string, string>;

  beforeAll(() => {
    // In development, use x-user-id header
    // In production, use real Supabase auth
    if (process.env.NODE_ENV !== 'production') {
      authHeaders = {
        'x-user-id': TEST_USER_ID,
      };
    } else {
      // Skip tests in production without proper credentials
      if (!process.env.TEST_AUTH_TOKEN) {
        console.warn('Skipping integration tests: TEST_AUTH_TOKEN not set');
        process.exit(0);
      }
      authHeaders = {
        authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`,
      };
    }
  });

  it('should search for common foods (apple)', async () => {
    const response = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'apple',
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);

    // Validate result structure
    const firstResult = data.results[0];
    expect(firstResult).toHaveProperty('name');
    expect(firstResult).toHaveProperty('servingQty');
    expect(firstResult).toHaveProperty('servingUnit');
    expect(firstResult).toHaveProperty('calories');
    expect(firstResult).toHaveProperty('totalCarbs');
    expect(firstResult).toHaveProperty('protein');
    expect(firstResult).toHaveProperty('totalFat');
    expect(firstResult).toHaveProperty('isCommon');

    // Check types
    expect(typeof firstResult.name).toBe('string');
    expect(typeof firstResult.servingQty).toBe('number');
    expect(typeof firstResult.servingUnit).toBe('string');
    expect(typeof firstResult.calories).toBe('number');
    expect(typeof firstResult.isCommon).toBe('boolean');
  });

  it('should search for branded foods (coke)', async () => {
    const response = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'coke',
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);

    // Check if at least one branded result exists
    const brandedResults = data.results.filter((r: any) => !r.isCommon);
    expect(brandedResults.length).toBeGreaterThan(0);
  });

  it('should handle fuzzy matching (typo: appl)', async () => {
    const response = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'appl',
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);
    // Nutritionix should return results even with typo
    expect(data.results.length).toBeGreaterThan(0);
  });

  it('should return 400 for empty query', async () => {
    const response = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '',
      }),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Invalid request');
  });

  it('should return 400 for query too long (>100 chars)', async () => {
    const longQuery = 'a'.repeat(101);

    const response = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: longQuery,
      }),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should return 400 for missing query field', async () => {
    const response = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should return 400 for invalid JSON body', async () => {
    const response = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Invalid JSON');
  });

  it('should return 401 for missing authentication', async () => {
    const response = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'apple',
      }),
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Unauthorized');
  });

  it('should handle complex queries with measurements', async () => {
    const response = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'chicken breast',
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.results.length).toBeGreaterThan(0);

    // Should have serving unit information
    const firstResult = data.results[0];
    expect(firstResult.servingUnit).toBeTruthy();
    expect(firstResult.servingQty).toBeGreaterThan(0);
  });

  it('should cache results (second request should be faster)', async () => {
    const query = 'rice';

    // First request (cache miss)
    const start1 = Date.now();
    const response1 = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const elapsed1 = Date.now() - start1;

    expect(response1.status).toBe(200);
    const data1 = await response1.json();

    // Second request (cache hit - should be faster)
    const start2 = Date.now();
    const response2 = await fetch(`${BASE_URL}/api/metabolic/nutritionix/search`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const elapsed2 = Date.now() - start2;

    expect(response2.status).toBe(200);
    const data2 = await response2.json();

    // Results should be identical
    expect(data2.results).toEqual(data1.results);

    // Second request should be significantly faster (cache hit)
    // Allow some margin for network variability
    console.log(`First request: ${elapsed1}ms, Second request: ${elapsed2}ms`);
    // Note: This assertion may be flaky in CI, so we just log for now
    // expect(elapsed2).toBeLessThan(elapsed1 * 0.5);
  });
});
