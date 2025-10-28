// Early Insight Card Component
// Displays early pattern insights after 5-7 meal tests

import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import {
  EarlyPattern,
  PatternDetectionSummary,
  getSpikeSeverityEmoji,
  getConfidenceEmoji,
  getMotivationalMessage,
} from '../services/pattern-detection'

interface EarlyInsightCardProps {
  summary: PatternDetectionSummary
}

export function EarlyInsightCard({ summary }: EarlyInsightCardProps) {
  if (summary.needsMoreTests) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🎯</Text>
          <Text style={styles.headerTitle}>
            Unlock Insights ({summary.totalTests}/{summary.totalTests + summary.testsUntilInsights})
          </Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.motivationalText}>{getMotivationalMessage(summary)}</Text>
          <Text style={styles.helperText}>
            Test {summary.testsUntilInsights} more meal
            {summary.testsUntilInsights > 1 ? 's' : ''} to discover which foods spike your glucose.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>💡</Text>
        <Text style={styles.headerTitle}>
          Early Insights ({summary.totalTests} meals tested)
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.motivationalText}>{getMotivationalMessage(summary)}</Text>

        {summary.patternsFound.length === 0 ? (
          <Text style={styles.helperText}>
            Keep testing the same meals to discover patterns!
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.patternScroll}
          >
            {summary.patternsFound.map((pattern, index) => (
              <PatternItem key={index} pattern={pattern} />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  )
}

interface PatternItemProps {
  pattern: EarlyPattern
}

function PatternItem({ pattern }: PatternItemProps) {
  const emoji = getSpikeSeverityEmoji(pattern.category)
  const confidenceEmoji = getConfidenceEmoji(pattern.confidence)

  // Color coding based on category
  const categoryColor =
    pattern.category === 'high_spike'
      ? '#EF4444' // red-500
      : pattern.category === 'moderate_spike'
        ? '#F59E0B' // amber-500
        : '#10B981' // green-500

  const categoryBg =
    pattern.category === 'high_spike'
      ? '#FEE2E2' // red-50
      : pattern.category === 'moderate_spike'
        ? '#FEF3C7' // amber-50
        : '#D1FAE5' // green-50

  return (
    <View style={[styles.patternCard, { backgroundColor: categoryBg }]}>
      <View style={styles.patternHeader}>
        <Text style={styles.patternEmoji}>{emoji}</Text>
        <Text style={styles.confidenceEmoji}>{confidenceEmoji}</Text>
      </View>

      <Text style={styles.patternFood}>{pattern.food}</Text>

      <View style={styles.patternStats}>
        <Text style={[styles.patternSpike, { color: categoryColor }]}>
          {pattern.avgSpike > 0 ? '+' : ''}
          {pattern.avgSpike} mg/dL
        </Text>
        <Text style={styles.patternOccurrences}>Tested {pattern.occurrences}x</Text>
      </View>

      <Text style={styles.patternRecommendation}>{pattern.recommendation}</Text>

      {pattern.confidence === 'low' && (
        <Text style={styles.lowConfidenceNote}>Test again to confirm</Text>
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
    alignItems: 'center',
    marginBottom: 12,
  },
  headerEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937', // gray-800
  },
  content: {
    gap: 12,
  },
  motivationalText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151', // gray-700
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280', // gray-500
    lineHeight: 20,
  },
  patternScroll: {
    marginTop: 8,
  },
  patternCard: {
    width: 240,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB', // gray-200
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternEmoji: {
    fontSize: 32,
  },
  confidenceEmoji: {
    fontSize: 20,
  },
  patternFood: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937', // gray-800
    marginBottom: 8,
  },
  patternStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternSpike: {
    fontSize: 18,
    fontWeight: '700',
  },
  patternOccurrences: {
    fontSize: 14,
    color: '#6B7280', // gray-500
  },
  patternRecommendation: {
    fontSize: 13,
    color: '#374151', // gray-700
    lineHeight: 18,
    fontStyle: 'italic',
  },
  lowConfidenceNote: {
    fontSize: 12,
    color: '#9CA3AF', // gray-400
    marginTop: 8,
    fontStyle: 'italic',
  },
})
