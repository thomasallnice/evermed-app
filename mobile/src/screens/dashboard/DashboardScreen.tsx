// Dashboard Screen
// Main home screen showing glucose timeline and daily insights

import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { LineChart } from 'react-native-chart-kit'
import { useAuth } from '../../contexts/AuthContext'
import { getGlucoseReadings, type GlucoseReading } from '../../api/glucose'
import { getFoodEntries, type FoodEntry } from '../../api/food'

type TimeRange = '24h' | '7d' | '30d'

export function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { user } = useAuth()

  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [glucoseData, setGlucoseData] = useState<GlucoseReading[]>([])
  const [foodData, setFoodData] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data on mount and when time range changes
  useEffect(() => {
    loadData()
  }, [timeRange])

  // Refresh data when screen comes into focus (e.g., after deleting a meal)
  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [timeRange])
  )

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Calculate date range
      const now = new Date()
      const startDate = new Date()
      if (timeRange === '24h') {
        startDate.setHours(now.getHours() - 24)
      } else if (timeRange === '7d') {
        startDate.setDate(now.getDate() - 7)
      } else {
        startDate.setDate(now.getDate() - 30)
      }

      // Fetch glucose and food data in parallel
      const [glucoseResponse, foodResponse] = await Promise.all([
        getGlucoseReadings({
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          limit: 288 // 24h at 5min intervals
        }),
        getFoodEntries({
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          limit: 50
        })
      ])

      setGlucoseData(glucoseResponse.readings)
      setFoodData(foodResponse.entries)
    } catch (err) {
      console.error('[DASHBOARD] Failed to load data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const renderChart = () => {
    if (loading) {
      return (
        <View style={styles.chartContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading timeline...</Text>
        </View>
      )
    }

    if (error) {
      // Check if error is related to onboarding/profile setup
      const needsOnboarding = error.toLowerCase().includes('person') ||
                             error.toLowerCase().includes('onboarding') ||
                             error.toLowerCase().includes('profile') ||
                             error.toLowerCase().includes('complete')

      if (needsOnboarding) {
        return (
          <View style={styles.onboardingPrompt}>
            <Text style={styles.onboardingEmoji}>👋</Text>
            <Text style={styles.onboardingTitle}>Welcome to Carbly!</Text>
            <Text style={styles.onboardingSubtitle}>
              Let's get you set up with your glucose targets and meal preferences
            </Text>
            <TouchableOpacity
              style={styles.onboardingButton}
              onPress={() => navigation.navigate('Onboarding' as never)}
            >
              <Text style={styles.onboardingButtonText}>Complete Onboarding Now</Text>
            </TouchableOpacity>
          </View>
        )
      }

      // Generic error with retry
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (glucoseData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.emptyText}>📊 No glucose data yet</Text>
          <Text style={styles.emptySubtext}>
            Add your first glucose reading to see the timeline
          </Text>
        </View>
      )
    }

    // Prepare chart data
    const sortedGlucose = [...glucoseData].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Sample data if too many points (max 48 for readability)
    const maxPoints = 48
    const step = Math.ceil(sortedGlucose.length / maxPoints)
    const sampledData = sortedGlucose.filter((_, i) => i % step === 0)

    const labels = sampledData.map(r => {
      const date = new Date(r.timestamp)
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    })

    const values = sampledData.map(r => r.value)

    // Find meal markers within the glucose data timeframe
    const mealMarkers = foodData
      .filter(meal => {
        const mealTime = new Date(meal.timestamp).getTime()
        const firstDataPoint = new Date(sampledData[0].timestamp).getTime()
        const lastDataPoint = new Date(sampledData[sampledData.length - 1].timestamp).getTime()
        return mealTime >= firstDataPoint && mealTime <= lastDataPoint
      })
      .map(meal => {
        const mealTime = new Date(meal.timestamp).getTime()
        // Find the closest data point index
        let closestIndex = 0
        let minDiff = Math.abs(new Date(sampledData[0].timestamp).getTime() - mealTime)

        sampledData.forEach((point, index) => {
          const diff = Math.abs(new Date(point.timestamp).getTime() - mealTime)
          if (diff < minDiff) {
            minDiff = diff
            closestIndex = index
          }
        })

        return { index: closestIndex, meal }
      })

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels,
            datasets: [{
              data: values,
              color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Blue
              strokeWidth: 2
            }]
          }}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '3',
              strokeWidth: '2',
              stroke: '#2563eb'
            },
            propsForBackgroundLines: {
              strokeDasharray: '', // solid lines
              stroke: '#e5e7eb',
              strokeWidth: 1
            }
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          fromZero={false}
          decorator={() => {
            return mealMarkers.map(({ index, meal }, markerIndex) => {
              // Calculate position based on chart dimensions
              const chartWidth = Dimensions.get('window').width - 32
              const chartHeight = 220
              const paddingHorizontal = 45
              const paddingTop = 16
              const dataPoints = values.length

              // Calculate x position
              const x = paddingHorizontal + (index * (chartWidth - paddingHorizontal * 2) / (dataPoints - 1))

              // Place marker above the chart
              const y = paddingTop - 20

              return (
                <View
                  key={`meal-${markerIndex}`}
                  style={{
                    position: 'absolute',
                    left: x - 16,
                    top: y,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: '#f97316',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 3,
                  }}
                >
                  {meal.photoUrls && meal.photoUrls.length > 0 ? (
                    <Image
                      source={{ uri: meal.photoUrls[0] }}
                      style={{ width: 32, height: 32 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: 32,
                      height: 32,
                      backgroundColor: '#f97316',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 12 }}>{getMealEmoji(meal.mealType)}</Text>
                    </View>
                  )}
                </View>
              )
            })
          }}
        />

        {/* Meal legend */}
        {mealMarkers.length > 0 && (
          <View style={styles.mealLegend}>
            <View style={styles.mealLegendItem}>
              <View style={styles.mealLegendDot} />
              <Text style={styles.mealLegendText}>Meal events</Text>
            </View>
          </View>
        )}

        {/* Target range indicator */}
        <View style={styles.targetRangeInfo}>
          <Text style={styles.targetRangeText}>
            Target: 70-180 mg/dL
          </Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.subtitle}>Glucose & Meals</Text>
      </View>

      {/* Time range selector */}
      <View style={styles.timeRangeSelector}>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '24h' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('24h')}
        >
          <Text style={[styles.timeRangeButtonText, timeRange === '24h' && styles.timeRangeButtonTextActive]}>
            24h
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '7d' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('7d')}
        >
          <Text style={[styles.timeRangeButtonText, timeRange === '7d' && styles.timeRangeButtonTextActive]}>
            7d
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '30d' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('30d')}
        >
          <Text style={[styles.timeRangeButtonText, timeRange === '30d' && styles.timeRangeButtonTextActive]}>
            30d
          </Text>
        </TouchableOpacity>
      </View>

      {/* Glucose chart */}
      {renderChart()}

      {/* Recent meals */}
      {!loading && !error && foodData.length > 0 && (
        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>Recent Meals</Text>
          {foodData.slice(0, 5).map(meal => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealCardContent}>
                {meal.photoUrls && meal.photoUrls.length > 0 ? (
                  <Image
                    source={{ uri: meal.photoUrls[0] }}
                    style={styles.mealPreviewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.mealPreviewPlaceholder}>
                    <Text style={styles.mealPlaceholderEmoji}>{getMealEmoji(meal.mealType)}</Text>
                  </View>
                )}

                <View style={styles.mealInfo}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealType}>{meal.mealType}</Text>
                    <Text style={styles.mealTime}>{formatTime(meal.timestamp)}</Text>
                  </View>
                  <View style={styles.mealStats}>
                    <Text style={styles.mealStat}>{Math.round(meal.totalCarbsG)}g carbs</Text>
                    <Text style={styles.mealStat}>{Math.round(meal.totalCalories)} cal</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

function getMealEmoji(mealType: string): string {
  const emojis: Record<string, string> = {
    breakfast: '🍳',
    lunch: '🥗',
    dinner: '🍽️',
    snack: '🍎'
  }
  return emojis[mealType] || '🍽️'
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  timeRangeButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  targetRangeInfo: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  targetRangeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  mealsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  mealCard: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mealCardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  mealPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  mealPreviewPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealPlaceholderEmoji: {
    fontSize: 28,
  },
  mealInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  mealTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  mealStats: {
    flexDirection: 'row',
    gap: 16,
  },
  mealStat: {
    fontSize: 14,
    color: '#6b7280',
  },
  mealLegend: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealLegendDot: {
    width: 12,
    height: 12,
    backgroundColor: '#f97316',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  mealLegendText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  onboardingPrompt: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  onboardingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  onboardingSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  onboardingButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  onboardingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})
