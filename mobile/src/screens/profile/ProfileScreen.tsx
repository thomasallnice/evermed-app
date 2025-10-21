// Profile Screen
// User settings and profile management

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import * as HealthKit from '../../api/healthkit'

export function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user, signOut } = useAuth()

  // HealthKit state
  const [healthKitAvailable, setHealthKitAvailable] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<HealthKit.HealthKitConnectionStatus>({
    isConnected: false,
    lastSync: null,
    provider: 'apple_health',
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  // Check HealthKit availability on mount
  useEffect(() => {
    checkHealthKitAvailability()
    loadConnectionStatus()
  }, [])

  const checkHealthKitAvailability = async () => {
    try {
      const available = await HealthKit.isHealthKitAvailable()
      setHealthKitAvailable(available)
    } catch (error) {
      console.error('[PROFILE] Failed to check HealthKit availability:', error)
      setHealthKitAvailable(false)
    }
  }

  const loadConnectionStatus = async () => {
    try {
      setIsLoadingStatus(true)
      const status = await HealthKit.getConnectionStatus()
      setConnectionStatus(status)
    } catch (error) {
      console.error('[PROFILE] Failed to load connection status:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const handleConnectHealthKit = async () => {
    try {
      setIsConnecting(true)

      // Request permissions and perform initial sync
      const result = await HealthKit.connectAndSync()

      // Update UI
      await loadConnectionStatus()

      // Show success message
      Alert.alert(
        'Connected to Apple Health',
        `Successfully synced ${result.synced} glucose reading${result.synced !== 1 ? 's' : ''}.${
          result.skipped > 0 ? ` ${result.skipped} readings were skipped (duplicates or invalid).` : ''
        }`,
        [{ text: 'OK' }]
      )
    } catch (error: any) {
      console.error('[PROFILE] HealthKit connection failed:', error)

      // Check if it's a permission error
      if (error.message?.includes('permission')) {
        Alert.alert(
          'Permission Required',
          'To sync glucose data, please enable Carbly in Settings > Privacy > Health > Carbly.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openURL('app-settings:'),
            },
          ]
        )
      } else if (error.message?.includes('not available')) {
        Alert.alert(
          'HealthKit Not Available',
          'Apple HealthKit is not available on this device. Please use a physical iOS device.',
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert('Connection Failed', error.message || 'Failed to connect to Apple Health. Please try again.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true)

      const result = await HealthKit.performBackgroundSync()

      if (!result) {
        Alert.alert('Sync Failed', 'Failed to sync glucose data. Please try again.')
        return
      }

      // Update status
      await loadConnectionStatus()

      // Show success message
      Alert.alert(
        'Sync Complete',
        `Synced ${result.synced} new glucose reading${result.synced !== 1 ? 's' : ''}.${
          result.skipped > 0 ? ` ${result.skipped} readings were skipped (duplicates or invalid).` : ''
        }`,
        [{ text: 'OK' }]
      )
    } catch (error: any) {
      console.error('[PROFILE] Manual sync failed:', error)
      Alert.alert('Sync Failed', error.message || 'Failed to sync glucose data. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Apple Health',
      'Are you sure you want to disconnect from Apple Health? Your existing glucose data will remain, but new readings will not be synced.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await HealthKit.disconnect()
              await loadConnectionStatus()
              Alert.alert('Disconnected', 'Successfully disconnected from Apple Health.')
            } catch (error: any) {
              Alert.alert('Error', 'Failed to disconnect. Please try again.')
            }
          },
        },
      ]
    )
  }

  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Never'

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut()
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to sign out')
          }
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
      </View>

      {/* Apple Health Integration */}
      {healthKitAvailable && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Glucose Data</Text>
          <View style={styles.healthKitCard}>
            <View style={styles.healthKitHeader}>
              <Text style={styles.healthKitTitle}>Apple Health</Text>
              {isLoadingStatus ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : connectionStatus.isConnected ? (
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedBadgeText}>✓ Connected</Text>
                </View>
              ) : (
                <View style={styles.notConnectedBadge}>
                  <Text style={styles.notConnectedBadgeText}>⭕ Not Connected</Text>
                </View>
              )}
            </View>

            <Text style={styles.healthKitDescription}>
              Automatically sync your glucose readings from Apple Health for continuous tracking.
            </Text>

            {connectionStatus.isConnected ? (
              <>
                <View style={styles.syncInfo}>
                  <Text style={styles.syncInfoLabel}>Last synced:</Text>
                  <Text style={styles.syncInfoValue}>
                    {formatLastSync(connectionStatus.lastSync)}
                  </Text>
                </View>

                <View style={styles.healthKitButtons}>
                  <TouchableOpacity
                    style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
                    onPress={handleSyncNow}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <ActivityIndicator color="#374151" size="small" />
                    ) : (
                      <Text style={styles.syncButtonText}>Sync Now</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={handleDisconnect}
                    disabled={isSyncing}
                  >
                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
                onPress={handleConnectHealthKit}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.connectButtonText}>Connect Apple Health</Text>
                )}
              </TouchableOpacity>
            )}

            <Text style={styles.privacyNote}>
              Your health data never leaves your device without your permission.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Carbly v1.0.0 - Beta HealthKit Integration
        </Text>
      </View>
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
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  healthKitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  healthKitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthKitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  healthKitDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  connectedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  connectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  notConnectedBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notConnectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  syncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  syncInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  syncInfoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  healthKitButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  disconnectButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  connectButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyNote: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 48,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
})
