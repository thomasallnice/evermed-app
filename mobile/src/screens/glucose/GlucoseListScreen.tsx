import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { GlucoseChart } from '../../components/GlucoseChart'
import { getGlucoseReadings, deleteGlucoseReading, GlucoseReading } from '../../api/glucose'
import { HapticFeedback } from '../../utils/haptics'

// Navigation types
type RootStackParamList = {
  GlucoseList: undefined
  ManualEntry: undefined
}

type Props = NativeStackScreenProps<RootStackParamList, 'GlucoseList'>

// Helper functions
function getGlucoseColor(value: number): string {
  if (value < 70) return '#dc2626' // red - low
  if (value <= 180) return '#16a34a' // green - in range
  if (value <= 250) return '#eab308' // yellow - high
  return '#dc2626' // red - very high
}

function getRangeLabel(value: number): string {
  if (value < 70) return 'Low'
  if (value <= 180) return 'In Range'
  if (value <= 250) return 'High'
  return 'Very High'
}

function getRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diff = now.getTime() - then.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 1) return 'Just now'
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`

  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== then.getFullYear() ? 'numeric' : undefined,
  })
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getSourceLabel(source: string): string {
  switch (source) {
    case 'fingerstick':
      return '🩸 Fingerstick'
    case 'lab':
      return '🧪 Lab Test'
    case 'cgm':
      return '📱 CGM'
    case 'interpolated':
      return '📊 Estimated'
    default:
      return source
  }
}

export default function GlucoseListScreen({ navigation }: Props) {
  const [readings, setReadings] = useState<GlucoseReading[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadReadings = useCallback(async () => {
    try {
      // Call API to fetch glucose readings (last 30 days, limit 100)
      const data = await getGlucoseReadings({
        limit: 100,
      })

      setReadings(data.readings)
    } catch (error: any) {
      console.error('Error loading glucose readings:', error)
      const errorMessage = error?.message || 'Failed to load glucose readings'
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReadings()
  }, [loadReadings])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadReadings()
    setRefreshing(false)
  }, [loadReadings])

  const handleDelete = useCallback((reading: GlucoseReading) => {
    HapticFeedback.heavy()
    Alert.alert(
      'Delete Reading',
      `Are you sure you want to delete this ${reading.value} mg/dL reading?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call API to delete reading
              await deleteGlucoseReading(reading.id)

              // Remove from local state
              setReadings((prev) => prev.filter((r) => r.id !== reading.id))
              HapticFeedback.success()
            } catch (error: any) {
              HapticFeedback.error()
              console.error('Error deleting reading:', error)
              const errorMessage = error?.message || 'Failed to delete reading'
              Alert.alert('Error', errorMessage)
            }
          },
        },
      ]
    )
  }, [])

  const handleAddReading = () => {
    HapticFeedback.light()
    navigation.navigate('ManualEntry')
  }

  const handleChartDataPointClick = (data: { value: number; index: number }) => {
    const reading = readings[data.index]
    if (reading) {
      Alert.alert(
        'Glucose Reading',
        `Value: ${reading.value} mg/dL\n` +
          `Time: ${formatTime(reading.timestamp)}\n` +
          `Source: ${getSourceLabel(reading.source)}`,
        [{ text: 'OK' }]
      )
    }
  }

  const renderReading = ({ item }: { item: GlucoseReading }) => {
    const color = getGlucoseColor(item.value)
    const rangeLabel = getRangeLabel(item.value)

    return (
      <TouchableOpacity
        style={styles.readingCard}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.colorBar, { backgroundColor: color }]} />
        <View style={styles.readingContent}>
          <View style={styles.readingHeader}>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>{item.value}</Text>
              <Text style={styles.unit}>mg/dL</Text>
            </View>
            <View style={[styles.rangeBadge, { backgroundColor: color + '15' }]}>
              <View style={[styles.rangeDot, { backgroundColor: color }]} />
              <Text style={[styles.rangeLabel, { color }]}>{rangeLabel}</Text>
            </View>
          </View>
          <View style={styles.readingDetails}>
            <Text style={styles.relativeTime}>{getRelativeTime(item.timestamp)}</Text>
            <Text style={styles.absoluteTime}>{formatTime(item.timestamp)}</Text>
          </View>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>{getSourceLabel(item.source)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyTitle}>No Glucose Readings Yet</Text>
      <Text style={styles.emptyText}>
        Tap the + button below to add your first glucose reading
      </Text>
    </View>
  )

  const renderSummary = () => {
    if (readings.length === 0) return null

    const avgValue = readings.reduce((sum, r) => sum + r.value, 0) / readings.length
    const inRangeCount = readings.filter((r) => r.value >= 70 && r.value <= 180).length
    const inRangePercent = (inRangeCount / readings.length) * 100

    return (
      <>
        {/* Glucose Chart */}
        {readings.length >= 2 && (
          <GlucoseChart
            readings={readings}
            onDataPointClick={handleChartDataPointClick}
          />
        )}

        {/* Summary Cards */}
        <View style={styles.summary}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryValue}>{avgValue.toFixed(0)}</Text>
            <Text style={styles.summaryUnit}>mg/dL</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>In Range</Text>
            <Text style={styles.summaryValue}>{inRangePercent.toFixed(0)}%</Text>
            <Text style={styles.summaryUnit}>{inRangeCount} of {readings.length}</Text>
          </View>
        </View>
      </>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Glucose Tracking</Text>
      </View>

      {/* Content */}
      <FlatList
        data={readings}
        renderItem={renderReading}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, readings.length === 0 && styles.listContentEmpty]}
        ListHeaderComponent={renderSummary()}
        ListEmptyComponent={renderEmpty()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddReading} activeOpacity={0.8}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  summary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  summaryUnit: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  readingCard: {
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
  colorBar: {
    width: 4,
  },
  readingContent: {
    flex: 1,
    padding: 16,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  unit: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  rangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rangeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  readingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  relativeTime: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginRight: 8,
  },
  absoluteTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
})
