// Test Strip Stats Card Component
// Displays gamified testing statistics and cost tracking

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import {
  TestStripStats,
  getStreakEmoji,
  getTestingMotivation,
} from '../services/test-strip-tracking'

interface TestStripStatsCardProps {
  stats: TestStripStats
  showCost?: boolean // Whether to display cost information
}

export function TestStripStatsCard({ stats, showCost = false }: TestStripStatsCardProps) {
  const streakEmoji = getStreakEmoji(stats.streak)
  const motivationMessage = getTestingMotivation(stats)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Testing Stats</Text>
        <Text style={styles.headerEmoji}>🩸</Text>
      </View>

      <Text style={styles.motivationText}>{motivationMessage}</Text>

      {/* Today's Progress */}
      <View style={styles.todaySection}>
        <Text style={styles.todayLabel}>Today</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min((stats.today / 3) * 100, 100)}%` }]} />
        </View>
        <Text style={styles.todayCount}>
          {stats.today} / 3 tests {stats.today >= 3 ? '✅' : ''}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.thisWeek}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.averagePerDay}</Text>
          <Text style={styles.statLabel}>Daily Avg</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {streakEmoji} {stats.streak}
          </Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* Cost Tracking (optional) */}
      {showCost && stats.totalCost > 0 && (
        <View style={styles.costSection}>
          <Text style={styles.costLabel}>This Month's Cost</Text>
          <Text style={styles.costValue}>${stats.totalCost.toFixed(2)}</Text>
          <Text style={styles.costHelper}>
            {stats.thisMonth} tests × ${(stats.totalCost / stats.thisMonth).toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937', // gray-800
  },
  headerEmoji: {
    fontSize: 24,
  },
  motivationText: {
    fontSize: 15,
    color: '#374151', // gray-700
    marginBottom: 16,
    fontWeight: '500',
  },
  todaySection: {
    marginBottom: 20,
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280', // gray-500
    marginBottom: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E5E7EB', // gray-200
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB', // blue-600
    borderRadius: 6,
  },
  todayCount: {
    fontSize: 14,
    color: '#6B7280', // gray-500
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB', // gray-50
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB', // gray-200
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937', // gray-800
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280', // gray-500
    fontWeight: '500',
    textAlign: 'center',
  },
  costSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // gray-200
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: '#6B7280', // gray-500
    fontWeight: '500',
    marginBottom: 4,
  },
  costValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#DC2626', // red-600 (cost awareness)
    marginBottom: 4,
  },
  costHelper: {
    fontSize: 12,
    color: '#9CA3AF', // gray-400
  },
})
