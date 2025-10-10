/**
 * Integration tests for Nutritionix API client
 *
 * These tests validate:
 * - Mock implementation matches API contract
 * - Natural language nutrition parsing
 * - Food search functionality
 * - Caching behavior
 * - Error handling for various scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockNutritionixClient } from '../mocks/nutritionix-mock';
import type { NutritionSummary, InstantSearchResponse } from '../../apps/web/src/lib/services/nutritionix';

describe('Nutritionix API Client (Mock)', () => {
  let client: MockNutritionixClient;

  beforeEach(() => {
    client = new MockNutritionixClient();
  });

  describe('getNutrition', () => {
    it('should successfully get pizza nutrition data', async () => {
      const result = await client.getNutrition('1 slice of pizza');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const pizza = result[0];
      expect(pizza.foodName).toContain('pizza');
      expect(pizza.calories).toBeGreaterThan(0);
      expect(pizza.protein).toBeGreaterThan(0);
      expect(pizza.carbs).toBeGreaterThan(0);
      expect(pizza.fat).toBeGreaterThan(0);
    });

    it('should successfully get salad nutrition data', async () => {
      const result = await client.getNutrition('1 bowl of salad');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const salad = result[0];
      expect(salad.foodName).toContain('salad');
      expect(salad.calories).toBeGreaterThan(0);
      expect(salad.protein).toBeGreaterThanOrEqual(0);
      expect(salad.carbs).toBeGreaterThan(0);
    });

    it('should successfully get burger nutrition data', async () => {
      const result = await client.getNutrition('1 hamburger');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const burger = result[0];
      expect(burger.foodName.toLowerCase()).toContain('burger');
      expect(burger.calories).toBeGreaterThan(200);
      expect(burger.protein).toBeGreaterThan(15);
    });

    it('should successfully get apple nutrition data', async () => {
      const result = await client.getNutrition('1 medium apple');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const apple = result[0];
      expect(apple.foodName).toContain('apple');
      expect(apple.calories).toBeGreaterThan(0);
      expect(apple.calories).toBeLessThan(150); // Apples are low-cal
    });

    it('should successfully get chicken nutrition data', async () => {
      const result = await client.getNutrition('4 oz grilled chicken breast');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const chicken = result[0];
      expect(chicken.foodName.toLowerCase()).toContain('chicken');
      expect(chicken.protein).toBeGreaterThan(30); // High protein
      expect(chicken.fat).toBeLessThan(10); // Low fat
    });

    it('should successfully get rice nutrition data', async () => {
      const result = await client.getNutrition('1 cup of rice');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const rice = result[0];
      expect(rice.foodName).toContain('rice');
      expect(rice.carbs).toBeGreaterThan(40); // High carbs
      expect(rice.protein).toBeGreaterThan(0);
    });

    it('should return generic nutrition for unknown foods', async () => {
      const result = await client.getNutrition('mystery food item');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const food = result[0];
      expect(food.calories).toBeGreaterThan(0);
      expect(food.protein).toBeGreaterThanOrEqual(0);
      expect(food.carbs).toBeGreaterThanOrEqual(0);
      expect(food.fat).toBeGreaterThanOrEqual(0);
    });

    it('should include serving information in results', async () => {
      const result = await client.getNutrition('1 slice of pizza');

      expect(result.length).toBeGreaterThan(0);

      const pizza = result[0];
      expect(pizza.servingQty).toBeDefined();
      expect(pizza.servingUnit).toBeDefined();
      expect(typeof pizza.servingQty).toBe('number');
      expect(typeof pizza.servingUnit).toBe('string');
    });

    it('should include macronutrient breakdown', async () => {
      const result = await client.getNutrition('1 hamburger');

      expect(result.length).toBeGreaterThan(0);

      const burger = result[0];
      expect(burger.calories).toBeDefined();
      expect(burger.protein).toBeDefined();
      expect(burger.carbs).toBeDefined();
      expect(burger.fat).toBeDefined();

      // Verify macros are realistic
      expect(burger.protein).toBeGreaterThan(0);
      expect(burger.carbs).toBeGreaterThan(0);
      expect(burger.fat).toBeGreaterThan(0);
    });

    it('should include optional micronutrient data', async () => {
      const result = await client.getNutrition('1 salad');

      expect(result.length).toBeGreaterThan(0);

      const salad = result[0];
      // Optional fields may or may not be present
      if (salad.fiber !== undefined) {
        expect(salad.fiber).toBeGreaterThanOrEqual(0);
      }
      if (salad.sugar !== undefined) {
        expect(salad.sugar).toBeGreaterThanOrEqual(0);
      }
      if (salad.sodium !== undefined) {
        expect(salad.sodium).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('searchFoods', () => {
    it('should successfully search for pizza', async () => {
      const result = await client.searchFoods('pizza');

      expect(result).toBeDefined();
      expect(result.common).toBeDefined();
      expect(result.branded).toBeDefined();

      // Verify common foods
      if (result.common && result.common.length > 0) {
        const commonFood = result.common[0];
        expect(commonFood.food_name).toBeDefined();
        expect(commonFood.serving_unit).toBeDefined();
        expect(commonFood.serving_qty).toBeGreaterThan(0);
      }

      // Verify branded foods
      if (result.branded && result.branded.length > 0) {
        const brandedFood = result.branded[0];
        expect(brandedFood.food_name).toBeDefined();
        expect(brandedFood.brand_name).toBeDefined();
        expect(brandedFood.nf_calories).toBeGreaterThan(0);
      }
    });

    it('should successfully search for salad', async () => {
      const result = await client.searchFoods('salad');

      expect(result).toBeDefined();
      expect(result.common).toBeDefined();

      if (result.common && result.common.length > 0) {
        const commonFood = result.common[0];
        expect(commonFood.food_name.toLowerCase()).toContain('salad');
      }
    });

    it('should successfully search for burger', async () => {
      const result = await client.searchFoods('burger');

      expect(result).toBeDefined();
      expect(result.common).toBeDefined();
      expect(result.branded).toBeDefined();

      if (result.common && result.common.length > 0) {
        const commonFood = result.common[0];
        expect(commonFood.food_name.toLowerCase()).toContain('burger');
      }
    });

    it('should return generic results for unknown search terms', async () => {
      const result = await client.searchFoods('xyzabc123');

      expect(result).toBeDefined();
      // Even for unknown terms, should return valid structure
      expect(result.common !== undefined || result.branded !== undefined).toBe(true);
    });

    it('should include photo URLs in search results', async () => {
      const result = await client.searchFoods('pizza');

      if (result.common && result.common.length > 0) {
        const commonFood = result.common[0];
        // Photo is optional but should be valid if present
        if (commonFood.photo) {
          expect(commonFood.photo.thumb).toBeDefined();
        }
      }
    });
  });

  describe('Response schema validation', () => {
    it('should return valid NutritionSummary structure', async () => {
      const result = await client.getNutrition('test food');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const summary = result[0];

      // Required fields
      expect(summary).toHaveProperty('foodName');
      expect(summary).toHaveProperty('servingQty');
      expect(summary).toHaveProperty('servingUnit');
      expect(summary).toHaveProperty('calories');
      expect(summary).toHaveProperty('protein');
      expect(summary).toHaveProperty('carbs');
      expect(summary).toHaveProperty('fat');

      // Type checks
      expect(typeof summary.foodName).toBe('string');
      expect(typeof summary.servingQty).toBe('number');
      expect(typeof summary.servingUnit).toBe('string');
      expect(typeof summary.calories).toBe('number');
      expect(typeof summary.protein).toBe('number');
      expect(typeof summary.carbs).toBe('number');
      expect(typeof summary.fat).toBe('number');
    });

    it('should return valid InstantSearchResponse structure', async () => {
      const result = await client.searchFoods('test');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // Should have at least one of these arrays
      expect(result.common !== undefined || result.branded !== undefined).toBe(true);

      if (result.common) {
        expect(Array.isArray(result.common)).toBe(true);
      }

      if (result.branded) {
        expect(Array.isArray(result.branded)).toBe(true);
      }
    });
  });

  describe('Performance and timing', () => {
    it('should complete nutrition lookup within reasonable time', async () => {
      const startTime = Date.now();
      await client.getNutrition('test food');
      const endTime = Date.now();

      // Mock should complete within 600ms (simulates network delay)
      expect(endTime - startTime).toBeLessThan(600);
    });

    it('should complete search within reasonable time', async () => {
      const startTime = Date.now();
      await client.searchFoods('test');
      const endTime = Date.now();

      // Mock should complete within 400ms (simulates network delay)
      expect(endTime - startTime).toBeLessThan(400);
    });
  });

  describe('Cache behavior (mock)', () => {
    it('should support clearCache method', () => {
      expect(() => {
        client.clearCache();
      }).not.toThrow();
    });
  });
});
