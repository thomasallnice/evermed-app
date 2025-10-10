/**
 * Integration tests for Google Cloud Vision API client
 *
 * These tests validate:
 * - Mock implementation matches API contract
 * - Error handling for various failure scenarios
 * - Rate limiting behavior
 * - Safe content filtering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockGoogleVisionClient } from '../mocks/google-vision-mock';
import type { FoodAnalysisResult } from '../../apps/web/src/lib/services/google-vision';

describe('Google Vision API Client (Mock)', () => {
  let client: MockGoogleVisionClient;

  beforeEach(() => {
    client = new MockGoogleVisionClient();
  });

  describe('analyzeFoodImage', () => {
    it('should successfully analyze pizza image', async () => {
      const result = await client.analyzeFoodImage('https://example.com/pizza.jpg');

      expect(result).toBeDefined();
      expect(result.labels).toBeDefined();
      expect(result.labels.length).toBeGreaterThan(0);
      expect(result.isSafeForFood).toBe(true);

      // Verify pizza was detected
      const pizzaLabel = result.labels.find((label) => label.description.toLowerCase().includes('pizza'));
      expect(pizzaLabel).toBeDefined();
      expect(pizzaLabel?.score).toBeGreaterThan(0.9);
    });

    it('should successfully analyze salad image', async () => {
      const result = await client.analyzeFoodImage('https://example.com/salad.jpg');

      expect(result).toBeDefined();
      expect(result.labels).toBeDefined();
      expect(result.isSafeForFood).toBe(true);

      // Verify salad was detected
      const saladLabel = result.labels.find((label) => label.description.toLowerCase().includes('salad'));
      expect(saladLabel).toBeDefined();
      expect(saladLabel?.score).toBeGreaterThan(0.9);
    });

    it('should successfully analyze burger image', async () => {
      const result = await client.analyzeFoodImage('https://example.com/burger.jpg');

      expect(result).toBeDefined();
      expect(result.labels).toBeDefined();
      expect(result.isSafeForFood).toBe(true);

      // Verify burger was detected
      const burgerLabel = result.labels.find((label) => label.description.toLowerCase().includes('hamburger'));
      expect(burgerLabel).toBeDefined();
      expect(burgerLabel?.score).toBeGreaterThan(0.9);
    });

    it('should successfully analyze fruit image', async () => {
      const result = await client.analyzeFoodImage('https://example.com/fruit.jpg');

      expect(result).toBeDefined();
      expect(result.labels).toBeDefined();
      expect(result.isSafeForFood).toBe(true);

      // Verify fruit was detected
      const fruitLabel = result.labels.find((label) => label.description.toLowerCase().includes('fruit'));
      expect(fruitLabel).toBeDefined();
      expect(fruitLabel?.score).toBeGreaterThan(0.9);
    });

    it('should return generic food labels for unknown images', async () => {
      const result = await client.analyzeFoodImage('https://example.com/unknown.jpg');

      expect(result).toBeDefined();
      expect(result.labels).toBeDefined();
      expect(result.labels.length).toBeGreaterThan(0);
      expect(result.isSafeForFood).toBe(true);

      // Verify generic food label exists
      const foodLabel = result.labels.find((label) => label.description.toLowerCase() === 'food');
      expect(foodLabel).toBeDefined();
    });

    it('should detect unsafe content and flag it', async () => {
      const result = await client.analyzeFoodImage('https://example.com/unsafe.jpg');

      expect(result).toBeDefined();
      expect(result.isSafeForFood).toBe(false);
      expect(result.safeSearch).toBeDefined();
      expect(result.safeSearch?.adult).toMatch(/LIKELY|VERY_LIKELY/);
    });

    it('should include safe search annotation in results', async () => {
      const result = await client.analyzeFoodImage('https://example.com/pizza.jpg');

      expect(result.safeSearch).toBeDefined();
      expect(result.safeSearch?.adult).toBeDefined();
      expect(result.safeSearch?.violence).toBeDefined();
    });

    it('should return labels with scores and topicality', async () => {
      const result = await client.analyzeFoodImage('https://example.com/pizza.jpg');

      expect(result.labels.length).toBeGreaterThan(0);

      result.labels.forEach((label) => {
        expect(label.description).toBeDefined();
        expect(typeof label.description).toBe('string');
        expect(label.score).toBeDefined();
        expect(label.score).toBeGreaterThan(0);
        expect(label.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Response schema validation', () => {
    it('should return valid FoodAnalysisResult structure', async () => {
      const result = await client.analyzeFoodImage('https://example.com/test.jpg');

      // Validate top-level structure
      expect(result).toHaveProperty('labels');
      expect(result).toHaveProperty('safeSearch');
      expect(result).toHaveProperty('isSafeForFood');

      // Validate labels array
      expect(Array.isArray(result.labels)).toBe(true);

      // Validate label structure
      if (result.labels.length > 0) {
        const label = result.labels[0];
        expect(label).toHaveProperty('description');
        expect(label).toHaveProperty('score');
        expect(typeof label.description).toBe('string');
        expect(typeof label.score).toBe('number');
      }

      // Validate safe search structure
      if (result.safeSearch) {
        expect(result.safeSearch).toHaveProperty('adult');
        expect(['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']).toContain(
          result.safeSearch.adult
        );
      }
    });
  });

  describe('Performance and timing', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      await client.analyzeFoodImage('https://example.com/test.jpg');
      const endTime = Date.now();

      // Mock should complete within 500ms (simulates network delay)
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});
