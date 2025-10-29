// Test Strip Usage Tracking Service
// Gamification + cost awareness for manual glucose testing

import AsyncStorage from '@react-native-async-storage/async-storage'

const TEST_COUNT_KEY = '@carbly:test_count_data'
const STRIP_PRICE_KEY = '@carbly:test_strip_price'

export interface TestStripStats {
  today: number // Tests today
  thisWeek: number // Tests this week
  thisMonth: number // Tests this month
  streak: number // Consecutive days with 3+ tests
  averagePerDay: number // Rolling 7-day average
  totalCost: number // Total cost (if strip price set)
  lastTestDate: Date | null // Most recent test timestamp
}

export interface DailyTestRecord {
  date: string // YYYY-MM-DD format
  count: number // Number of tests on this day
}

export interface TestCountData {
  dailyRecords: DailyTestRecord[]
  currentStreak: number
  lastStreakDate: string | null // YYYY-MM-DD format
}

/**
 * Increment test count when a glucose reading is created
 */
export async function incrementTestCount(): Promise<void> {
  try {
    const data = await getTestCountData()
    const today = getTodayDateString()

    // Find or create today's record
    const todayRecord = data.dailyRecords.find((r) => r.date === today)

    if (todayRecord) {
      todayRecord.count++
    } else {
      data.dailyRecords.push({ date: today, count: 1 })
    }

    // Update streak
    data.currentStreak = calculateStreak(data.dailyRecords)
    data.lastStreakDate = today

    // Cleanup old records (keep last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const cutoffDate = formatDateString(ninetyDaysAgo)

    data.dailyRecords = data.dailyRecords.filter((r) => r.date >= cutoffDate)

    // Save updated data
    await AsyncStorage.setItem(TEST_COUNT_KEY, JSON.stringify(data))

    console.log(`[TEST TRACKING] Incremented test count for ${today}`)
  } catch (error) {
    console.error('[TEST TRACKING] Failed to increment test count:', error)
  }
}

/**
 * Get comprehensive test strip statistics
 */
export async function getTestStripStats(): Promise<TestStripStats> {
  try {
    const data = await getTestCountData()
    const today = getTodayDateString()

    // Calculate date boundaries
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = formatDateString(weekAgo)

    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthAgoStr = formatDateString(monthAgo)

    // Count tests by time period
    const todayTests =
      data.dailyRecords.find((r) => r.date === today)?.count || 0
    const weekTests = data.dailyRecords
      .filter((r) => r.date >= weekAgoStr)
      .reduce((sum, r) => sum + r.count, 0)
    const monthTests = data.dailyRecords
      .filter((r) => r.date >= monthAgoStr)
      .reduce((sum, r) => sum + r.count, 0)

    // Calculate average per day (last 7 days)
    const averagePerDay = Math.round((weekTests / 7) * 10) / 10

    // Calculate total cost
    const stripPrice = await getStripPrice()
    const totalCost = stripPrice ? monthTests * stripPrice : 0

    // Get last test date
    const sortedRecords = [...data.dailyRecords].sort((a, b) =>
      b.date.localeCompare(a.date)
    )
    const lastTestDate = sortedRecords.length > 0 ? parseDateString(sortedRecords[0].date) : null

    return {
      today: todayTests,
      thisWeek: weekTests,
      thisMonth: monthTests,
      streak: data.currentStreak,
      averagePerDay,
      totalCost,
      lastTestDate,
    }
  } catch (error) {
    console.error('[TEST TRACKING] Failed to get stats:', error)
    return {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      streak: 0,
      averagePerDay: 0,
      totalCost: 0,
      lastTestDate: null,
    }
  }
}

/**
 * Set the price per test strip for cost tracking
 */
export async function setStripPrice(price: number): Promise<void> {
  try {
    if (price < 0) {
      throw new Error('Strip price must be non-negative')
    }
    await AsyncStorage.setItem(STRIP_PRICE_KEY, price.toString())
    console.log(`[TEST TRACKING] Strip price set to $${price.toFixed(2)}`)
  } catch (error) {
    console.error('[TEST TRACKING] Failed to set strip price:', error)
    throw error
  }
}

/**
 * Get the current strip price
 */
export async function getStripPrice(): Promise<number | null> {
  try {
    const price = await AsyncStorage.getItem(STRIP_PRICE_KEY)
    return price ? parseFloat(price) : null
  } catch (error) {
    console.error('[TEST TRACKING] Failed to get strip price:', error)
    return null
  }
}

/**
 * Get raw test count data
 */
async function getTestCountData(): Promise<TestCountData> {
  try {
    const data = await AsyncStorage.getItem(TEST_COUNT_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('[TEST TRACKING] Failed to load test count data:', error)
  }

  // Return default empty data
  return {
    dailyRecords: [],
    currentStreak: 0,
    lastStreakDate: null,
  }
}

/**
 * Calculate consecutive day streak (3+ tests per day)
 */
function calculateStreak(records: DailyTestRecord[]): number {
  if (records.length === 0) return 0

  // Sort records by date descending (most recent first)
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date))

  let streak = 0
  const today = getTodayDateString()
  let checkDate = today

  // Check each consecutive day backwards from today
  for (let i = 0; i < 365; i++) {
    // Max 1 year streak
    const record = sortedRecords.find((r) => r.date === checkDate)

    // If day has 3+ tests, continue streak
    if (record && record.count >= 3) {
      streak++
    } else {
      // Streak broken
      break
    }

    // Move to previous day
    const date = parseDateString(checkDate)
    date.setDate(date.getDate() - 1)
    checkDate = formatDateString(date)
  }

  return streak
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDateString(): string {
  return formatDateString(new Date())
}

/**
 * Format Date object as YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse YYYY-MM-DD string to Date object
 */
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get streak emoji based on streak length
 */
export function getStreakEmoji(streak: number): string {
  if (streak >= 30) return '🏆' // Champion
  if (streak >= 14) return '🔥' // On fire
  if (streak >= 7) return '⭐' // Star
  if (streak >= 3) return '✨' // Sparkle
  return '📊' // Just starting
}

/**
 * Get motivational message based on stats
 */
export function getTestingMotivation(stats: TestStripStats): string {
  if (stats.today >= 3) {
    return "🎯 Great job! You've hit today's testing goal."
  }

  if (stats.today === 2) {
    return '💪 One more test to hit your daily goal!'
  }

  if (stats.today === 1) {
    return '🚀 Keep it up! Test after your next meal.'
  }

  if (stats.streak >= 7) {
    return `${getStreakEmoji(stats.streak)} ${stats.streak}-day streak! Don't break it.`
  }

  return '📊 Start testing to track your patterns!'
}

/**
 * Check if user should get a streak achievement notification
 */
export function shouldShowStreakAchievement(oldStreak: number, newStreak: number): boolean {
  const milestones = [3, 7, 14, 30, 60, 90]
  return milestones.some((m) => oldStreak < m && newStreak >= m)
}

/**
 * Get achievement message for streak milestone
 */
export function getStreakAchievementMessage(streak: number): string {
  if (streak >= 90) return '🏆 90-day streak! You're a testing champion!'
  if (streak >= 60) return '🔥 60-day streak! Incredible dedication!'
  if (streak >= 30) return '⭐ 30-day streak! You're on a roll!'
  if (streak >= 14) return '✨ 2-week streak! Keep it going!'
  if (streak >= 7) return '🎉 7-day streak! One week strong!'
  if (streak >= 3) return '💪 3-day streak! Building the habit!'
  return ''
}
