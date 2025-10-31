import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  marginBottom?: number
  style?: any
}

/**
 * Skeleton component with pulse animation for loading states
 * Provides a placeholder while content is being fetched
 */
export function Skeleton({ width = '100%', height = 20, borderRadius = 4, marginBottom = 0, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          marginBottom,
          opacity,
        },
        style,
      ]}
    />
  )
}

/**
 * Card skeleton for loading card-based content
 */
export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="60%" height={24} marginBottom={12} borderRadius={6} />
      <Skeleton width="100%" height={16} marginBottom={8} />
      <Skeleton width="80%" height={16} marginBottom={8} />
      <Skeleton width="40%" height={14} />
    </View>
  )
}

/**
 * Chart skeleton for loading chart visualizations
 */
export function ChartSkeleton() {
  return (
    <View style={styles.chartContainer}>
      <Skeleton width="100%" height={220} borderRadius={16} />
    </View>
  )
}

/**
 * Stats row skeleton for loading summary statistics
 */
export function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.statsRow}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.statCard}>
          <Skeleton width={60} height={32} marginBottom={8} borderRadius={8} />
          <Skeleton width="100%" height={12} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartContainer: {
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
})
