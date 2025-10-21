// Glucose Screen
// Manual glucose entry and tracking

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { createGlucoseReading, getGlucoseReadings, GlucoseReading } from '../../api/glucose'
import * as HealthKit from '../../api/healthkit'

type GlucoseSource = 'fingerstick' | 'cgm' | 'lab'

export function GlucoseScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  // Form state
  const [glucoseValue, setGlucoseValue] = useState('')
  const [selectedSource, setSelectedSource] = useState<GlucoseSource>('fingerstick')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Readings state
  const [readings, setReadings] = useState<GlucoseReading[]>([])
  const [isLoadingReadings, setIsLoadingReadings] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [disclaimer, setDisclaimer] = useState<string | null>(null)

  // HealthKit state
  const [healthKitAvailable, setHealthKitAvailable] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<HealthKit.HealthKitConnectionStatus>({
    isConnected: false,
    lastSync: null,
    provider: 'apple_health',
  })

  // Load readings and HealthKit status on mount
  useEffect(() => {
    loadReadings()
    checkHealthKitStatus()
  }, [])

  const checkHealthKitStatus = async () => {
    try {
      const available = await HealthKit.isHealthKitAvailable()
      setHealthKitAvailable(available)

      if (available) {
        const status = await HealthKit.getConnectionStatus()
        setConnectionStatus(status)

        // Perform background sync if connected
        if (status.isConnected) {
          await HealthKit.performBackgroundSync()
        }
      }
    } catch (error) {
      console.error('[GLUCOSE SCREEN] Failed to check HealthKit status:', error)
    }
  }

  const loadReadings = async () => {
    try {
      setIsLoadingReadings(true)
      const response = await getGlucoseReadings({ limit: 50 })
      setReadings(response.readings)
      setDisclaimer(response.disclaimer)
    } catch (error: any) {
      console.error('[GLUCOSE SCREEN] Failed to load readings:', error)
      // Don't show error alert on initial load - just log it
    } finally {
      setIsLoadingReadings(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([loadReadings(), checkHealthKitStatus()])
    setIsRefreshing(false)
  }

  const validateGlucoseValue = (value: string): boolean => {
    setValidationError(null)

    if (!value.trim()) {
      setValidationError('Please enter a glucose value')
      return false
    }

    const numValue = parseFloat(value)

    if (isNaN(numValue)) {
      setValidationError('Please enter a valid number')
      return false
    }

    if (numValue < 20 || numValue > 600) {
      setValidationError('Please enter a value between 20 and 600 mg/dL')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    // Clear previous messages
    setSuccessMessage(null)

    // Validate input
    if (!validateGlucoseValue(glucoseValue)) {
      return
    }

    const numValue = parseFloat(glucoseValue)

    try {
      setIsSubmitting(true)
      const response = await createGlucoseReading(numValue, selectedSource)

      // Show success message
      setSuccessMessage(`Glucose reading saved: ${response.reading.value} mg/dL`)

      // Clear form
      setGlucoseValue('')
      setValidationError(null)

      // Refresh readings list
      await loadReadings()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error('[GLUCOSE SCREEN] Submit error:', error)
      Alert.alert('Error', error.message || 'Failed to save glucose reading. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    // Older than 7 days - show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getSourceBadgeStyle = (source: GlucoseSource) => {
    switch (source) {
      case 'fingerstick':
        return styles.sourceBadgeFingerstick
      case 'cgm':
        return styles.sourceBadgeCgm
      case 'lab':
        return styles.sourceBadgeLab
      default:
        return styles.sourceBadgeFingerstick
    }
  }

  const getSourceLabel = (source: GlucoseSource): string => {
    switch (source) {
      case 'fingerstick':
        return 'Fingerstick'
      case 'cgm':
        return 'CGM'
      case 'lab':
        return 'Lab Test'
      default:
        return source
    }
  }

  const isSubmitDisabled = isSubmitting || !glucoseValue.trim()

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Glucose Tracking</Text>
        <Text style={styles.subtitle}>Monitor your glucose levels</Text>
      </View>

      {/* HealthKit Not Connected Prompt */}
      {healthKitAvailable && !connectionStatus.isConnected && (
        <View style={styles.healthKitPrompt}>
          <View style={styles.healthKitPromptHeader}>
            <Text style={styles.healthKitPromptTitle}>Connect Apple Health</Text>
          </View>
          <Text style={styles.healthKitPromptText}>
            Automatically sync your glucose readings from Apple Health for continuous tracking.
          </Text>
          <TouchableOpacity
            style={styles.healthKitPromptButton}
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <Text style={styles.healthKitPromptButtonText}>Connect in Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HealthKit Sync Status Banner (if connected) */}
      {healthKitAvailable && connectionStatus.isConnected && (
        <TouchableOpacity
          style={styles.healthKitBanner}
          onPress={async () => {
            try {
              setIsRefreshing(true)
              await HealthKit.performBackgroundSync()
              await Promise.all([loadReadings(), checkHealthKitStatus()])
              Alert.alert('Sync Complete', 'Your Apple Health data has been refreshed.')
            } catch (error: any) {
              Alert.alert('Sync Failed', error.message || 'Failed to sync with Apple Health')
            } finally {
              setIsRefreshing(false)
            }
          }}
          disabled={isRefreshing}
        >
          <View style={styles.healthKitBannerHeader}>
            <Text style={styles.healthKitBannerTitle}>Apple Health Connected</Text>
            <View style={styles.healthKitSyncBadge}>
              <Text style={styles.healthKitSyncBadgeText}>✓ Synced</Text>
            </View>
          </View>
          <Text style={styles.healthKitBannerText}>
            Last synced:{' '}
            {connectionStatus.lastSync
              ? formatTimestamp(connectionStatus.lastSync.toISOString())
              : 'Never'}
          </Text>
          <View style={styles.resyncButton}>
            <Text style={styles.resyncButtonText}>
              {isRefreshing ? 'Syncing...' : 'Tap to re-sync'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Manual Entry Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Log Glucose Reading</Text>

        {/* Success Message */}
        {successMessage && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Glucose Value Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Glucose Value (mg/dL)</Text>
          <TextInput
            style={[styles.input, validationError ? styles.inputError : null]}
            value={glucoseValue}
            onChangeText={(text) => {
              setGlucoseValue(text)
              setValidationError(null)
            }}
            placeholder="Enter value (20-600)"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
            editable={!isSubmitting}
          />
          {validationError && (
            <Text style={styles.errorText}>{validationError}</Text>
          )}
          <Text style={styles.inputHint}>Valid range: 20-600 mg/dL</Text>
        </View>

        {/* Source Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Source</Text>
          <View style={styles.sourceButtonGroup}>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                selectedSource === 'fingerstick' && styles.sourceButtonActive,
              ]}
              onPress={() => setSelectedSource('fingerstick')}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.sourceButtonText,
                  selectedSource === 'fingerstick' && styles.sourceButtonTextActive,
                ]}
              >
                Fingerstick
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sourceButton,
                selectedSource === 'cgm' && styles.sourceButtonActive,
              ]}
              onPress={() => setSelectedSource('cgm')}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.sourceButtonText,
                  selectedSource === 'cgm' && styles.sourceButtonTextActive,
                ]}
              >
                CGM
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sourceButton,
                selectedSource === 'lab' && styles.sourceButtonActive,
              ]}
              onPress={() => setSelectedSource('lab')}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.sourceButtonText,
                  selectedSource === 'lab' && styles.sourceButtonTextActive,
                ]}
              >
                Lab Test
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Log Reading</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Readings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Readings</Text>

        {isLoadingReadings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#2563eb" size="large" />
          </View>
        ) : readings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No glucose readings yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Log your first reading above to start tracking
            </Text>
          </View>
        ) : (
          <View style={styles.readingsList}>
            {readings.map((reading) => (
              <View key={reading.id} style={styles.readingCard}>
                <View style={styles.readingHeader}>
                  <Text style={styles.readingValue}>{reading.value} mg/dL</Text>
                  <View style={[styles.sourceBadge, getSourceBadgeStyle(reading.source)]}>
                    <Text style={styles.sourceBadgeText}>
                      {getSourceLabel(reading.source)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.readingTimestamp}>
                  {formatTimestamp(reading.timestamp)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Medical Disclaimer */}
      {disclaimer && (
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>{disclaimer}</Text>
        </View>
      )}
    </ScrollView>
  )
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
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  successText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    fontWeight: '500',
  },
  sourceButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  sourceButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sourceButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  readingsList: {
    gap: 12,
  },
  readingCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readingValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  readingTimestamp: {
    fontSize: 13,
    color: '#6b7280',
  },
  sourceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  sourceBadgeFingerstick: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  sourceBadgeCgm: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  sourceBadgeLab: {
    backgroundColor: '#f3e8ff',
    borderColor: '#e9d5ff',
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  disclaimerCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  // HealthKit styles
  healthKitPrompt: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  healthKitPromptHeader: {
    marginBottom: 8,
  },
  healthKitPromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
  healthKitPromptText: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 16,
    lineHeight: 20,
  },
  healthKitPromptButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  healthKitPromptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  healthKitBanner: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  healthKitBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  healthKitBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  healthKitSyncBadge: {
    backgroundColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  healthKitSyncBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  healthKitBannerText: {
    fontSize: 12,
    color: '#047857',
  },
  resyncButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#10b981',
    borderRadius: 8,
    alignItems: 'center',
  },
  resyncButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
})
