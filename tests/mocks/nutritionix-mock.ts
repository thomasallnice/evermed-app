/**
 * Mock Nutritionix API Client
 *
 * Purpose: Provide realistic fixture data for testing without hitting the real API
 * Usage: Set USE_MOCK_APIS=true to enable mock mode
 */

import type {
  NutritionSummary,
  InstantSearchResponse,
  CommonFood,
  BrandedFood,
} from '../../apps/web/src/lib/services/nutritionix';

export class MockNutritionixClient {
  /**
   * Mock nutrition data retrieval
   * Returns realistic fixture data based on query patterns
   */
  async getNutrition(query: string): Promise<NutritionSummary[]> {
    console.log('[MockNutritionix] Fetching nutrition data (MOCK)', { query });

    // Simulate API delay (150-350ms)
    await this.delay(150 + Math.random() * 200);

    const normalizedQuery = query.toLowerCase();

    // Return different fixtures based on query pattern
    if (normalizedQuery.includes('pizza')) {
      return this.pizzaNutrition();
    } else if (normalizedQuery.includes('salad')) {
      return this.saladNutrition();
    } else if (normalizedQuery.includes('burger') || normalizedQuery.includes('hamburger')) {
      return this.burgerNutrition();
    } else if (normalizedQuery.includes('apple')) {
      return this.appleNutrition();
    } else if (normalizedQuery.includes('chicken')) {
      return this.chickenNutrition();
    } else if (normalizedQuery.includes('rice')) {
      return this.riceNutrition();
    } else {
      return this.genericFoodNutrition();
    }
  }

  /**
   * Mock food search
   * Returns realistic fixture data based on query patterns
   */
  async searchFoods(query: string): Promise<InstantSearchResponse> {
    console.log('[MockNutritionix] Searching foods (MOCK)', { query });

    // Simulate API delay (100-250ms)
    await this.delay(100 + Math.random() * 150);

    const normalizedQuery = query.toLowerCase();

    if (normalizedQuery.includes('pizza')) {
      return this.pizzaSearch();
    } else if (normalizedQuery.includes('salad')) {
      return this.saladSearch();
    } else if (normalizedQuery.includes('burger')) {
      return this.burgerSearch();
    } else {
      return this.genericSearch();
    }
  }

  /**
   * Mock cache clearing (no-op in mock)
   */
  clearCache(): void {
    console.log('[MockNutritionix] Cache cleared (MOCK)');
  }

  // ============================================================================
  // Nutrition Fixtures
  // ============================================================================

  private pizzaNutrition(): NutritionSummary[] {
    return [
      {
        foodName: 'pizza',
        servingQty: 1,
        servingUnit: 'slice',
        servingWeightGrams: 107,
        calories: 285,
        protein: 12,
        carbs: 36,
        fat: 10,
        fiber: 2,
        sugar: 4,
        sodium: 640,
        photoUrl: 'https://d2xdmhkmkbyw75.cloudfront.net/pizza.jpg',
      },
    ];
  }

  private saladNutrition(): NutritionSummary[] {
    return [
      {
        foodName: 'garden salad',
        servingQty: 1,
        servingUnit: 'bowl',
        servingWeightGrams: 200,
        calories: 65,
        protein: 3,
        carbs: 12,
        fat: 1,
        fiber: 4,
        sugar: 6,
        sodium: 45,
        photoUrl: 'https://d2xdmhkmkbyw75.cloudfront.net/salad.jpg',
      },
    ];
  }

  private burgerNutrition(): NutritionSummary[] {
    return [
      {
        foodName: 'hamburger',
        brandName: 'Generic',
        servingQty: 1,
        servingUnit: 'burger',
        servingWeightGrams: 150,
        calories: 354,
        protein: 20,
        carbs: 30,
        fat: 17,
        fiber: 2,
        sugar: 5,
        sodium: 497,
        photoUrl: 'https://d2xdmhkmkbyw75.cloudfront.net/hamburger.jpg',
      },
    ];
  }

  private appleNutrition(): NutritionSummary[] {
    return [
      {
        foodName: 'apple',
        servingQty: 1,
        servingUnit: 'medium',
        servingWeightGrams: 182,
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        fiber: 4,
        sugar: 19,
        sodium: 2,
        photoUrl: 'https://d2xdmhkmkbyw75.cloudfront.net/apple.jpg',
      },
    ];
  }

  private chickenNutrition(): NutritionSummary[] {
    return [
      {
        foodName: 'grilled chicken breast',
        servingQty: 4,
        servingUnit: 'oz',
        servingWeightGrams: 113,
        calories: 187,
        protein: 35,
        carbs: 0,
        fat: 4,
        fiber: 0,
        sugar: 0,
        sodium: 84,
        photoUrl: 'https://d2xdmhkmkbyw75.cloudfront.net/chicken.jpg',
      },
    ];
  }

  private riceNutrition(): NutritionSummary[] {
    return [
      {
        foodName: 'white rice',
        servingQty: 1,
        servingUnit: 'cup',
        servingWeightGrams: 158,
        calories: 205,
        protein: 4,
        carbs: 45,
        fat: 0.4,
        fiber: 1,
        sugar: 0,
        sodium: 2,
        photoUrl: 'https://d2xdmhkmkbyw75.cloudfront.net/rice.jpg',
      },
    ];
  }

  private genericFoodNutrition(): NutritionSummary[] {
    return [
      {
        foodName: 'mixed meal',
        servingQty: 1,
        servingUnit: 'serving',
        servingWeightGrams: 250,
        calories: 350,
        protein: 15,
        carbs: 40,
        fat: 12,
        fiber: 5,
        sugar: 8,
        sodium: 500,
      },
    ];
  }

  // ============================================================================
  // Search Fixtures
  // ============================================================================

  private pizzaSearch(): InstantSearchResponse {
    const common: CommonFood[] = [
      {
        food_name: 'pizza',
        serving_unit: 'slice',
        tag_name: 'pizza',
        serving_qty: 1,
        photo: {
          thumb: 'https://d2xdmhkmkbyw75.cloudfront.net/pizza_thumb.jpg',
        },
      },
      {
        food_name: 'pizza margherita',
        serving_unit: 'slice',
        serving_qty: 1,
        photo: {
          thumb: 'https://d2xdmhkmkbyw75.cloudfront.net/margherita_thumb.jpg',
        },
      },
    ];

    const branded: BrandedFood[] = [
      {
        food_name: 'DiGiorno Rising Crust Supreme Pizza',
        serving_unit: 'slice',
        nix_brand_id: 'brand_123',
        brand_name: 'DiGiorno',
        serving_qty: 1,
        nf_calories: 340,
        photo: {
          thumb: 'https://d2xdmhkmkbyw75.cloudfront.net/digiorno_thumb.jpg',
        },
      },
    ];

    return { common, branded };
  }

  private saladSearch(): InstantSearchResponse {
    const common: CommonFood[] = [
      {
        food_name: 'garden salad',
        serving_unit: 'bowl',
        serving_qty: 1,
        photo: {
          thumb: 'https://d2xdmhkmkbyw75.cloudfront.net/salad_thumb.jpg',
        },
      },
      {
        food_name: 'caesar salad',
        serving_unit: 'bowl',
        serving_qty: 1,
        photo: {
          thumb: 'https://d2xdmhkmkbyw75.cloudfront.net/caesar_thumb.jpg',
        },
      },
    ];

    const branded: BrandedFood[] = [
      {
        food_name: 'Dole Garden Salad Kit',
        serving_unit: 'package',
        nix_brand_id: 'brand_456',
        brand_name: 'Dole',
        serving_qty: 1,
        nf_calories: 50,
        photo: {
          thumb: 'https://d2xdmhkmkbyw75.cloudfront.net/dole_thumb.jpg',
        },
      },
    ];

    return { common, branded };
  }

  private burgerSearch(): InstantSearchResponse {
    const common: CommonFood[] = [
      {
        food_name: 'hamburger',
        serving_unit: 'burger',
        serving_qty: 1,
        photo: {
          thumb: 'https://d2xdmhkmkbyw75.cloudfront.net/burger_thumb.jpg',
        },
      },
      {
        food_name: 'cheeseburger',
        serving_unit: 'burger',
        serving_qty: 1,
        photo: {
          thumb: 'https://d2xdmhkmkbyw75.cloudfront.net/cheeseburger_thumb.jpg',
        },
      },
    ];

    const branded: BrandedFood[] = [
      {
        food_name: "McDonald's Big Mac",
        serving_unit: 'burger',
        nix_brand_id: 'brand_789',
        brand_name: "McDonald's",
        serving_qty: 1,
        nf_calories: 563,
        photo: {
          thumb: 'https://d2xdmhkmkbyw75.cloudfront.net/bigmac_thumb.jpg',
        },
      },
    ];

    return { common, branded };
  }

  private genericSearch(): InstantSearchResponse {
    const common: CommonFood[] = [
      {
        food_name: 'mixed meal',
        serving_unit: 'serving',
        serving_qty: 1,
      },
    ];

    return { common };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
