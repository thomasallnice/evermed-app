import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { LineChart } from 'react-native-chart-kit'

interface GlucoseReading {
  id: string
  value: number // mg/dL
  timestamp: string // ISO 8601
  source: 'cgm' | 'fingerstick' | 'lab' | 'interpolated'
  createdAt: string
}

interface GlucoseChartProps {
  readings: GlucoseReading[]
  onDataPointClick?: (data: { value: number; index: number }) => void
}

export function GlucoseChart({ readings, onDataPointClick }: GlucoseChartProps) {
  const screenWidth = Dimensions.get('window').width

  if (readings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No glucose data to display</Text>
      </View>
    )
  }

  // Sort readings by timestamp (oldest to newest for chart)
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Prepare data for chart
  const glucoseValues = sortedReadings.map((r) => r.value)
  const labels = sortedReadings.map((r) => {
    const date = new Date(r.timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    })
  })

  // Calculate color for each data point
  const getColorForValue = (value: number): string => {
    if (value < 70) return '#dc2626' // red - low
    if (value <= 180) return '#16a34a' // green - in range
    if (value <= 250) return '#eab308' // yellow - high
    return '#dc2626' // red - very high
  }

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Primary blue
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#2563eb',
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid lines
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
  }

  // Calculate min/max for Y-axis with padding
  const minValue = Math.min(...glucoseValues)
  const maxValue = Math.max(...glucoseValues)
  const yAxisMin = Math.max(0, Math.floor(minValue / 50) * 50 - 50)
  const yAxisMax = Math.ceil(maxValue / 50) * 50 + 50

  return (
    <View style={styles.container}>
      {/* Chart Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Glucose Timeline</Text>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
            <Text style={styles.legendText}>In Range</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
            <Text style={styles.legendText}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
            <Text style={styles.legendText}>Low/Very High</Text>
          </View>
        </View>
      </View>

      {/* Target Range Indicator */}
      <View style={styles.targetRangeInfo}>
        <View style={styles.targetRangeBadge}>
          <Text style={styles.targetRangeText}>Target: 70-180 mg/dL</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: labels,
            datasets: [
              {
                data: glucoseValues,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Primary blue line
                strokeWidth: 2,
              },
              // Target range - lower bound (70 mg/dL)
              {
                data: new Array(glucoseValues.length).fill(70),
                withDots: false,
                color: (opacity = 1) => `rgba(22, 163, 74, ${opacity * 0.3})`, // Green
                strokeWidth: 1,
              },
              // Target range - upper bound (180 mg/dL)
              {
                data: new Array(glucoseValues.length).fill(180),
                withDots: false,
                color: (opacity = 1) => `rgba(22, 163, 74, ${opacity * 0.3})`, // Green
                strokeWidth: 1,
              },
            ],
          }}
          width={screenWidth - 32}
          height={280}
          chartConfig={chartConfig}
          bezier // Smooth curves
          style={styles.chart}
          fromZero={false}
          yAxisSuffix=""
          yAxisInterval={1}
          onDataPointClick={(data) => {
            if (onDataPointClick) {
              onDataPointClick({
                value: glucoseValues[data.index],
                index: data.index,
              })
            }
          }}
          segments={5}
          withVerticalLines={false}
          withHorizontalLines={true}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          formatYLabel={(value) => `${Math.round(parseFloat(value))}`}
        />
      </View>

      {/* Color-coded data points overlay */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Readings</Text>
          <Text style={styles.statValue}>{readings.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Range</Text>
          <Text style={styles.statValue}>
            {Math.round(minValue)}-{Math.round(maxValue)}
          </Text>
          <Text style={styles.statUnit}>mg/dL</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  targetRangeInfo: {
    marginBottom: 12,
  },
  targetRangeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  targetRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statUnit: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
})
