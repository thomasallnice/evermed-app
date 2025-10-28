// Pattern Detection Service
// Analyzes meal-glucose pairs to detect early patterns (5-7 meals)

export interface EarlyPattern {
  food: string // e.g., "Oatmeal", "Bread", "Eggs"
  avgSpike: number // Average glucose spike in mg/dL
  occurrences: number // Number of times tested
  confidence: 'low' | 'medium' | 'high'
  category: 'high_spike' | 'moderate_spike' | 'stable'
  recommendation: string
  lastTested: Date
}

export interface MealGlucosePair {
  mealId: string
  mealName: string
  foodItems: string[] // Array of food names from ingredients
  eatenAt: Date
  glucoseValue: number // Post-meal glucose reading (mg/dL)
  baselineGlucose?: number // Pre-meal glucose (if available)
}

export interface PatternDetectionSummary {
  totalTests: number
  patternsFound: EarlyPattern[]
  needsMoreTests: boolean
  testsUntilInsights: number
}

const MIN_TESTS_FOR_INSIGHTS = 5
const MIN_OCCURRENCES_FOR_PATTERN = 2

/**
 * Detect early patterns from meal-glucose pairs
 *
 * @param pairs - Array of meal-glucose pairs
 * @returns Pattern detection summary with actionable insights
 */
export function detectEarlyPatterns(pairs: MealGlucosePair[]): PatternDetectionSummary {
  console.log(`[PATTERN DETECTION] Analyzing ${pairs.length} meal-glucose pairs`)

  if (pairs.length < MIN_TESTS_FOR_INSIGHTS) {
    return {
      totalTests: pairs.length,
      patternsFound: [],
      needsMoreTests: true,
      testsUntilInsights: MIN_TESTS_FOR_INSIGHTS - pairs.length,
    }
  }

  // Group pairs by food item
  const foodGroups = groupPairsByFood(pairs)

  // Calculate patterns for each food
  const patterns: EarlyPattern[] = []

  Object.entries(foodGroups).forEach(([food, foodPairs]) => {
    if (foodPairs.length >= MIN_OCCURRENCES_FOR_PATTERN) {
      const pattern = calculateFoodPattern(food, foodPairs)
      patterns.push(pattern)
    }
  })

  // Sort patterns: high spike first, then by occurrences
  patterns.sort((a, b) => {
    // Category priority: high_spike > moderate_spike > stable
    const categoryOrder = { high_spike: 0, moderate_spike: 1, stable: 2 }
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category]
    }
    // Within same category, sort by occurrences
    return b.occurrences - a.occurrences
  })

  console.log(`[PATTERN DETECTION] Found ${patterns.length} patterns`)

  return {
    totalTests: pairs.length,
    patternsFound: patterns,
    needsMoreTests: false,
    testsUntilInsights: 0,
  }
}

/**
 * Group meal-glucose pairs by individual food items
 * Handles meals with multiple ingredients
 */
function groupPairsByFood(pairs: MealGlucosePair[]): Record<string, MealGlucosePair[]> {
  const groups: Record<string, MealGlucosePair[]> = {}

  pairs.forEach((pair) => {
    // If meal has multiple food items, create a combined name
    // e.g., ["Oatmeal", "Banana"] → "Oatmeal + Banana"
    const foodKey =
      pair.foodItems.length === 1
        ? pair.foodItems[0]
        : pair.foodItems.slice(0, 2).join(' + ') +
          (pair.foodItems.length > 2 ? ' + more' : '')

    if (!groups[foodKey]) {
      groups[foodKey] = []
    }

    groups[foodKey].push(pair)
  })

  return groups
}

/**
 * Calculate pattern for a specific food based on its meal-glucose pairs
 */
function calculateFoodPattern(food: string, pairs: MealGlucosePair[]): EarlyPattern {
  // Calculate average glucose spike
  const spikes = pairs.map((pair) => {
    if (pair.baselineGlucose) {
      // If we have baseline, calculate spike from baseline
      return pair.glucoseValue - pair.baselineGlucose
    } else {
      // If no baseline, assume standard fasting glucose of 100 mg/dL
      // This is a rough estimate for manual glucose users
      return pair.glucoseValue - 100
    }
  })

  const avgSpike = Math.round(spikes.reduce((sum, spike) => sum + spike, 0) / spikes.length)

  // Categorize spike severity
  let category: EarlyPattern['category']
  let recommendation: string

  if (avgSpike > 50) {
    category = 'high_spike'
    recommendation = 'Consider avoiding or reducing portion size'
  } else if (avgSpike >= 30) {
    category = 'moderate_spike'
    recommendation = 'Safe in moderation, watch portion sizes'
  } else {
    category = 'stable'
    recommendation = 'Good choice - keeps glucose stable'
  }

  // Determine confidence based on number of tests
  let confidence: EarlyPattern['confidence']
  if (pairs.length >= 4) {
    confidence = 'high'
  } else if (pairs.length >= 3) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  // Get most recent test date
  const lastTested = new Date(
    Math.max(...pairs.map((p) => new Date(p.eatenAt).getTime()))
  )

  return {
    food,
    avgSpike,
    occurrences: pairs.length,
    confidence,
    category,
    recommendation,
    lastTested,
  }
}

/**
 * Get spike severity label for UI display
 */
export function getSpikeSeverityLabel(spike: number): string {
  if (spike > 50) return 'High spike'
  if (spike >= 30) return 'Moderate spike'
  if (spike >= 15) return 'Small spike'
  return 'Stable'
}

/**
 * Get spike severity emoji for UI display
 */
export function getSpikeSeverityEmoji(category: EarlyPattern['category']): string {
  switch (category) {
    case 'high_spike':
      return '⚠️'
    case 'moderate_spike':
      return '⚡'
    case 'stable':
      return '✅'
  }
}

/**
 * Get confidence emoji for UI display
 */
export function getConfidenceEmoji(confidence: EarlyPattern['confidence']): string {
  switch (confidence) {
    case 'high':
      return '💯'
    case 'medium':
      return '📊'
    case 'low':
      return '📉'
  }
}

/**
 * Format pattern for user-facing display
 */
export function formatPattern(pattern: EarlyPattern): string {
  const emoji = getSpikeSeverityEmoji(pattern.category)
  const confidenceEmoji = getConfidenceEmoji(pattern.confidence)

  return `${emoji} ${pattern.food} ${
    pattern.avgSpike > 0 ? '+' : ''
  }${pattern.avgSpike} mg/dL (${pattern.occurrences}x) ${confidenceEmoji}`
}

/**
 * Calculate daily test count from meal-glucose pairs
 * Used to track if user is meeting testing goals
 */
export function calculateDailyTestCount(pairs: MealGlucosePair[]): {
  today: number
  yesterday: number
  thisWeek: number
  averagePerDay: number
} {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const todayTests = pairs.filter((p) => new Date(p.eatenAt) >= today).length
  const yesterdayTests = pairs.filter(
    (p) => new Date(p.eatenAt) >= yesterday && new Date(p.eatenAt) < today
  ).length
  const weekTests = pairs.filter((p) => new Date(p.eatenAt) >= weekAgo).length

  return {
    today: todayTests,
    yesterday: yesterdayTests,
    thisWeek: weekTests,
    averagePerDay: Math.round((weekTests / 7) * 10) / 10, // Round to 1 decimal
  }
}

/**
 * Get motivational message based on progress
 */
export function getMotivationalMessage(summary: PatternDetectionSummary): string {
  if (summary.needsMoreTests) {
    const remaining = summary.testsUntilInsights
    if (remaining === 1) {
      return '🎯 Just 1 more test to unlock insights!'
    }
    return `🎯 ${remaining} more tests to unlock insights!`
  }

  const highSpikes = summary.patternsFound.filter((p) => p.category === 'high_spike').length
  const stable = summary.patternsFound.filter((p) => p.category === 'stable').length

  if (stable > highSpikes) {
    return '🎉 Great work! Most of your meals keep glucose stable.'
  } else if (highSpikes > 0) {
    return '💡 You're discovering which foods spike your glucose!'
  } else {
    return '📊 Keep testing to build your personalized insights.'
  }
}
