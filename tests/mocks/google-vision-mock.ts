/**
 * Mock Google Cloud Vision API Client
 *
 * Purpose: Provide realistic fixture data for testing without hitting the real API
 * Usage: Set USE_MOCK_APIS=true to enable mock mode
 */

import type {
  FoodAnalysisResult,
  LabelAnnotation,
  SafeSearchAnnotation,
} from '../../apps/web/src/lib/services/google-vision';

export class MockGoogleVisionClient {
  /**
   * Mock food image analysis
   * Returns realistic fixture data based on image URL patterns
   */
  async analyzeFoodImage(imageUrl: string): Promise<FoodAnalysisResult> {
    console.log('[MockGoogleVision] Analyzing food image (MOCK)', {
      imageUrl: this.sanitizeUrl(imageUrl),
    });

    // Simulate API delay (100-300ms)
    await this.delay(100 + Math.random() * 200);

    // Return different fixtures based on image URL pattern
    if (imageUrl.includes('pizza')) {
      return this.pizzaFixture();
    } else if (imageUrl.includes('salad')) {
      return this.saladFixture();
    } else if (imageUrl.includes('burger')) {
      return this.burgerFixture();
    } else if (imageUrl.includes('fruit')) {
      return this.fruitFixture();
    } else if (imageUrl.includes('unsafe')) {
      return this.unsafeContentFixture();
    } else {
      return this.genericFoodFixture();
    }
  }

  /**
   * Pizza fixture
   */
  private pizzaFixture(): FoodAnalysisResult {
    const labels: LabelAnnotation[] = [
      { description: 'Pizza', score: 0.97, topicality: 0.97 },
      { description: 'Food', score: 0.96, topicality: 0.96 },
      { description: 'Dish', score: 0.94, topicality: 0.94 },
      { description: 'Cuisine', score: 0.92, topicality: 0.92 },
      { description: 'Italian food', score: 0.89, topicality: 0.89 },
      { description: 'Cheese', score: 0.87, topicality: 0.87 },
      { description: 'Baked goods', score: 0.85, topicality: 0.85 },
      { description: 'Fast food', score: 0.82, topicality: 0.82 },
      { description: 'Ingredient', score: 0.78, topicality: 0.78 },
      { description: 'Recipe', score: 0.75, topicality: 0.75 },
    ];

    const safeSearch: SafeSearchAnnotation = {
      adult: 'VERY_UNLIKELY',
      spoof: 'VERY_UNLIKELY',
      medical: 'UNLIKELY',
      violence: 'VERY_UNLIKELY',
      racy: 'VERY_UNLIKELY',
    };

    return {
      labels,
      safeSearch,
      isSafeForFood: true,
    };
  }

  /**
   * Salad fixture
   */
  private saladFixture(): FoodAnalysisResult {
    const labels: LabelAnnotation[] = [
      { description: 'Salad', score: 0.98, topicality: 0.98 },
      { description: 'Food', score: 0.97, topicality: 0.97 },
      { description: 'Vegetable', score: 0.95, topicality: 0.95 },
      { description: 'Leaf vegetable', score: 0.93, topicality: 0.93 },
      { description: 'Cuisine', score: 0.91, topicality: 0.91 },
      { description: 'Ingredient', score: 0.88, topicality: 0.88 },
      { description: 'Produce', score: 0.86, topicality: 0.86 },
      { description: 'Dish', score: 0.84, topicality: 0.84 },
      { description: 'Healthy food', score: 0.82, topicality: 0.82 },
      { description: 'Green', score: 0.79, topicality: 0.79 },
    ];

    const safeSearch: SafeSearchAnnotation = {
      adult: 'VERY_UNLIKELY',
      spoof: 'VERY_UNLIKELY',
      medical: 'VERY_UNLIKELY',
      violence: 'VERY_UNLIKELY',
      racy: 'VERY_UNLIKELY',
    };

    return {
      labels,
      safeSearch,
      isSafeForFood: true,
    };
  }

  /**
   * Burger fixture
   */
  private burgerFixture(): FoodAnalysisResult {
    const labels: LabelAnnotation[] = [
      { description: 'Hamburger', score: 0.96, topicality: 0.96 },
      { description: 'Food', score: 0.95, topicality: 0.95 },
      { description: 'Fast food', score: 0.93, topicality: 0.93 },
      { description: 'Dish', score: 0.91, topicality: 0.91 },
      { description: 'Cuisine', score: 0.89, topicality: 0.89 },
      { description: 'Cheeseburger', score: 0.87, topicality: 0.87 },
      { description: 'Ingredient', score: 0.84, topicality: 0.84 },
      { description: 'Meat', score: 0.82, topicality: 0.82 },
      { description: 'Bun', score: 0.79, topicality: 0.79 },
      { description: 'American food', score: 0.76, topicality: 0.76 },
    ];

    const safeSearch: SafeSearchAnnotation = {
      adult: 'VERY_UNLIKELY',
      spoof: 'VERY_UNLIKELY',
      medical: 'UNLIKELY',
      violence: 'VERY_UNLIKELY',
      racy: 'VERY_UNLIKELY',
    };

    return {
      labels,
      safeSearch,
      isSafeForFood: true,
    };
  }

  /**
   * Fruit fixture
   */
  private fruitFixture(): FoodAnalysisResult {
    const labels: LabelAnnotation[] = [
      { description: 'Fruit', score: 0.99, topicality: 0.99 },
      { description: 'Natural foods', score: 0.97, topicality: 0.97 },
      { description: 'Food', score: 0.96, topicality: 0.96 },
      { description: 'Apple', score: 0.94, topicality: 0.94 },
      { description: 'Produce', score: 0.92, topicality: 0.92 },
      { description: 'Healthy food', score: 0.89, topicality: 0.89 },
      { description: 'Local food', score: 0.86, topicality: 0.86 },
      { description: 'Superfood', score: 0.83, topicality: 0.83 },
      { description: 'Vegan nutrition', score: 0.80, topicality: 0.80 },
      { description: 'Plant', score: 0.77, topicality: 0.77 },
    ];

    const safeSearch: SafeSearchAnnotation = {
      adult: 'VERY_UNLIKELY',
      spoof: 'VERY_UNLIKELY',
      medical: 'VERY_UNLIKELY',
      violence: 'VERY_UNLIKELY',
      racy: 'VERY_UNLIKELY',
    };

    return {
      labels,
      safeSearch,
      isSafeForFood: true,
    };
  }

  /**
   * Generic food fixture (default)
   */
  private genericFoodFixture(): FoodAnalysisResult {
    const labels: LabelAnnotation[] = [
      { description: 'Food', score: 0.95, topicality: 0.95 },
      { description: 'Dish', score: 0.92, topicality: 0.92 },
      { description: 'Cuisine', score: 0.89, topicality: 0.89 },
      { description: 'Ingredient', score: 0.86, topicality: 0.86 },
      { description: 'Meal', score: 0.83, topicality: 0.83 },
      { description: 'Tableware', score: 0.79, topicality: 0.79 },
      { description: 'Plate', score: 0.76, topicality: 0.76 },
      { description: 'Recipe', score: 0.73, topicality: 0.73 },
    ];

    const safeSearch: SafeSearchAnnotation = {
      adult: 'VERY_UNLIKELY',
      spoof: 'VERY_UNLIKELY',
      medical: 'UNLIKELY',
      violence: 'VERY_UNLIKELY',
      racy: 'VERY_UNLIKELY',
    };

    return {
      labels,
      safeSearch,
      isSafeForFood: true,
    };
  }

  /**
   * Unsafe content fixture (for testing filtering)
   */
  private unsafeContentFixture(): FoodAnalysisResult {
    const labels: LabelAnnotation[] = [
      { description: 'Person', score: 0.92, topicality: 0.92 },
      { description: 'Body part', score: 0.87, topicality: 0.87 },
    ];

    const safeSearch: SafeSearchAnnotation = {
      adult: 'LIKELY',
      spoof: 'UNLIKELY',
      medical: 'UNLIKELY',
      violence: 'UNLIKELY',
      racy: 'LIKELY',
    };

    return {
      labels,
      safeSearch,
      isSafeForFood: false,
    };
  }

  /**
   * Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sanitize URL for logging
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      return '[invalid-url]';
    }
  }
}
