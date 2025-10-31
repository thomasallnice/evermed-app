import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Image,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { GlucoseChart } from '../../components/GlucoseChart'
import {
  getDailyTimeline,
  calculateDailySummary,
  TimelineData,
  DailySummary,
  MealEntry,
} from '../../api/timeline'

// Navigation types
type RootStackParamList = {
  Timeline: undefined
}

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>

// Helper functions
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getSpikeColor(increase: number): string {
  if (increase < 30) return '#16a34a' // green - stable
  if (increase < 50) return '#eab308' // yellow - moderate
  return '#dc2626' // red - high spike
}

function getSpikeLabel(increase: number): string {
  if (increase < 30) return 'Stable'
  if (increase < 50) return `+${increase} mg/dL`
  return `+${increase} mg/dL`
}

export default function TimelineScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadTimelineData = useCallback(async () => {
    try {
      const dateStr = formatDateISO(selectedDate)
      const data = await getDailyTimeline(dateStr)
      setTimelineData(data)

      // Calculate daily summary
      const summary = calculateDailySummary(dateStr, data.glucose, data.meals)
      setDailySummary(summary)
    } catch (error: any) {
      console.error('Error loading timeline data:', error)
      const errorMessage = error?.message || 'Failed to load timeline data'
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadTimelineData()
  }, [loadTimelineData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadTimelineData()
    setRefreshing(false)
  }, [loadTimelineData])

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const handleNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    const today = new Date()
    // Don't allow future dates
    if (newDate <= today) {
      setSelectedDate(newDate)
    }
  }

  const handleMealPress = (meal: MealEntry) => {
    // Find spike info for this meal
    const spike = dailySummary?.spikes.find((s) => s.mealId === meal.id)
    const spikeInfo = spike
      ? `\n\nGlucose Response:\nPeak: ${spike.peakValue} mg/dL\nIncrease: +${spike.increase} mg/dL\nTime to Peak: ${spike.timeToP} min`
      : '\n\nGlucose Response: Stable (no significant spike detected)'

    Alert.alert(
      meal.name,
      `Time: ${formatTime(meal.timestamp)}\n` +
        `Type: ${meal.type}\n` +
        `Calories: ${meal.calories} kcal\n` +
        `Carbs: ${meal.carbs}g | Protein: ${meal.protein}g | Fat: ${meal.fat}g` +
        spikeInfo,
      [{ text: 'OK' }]
    )
  }

  const renderDateNavigation = () => (
    <View style={styles.dateNav}>
      <TouchableOpacity style={styles.dateNavButton} onPress={handlePreviousDay}>
        <Text style={styles.dateNavIcon}>←</Text>
      </TouchableOpacity>
      <View style={styles.dateDisplay}>
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
      </View>
      <TouchableOpacity
        style={styles.dateNavButton}
        onPress={handleNextDay}
        disabled={formatDateISO(selectedDate) === formatDateISO(new Date())}
      >
        <Text
          style={[
            styles.dateNavIcon,
            formatDateISO(selectedDate) === formatDateISO(new Date()) && styles.dateNavIconDisabled,
          ]}
        >
          →
        </Text>
      </TouchableOpacity>
    </View>
  )

  const renderSummaryCard = () => {
    if (!dailySummary || dailySummary.totalReadings === 0) return null

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Daily Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>{dailySummary.avgGlucose}</Text>
            <Text style={styles.summaryStatLabel}>Avg mg/dL</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>{dailySummary.timeInRange}%</Text>
            <Text style={styles.summaryStatLabel}>In Range</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>{dailySummary.spikes.length}</Text>
            <Text style={styles.summaryStatLabel}>Spikes</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>{dailySummary.totalMeals}</Text>
            <Text style={styles.summaryStatLabel}>Meals</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderMealCard = (meal: MealEntry, spikeIncrease: number | null) => {
    const spikeColor = getSpikeColor(spikeIncrease ?? 0)
    const spikeLabel = getSpikeLabel(spikeIncrease ?? 0)
    const photoUrl = meal.photoUrl || (meal.photoUrls && meal.photoUrls[0]) || null

    return (
      <TouchableOpacity
        key={meal.id}
        style={styles.mealCard}
        onPress={() => handleMealPress(meal)}
        activeOpacity={0.7}
      >
        {photoUrl && (
          <Image source={{ uri: photoUrl }} style={styles.mealPhoto} resizeMode="cover" />
        )}
        <View style={styles.mealContent}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealName} numberOfLines={1}>
              {meal.name}
            </Text>
            <View style={[styles.spikeBadge, { backgroundColor: spikeColor + '15' }]}>
              <View style={[styles.spikeDot, { backgroundColor: spikeColor }]} />
              <Text style={[styles.spikeLabel, { color: spikeColor }]}>{spikeLabel}</Text>
            </View>
          </View>
          <View style={styles.mealDetails}>
            <Text style={styles.mealTime}>{formatTime(meal.timestamp)}</Text>
            <Text style={styles.mealType}>{meal.type}</Text>
          </View>
          <View style={styles.mealNutrition}>
            <Text style={styles.mealNutritionText}>{meal.calories} kcal</Text>
            <Text style={styles.mealNutritionText}>C:{meal.carbs}g</Text>
            <Text style={styles.mealNutritionText}>P:{meal.protein}g</Text>
            <Text style={styles.mealNutritionText}>F:{meal.fat}g</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderMealsSection = () => {
    if (!timelineData || timelineData.meals.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>No Meals Logged</Text>
          <Text style={styles.emptyText}>Log meals to see glucose correlation</Text>
        </View>
      )
    }

    if (!dailySummary) return null

    // Create a map of mealId to spike increase
    const spikeMap = new Map<string, number>()
    dailySummary.spikes.forEach((spike) => {
      spikeMap.set(spike.mealId, spike.increase)
    })

    const bestMeals = dailySummary.bestMeals
    const worstMeals = dailySummary.worstMeals

    return (
      <View style={styles.mealsSection}>
        {/* Best Meals */}
        {bestMeals.length > 0 && (
          <View style={styles.mealCategory}>
            <Text style={styles.mealCategoryTitle}>✓ Meals with Stable Response</Text>
            {bestMeals.map((meal) => renderMealCard(meal, spikeMap.get(meal.id) ?? null))}
          </View>
        )}

        {/* Worst Meals */}
        {worstMeals.length > 0 && (
          <View style={styles.mealCategory}>
            <Text style={styles.mealCategoryTitle}>⚠️ Watch These Meals</Text>
            {worstMeals.map((meal) => renderMealCard(meal, spikeMap.get(meal.id) ?? null))}
          </View>
        )}

        {/* All Other Meals */}
        {timelineData.meals.length > bestMeals.length + worstMeals.length && (
          <View style={styles.mealCategory}>
            <Text style={styles.mealCategoryTitle}>Other Meals</Text>
            {timelineData.meals
              .filter(
                (meal) =>
                  !bestMeals.find((m) => m.id === meal.id) &&
                  !worstMeals.find((m) => m.id === meal.id)
              )
              .map((meal) => renderMealCard(meal, spikeMap.get(meal.id) ?? null))}
          </View>
        )}
      </View>
    )
  }

  const renderGlucoseChart = () => {
    if (!timelineData || timelineData.glucose.length < 2) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Glucose Data</Text>
          <Text style={styles.emptyText}>Add glucose readings to see trends</Text>
        </View>
      )
    }

    const readings = timelineData.glucose.map((g) => ({
      id: g.timestamp,
      value: g.value,
      timestamp: g.timestamp,
      source: 'cgm' as const,
    }))

    return <GlucoseChart readings={readings} />
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timeline</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Date Navigation */}
        {renderDateNavigation()}

        {/* Daily Summary Card */}
        {renderSummaryCard()}

        {/* Glucose Chart */}
        {renderGlucoseChart()}

        {/* Meals Section */}
        {renderMealsSection()}

        {/* Disclaimer */}
        {timelineData && (
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>{timelineData.disclaimer}</Text>
          </View>
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
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavIcon: {
    fontSize: 24,
    color: '#2563eb',
    fontWeight: '600',
  },
  dateNavIconDisabled: {
    color: '#d1d5db',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  mealsSection: {
    padding: 16,
  },
  mealCategory: {
    marginBottom: 24,
  },
  mealCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mealPhoto: {
    width: 80,
    height: 80,
  },
  mealContent: {
    flex: 1,
    padding: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  spikeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  spikeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  spikeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  mealDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTime: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 12,
  },
  mealType: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  mealNutrition: {
    flexDirection: 'row',
    gap: 12,
  },
  mealNutritionText: {
    fontSize: 12,
    color: '#9ca3af',
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
  disclaimer: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#60a5fa',
    lineHeight: 18,
  },
})
