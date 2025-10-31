import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BarChart } from 'react-native-chart-kit'
import { StatsRowSkeleton, ChartSkeleton, CardSkeleton } from '../../components/LoadingSkeleton'
import {
  getDailyInsights,
  getWeeklySummary,
  calculateStreak,
  getMondayOfWeek,
  formatDateISO,
  type DailyInsight,
  type WeeklySummary,
  type StreakData,
} from '../../api/insights'

// Navigation types
type RootStackParamList = {
  Insights: undefined
}

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>

const screenWidth = Dimensions.get('window').width

// Helper functions
function getInsightIcon(type: 'pattern' | 'warning' | 'tip'): string {
  switch (type) {
    case 'pattern':
      return '✓'
    case 'warning':
      return '⚠️'
    case 'tip':
      return '💡'
  }
}

function getInsightColor(type: 'pattern' | 'warning' | 'tip'): string {
  switch (type) {
    case 'pattern':
      return '#16a34a' // green
    case 'warning':
      return '#dc2626' // red
    case 'tip':
      return '#2563eb' // blue
  }
}

export default function InsightsScreen({ navigation }: Props) {
  const [dailyInsights, setDailyInsights] = useState<DailyInsight[]>([])
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadInsights = useCallback(async () => {
    try {
      const today = new Date()
      const todayStr = formatDateISO(today)
      const monday = getMondayOfWeek(today)
      const mondayStr = formatDateISO(monday)

      // Load data in parallel
      const [dailyRes, weeklyRes, streakRes] = await Promise.all([
        getDailyInsights(todayStr),
        getWeeklySummary(mondayStr),
        calculateStreak(),
      ])

      setDailyInsights(dailyRes.insights)
      setWeeklySummary(weeklyRes)
      setStreakData(streakRes)
    } catch (error: any) {
      console.error('Error loading insights:', error)
      const errorMessage = error?.message || 'Failed to load insights'
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadInsights()
    setRefreshing(false)
  }, [loadInsights])

  const renderStreakCard = () => {
    if (!streakData) return null

    return (
      <View
        style={styles.streakCard}
        accessible={true}
        accessibilityLabel={`Streak tracking: ${streakData.currentStreak} day current streak, ${streakData.longestStreak} day longest streak, ${streakData.daysInTargetRange} total days in target range`}
        accessibilityRole="summary"
      >
        <Text style={styles.sectionTitle}>🔥 Your Streaks</Text>
        <View style={styles.streakStats}>
          <View style={styles.streakStat}>
            <Text style={styles.streakValue}>{streakData.currentStreak}</Text>
            <Text style={styles.streakLabel}>Current Streak</Text>
          </View>
          <View style={styles.streakStat}>
            <Text style={styles.streakValue}>{streakData.longestStreak}</Text>
            <Text style={styles.streakLabel}>Longest Streak</Text>
          </View>
          <View style={styles.streakStat}>
            <Text style={styles.streakValue}>{streakData.daysInTargetRange}</Text>
            <Text style={styles.streakLabel}>Days in Range</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderMilestones = () => {
    if (!streakData || streakData.milestones.length === 0) return null

    const achievedMilestones = streakData.milestones.filter((m) => m.achieved)
    const inProgressMilestones = streakData.milestones.filter((m) => !m.achieved)

    return (
      <View style={styles.milestonesSection}>
        <Text
          style={styles.sectionTitle}
          accessible={true}
          accessibilityLabel={`Milestones: ${achievedMilestones.length} completed, ${inProgressMilestones.length} in progress`}
          accessibilityRole="header"
        >
          🏆 Milestones
        </Text>

        {/* Achieved Milestones */}
        {achievedMilestones.length > 0 && (
          <View style={styles.milestoneCategory}>
            <Text
              style={styles.milestoneCategoryTitle}
              accessible={true}
              accessibilityLabel={`${achievedMilestones.length} completed milestones`}
              accessibilityRole="header"
            >
              Completed
            </Text>
            {achievedMilestones.map((milestone, index) => (
              <View
                key={`achieved-${index}`}
                style={styles.milestoneCard}
                accessible={true}
                accessibilityLabel={`${milestone.title}, completed`}
                accessibilityRole="text"
              >
                <View style={styles.milestoneHeader}>
                  <Text style={styles.milestoneIcon}>✓</Text>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                </View>
                <View style={styles.milestoneProgressBar}>
                  <View
                    style={[styles.milestoneProgressFill, { width: '100%', backgroundColor: '#16a34a' }]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* In Progress Milestones */}
        {inProgressMilestones.length > 0 && (
          <View style={styles.milestoneCategory}>
            <Text
              style={styles.milestoneCategoryTitle}
              accessible={true}
              accessibilityLabel={`${inProgressMilestones.length} milestones in progress`}
              accessibilityRole="header"
            >
              In Progress
            </Text>
            {inProgressMilestones.map((milestone, index) => (
              <View
                key={`progress-${index}`}
                style={styles.milestoneCard}
                accessible={true}
                accessibilityLabel={`${milestone.title}, ${Math.round(milestone.progress)}% complete`}
                accessibilityRole="text"
              >
                <View style={styles.milestoneHeader}>
                  <Text style={styles.milestoneIcon}>⏳</Text>
                  <View style={styles.milestoneTitleContainer}>
                    <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                    <Text style={styles.milestoneProgress}>
                      {Math.round(milestone.progress)}% complete
                    </Text>
                  </View>
                </View>
                <View style={styles.milestoneProgressBar}>
                  <View
                    style={[
                      styles.milestoneProgressFill,
                      { width: `${milestone.progress}%`, backgroundColor: '#2563eb' },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  const renderDailyInsights = () => {
    if (dailyInsights.length === 0) {
      return (
        <View
          style={styles.emptyState}
          accessible={true}
          accessibilityLabel="No insights available yet. Log meals and glucose readings to get personalized insights"
          accessibilityRole="text"
        >
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Insights Yet</Text>
          <Text style={styles.emptyText}>
            Log meals and glucose readings to get personalized insights
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.dailyInsightsSection}>
        <Text
          style={styles.sectionTitle}
          accessible={true}
          accessibilityLabel={`Today's insights, ${dailyInsights.length} insights available`}
          accessibilityRole="header"
        >
          Today's Insights
        </Text>
        {dailyInsights.map((insight) => {
          const color = getInsightColor(insight.type)
          const icon = getInsightIcon(insight.type)
          const typeLabel = insight.type === 'pattern' ? 'Pattern' : insight.type === 'warning' ? 'Warning' : 'Tip'

          return (
            <View
              key={insight.id}
              style={[styles.insightCard, { borderLeftColor: color }]}
              accessible={true}
              accessibilityLabel={`${typeLabel}: ${insight.title}. ${insight.description}`}
              accessibilityRole="text"
            >
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>{icon}</Text>
                <Text style={[styles.insightTitle, { color }]}>{insight.title}</Text>
              </View>
              <Text style={styles.insightDescription}>{insight.description}</Text>
            </View>
          )
        })}
      </View>
    )
  }

  const renderWeeklyTrends = () => {
    if (!weeklySummary || weeklySummary.dailySummaries.length === 0) return null

    // Prepare chart data (last 7 days)
    const sortedDays = [...weeklySummary.dailySummaries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const labels = sortedDays.map((day) => {
      const date = new Date(day.date)
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    })

    const glucoseData = sortedDays.map((day) => day.avgGlucose || 0)
    const tirData = sortedDays.map((day) => day.timeInRange || 0)

    return (
      <View style={styles.trendsSection}>
        <Text
          style={styles.sectionTitle}
          accessible={true}
          accessibilityLabel="Weekly trends summary"
          accessibilityRole="header"
        >
          Weekly Trends
        </Text>

        {/* Summary Stats */}
        <View
          style={styles.weeklyStats}
          accessible={true}
          accessibilityLabel={`Weekly summary: Average glucose ${Math.round(weeklySummary.avgGlucose)} mg/dL, ${Math.round(weeklySummary.timeInRange)}% time in range, ${weeklySummary.totalSpikes} spikes, ${weeklySummary.totalMeals} meals logged`}
          accessibilityRole="summary"
        >
          <View style={styles.weeklyStat}>
            <Text style={styles.weeklyStatValue}>{Math.round(weeklySummary.avgGlucose)}</Text>
            <Text style={styles.weeklyStatLabel}>Avg Glucose</Text>
          </View>
          <View style={styles.weeklyStat}>
            <Text style={styles.weeklyStatValue}>{Math.round(weeklySummary.timeInRange)}%</Text>
            <Text style={styles.weeklyStatLabel}>Time in Range</Text>
          </View>
          <View style={styles.weeklyStat}>
            <Text style={styles.weeklyStatValue}>{weeklySummary.totalSpikes}</Text>
            <Text style={styles.weeklyStatLabel}>Spikes</Text>
          </View>
          <View style={styles.weeklyStat}>
            <Text style={styles.weeklyStatValue}>{weeklySummary.totalMeals}</Text>
            <Text style={styles.weeklyStatLabel}>Meals</Text>
          </View>
        </View>

        {/* Time in Range Chart */}
        <View
          style={styles.chartContainer}
          accessible={true}
          accessibilityLabel={`Weekly time in range chart: ${labels.join(', ')} with values ${tirData.map(v => Math.round(v) + '%').join(', ')}`}
          accessibilityRole="image"
        >
          <Text style={styles.chartTitle}>Time in Range %</Text>
          <BarChart
            data={{
              labels,
              datasets: [{ data: tirData }],
            }}
            width={screenWidth - 64}
            height={220}
            yAxisLabel=""
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              barPercentage: 0.6,
            }}
            style={styles.chart}
            fromZero
          />
        </View>
      </View>
    )
  }

  const renderFoodsThatWork = () => {
    if (!weeklySummary || weeklySummary.bestMeals.length === 0) return null

    return (
      <View style={styles.foodsSection}>
        <Text
          style={styles.sectionTitle}
          accessible={true}
          accessibilityLabel={`${weeklySummary.bestMeals.length} foods that work well for you`}
          accessibilityRole="header"
        >
          ✓ Foods That Work
        </Text>
        <Text style={styles.foodsSubtitle}>
          These meals had minimal glucose impact. Consider eating them more often!
        </Text>
        {weeklySummary.bestMeals.slice(0, 5).map((meal, index) => {
          const formattedDate = new Date(meal.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

          return (
            <View
              key={`best-${index}`}
              style={styles.foodCard}
              accessible={true}
              accessibilityLabel={`${meal.name}, ${meal.mealType} meal from ${formattedDate}, caused a glucose increase of ${Math.round(meal.glucoseChange)} mg/dL, which is stable`}
              accessibilityRole="text"
            >
              <View style={styles.foodHeader}>
                <Text style={styles.foodName}>{meal.name}</Text>
                <View style={[styles.foodBadge, { backgroundColor: '#16a34a15' }]}>
                  <Text style={[styles.foodBadgeText, { color: '#16a34a' }]}>
                    +{Math.round(meal.glucoseChange)} mg/dL
                  </Text>
                </View>
              </View>
              <Text style={styles.foodMeta}>
                {meal.mealType} · {formattedDate}
              </Text>
            </View>
          )
        })}
      </View>
    )
  }

  const renderFoodsToWatch = () => {
    if (!weeklySummary || weeklySummary.worstMeals.length === 0) return null

    return (
      <View style={styles.foodsSection}>
        <Text
          style={styles.sectionTitle}
          accessible={true}
          accessibilityLabel={`${weeklySummary.worstMeals.length} foods to watch that caused glucose spikes`}
          accessibilityRole="header"
        >
          ⚠️ Foods to Watch
        </Text>
        <Text style={styles.foodsSubtitle}>
          These meals caused significant glucose spikes. Consider smaller portions or alternatives.
        </Text>
        {weeklySummary.worstMeals.slice(0, 5).map((meal, index) => {
          const formattedDate = new Date(meal.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

          return (
            <View
              key={`worst-${index}`}
              style={styles.foodCard}
              accessible={true}
              accessibilityLabel={`${meal.name}, ${meal.mealType} meal from ${formattedDate}, caused a glucose spike of ${Math.round(meal.glucoseChange)} mg/dL, consider smaller portions`}
              accessibilityRole="text"
            >
              <View style={styles.foodHeader}>
                <Text style={styles.foodName}>{meal.name}</Text>
                <View style={[styles.foodBadge, { backgroundColor: '#dc262615' }]}>
                  <Text style={[styles.foodBadgeText, { color: '#dc2626' }]}>
                    +{Math.round(meal.glucoseChange)} mg/dL
                  </Text>
                </View>
              </View>
              <Text style={styles.foodMeta}>
                {meal.mealType} · {formattedDate}
              </Text>
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Insights</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading ? (
          /* Loading State */
          <View>
            <StatsRowSkeleton count={3} />
            <CardSkeleton />
            <CardSkeleton />
            <StatsRowSkeleton count={4} />
            <ChartSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : (
          <>
            {/* Streak Card */}
            {renderStreakCard()}

            {/* Daily Insights */}
            {renderDailyInsights()}

            {/* Weekly Trends */}
            {renderWeeklyTrends()}

            {/* Foods That Work */}
            {renderFoodsThatWork()}

            {/* Foods to Watch */}
            {renderFoodsToWatch()}

            {/* Milestones */}
            {renderMilestones()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  streakCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streakStat: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  dailyInsightsSection: {
    marginBottom: 24,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  trendsSection: {
    marginBottom: 24,
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weeklyStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  weeklyStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  weeklyStatLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },
  foodsSection: {
    marginBottom: 24,
  },
  foodsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  foodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  foodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  foodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  foodMeta: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  milestonesSection: {
    marginBottom: 24,
  },
  milestoneCategory: {
    marginBottom: 16,
  },
  milestoneCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  milestoneCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  milestoneIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  milestoneTitleContainer: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  milestoneProgress: {
    fontSize: 12,
    color: '#6b7280',
  },
  milestoneProgressBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
})
