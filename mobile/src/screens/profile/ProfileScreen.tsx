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
  TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import * as HealthKit from '../../api/healthkit'
import * as ProfileAPI from '../../api/profile'

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

  // Health Profile state
  const [profile, setProfile] = useState<ProfileAPI.HealthProfile>({})
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [selectedSex, setSelectedSex] = useState<string | null>(null)
  const [customSex, setCustomSex] = useState('')

  // Check HealthKit availability and load profile on mount
  useEffect(() => {
    checkHealthKitAvailability()
    loadConnectionStatus()
    loadHealthProfile()
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

  const loadHealthProfile = async () => {
    try {
      setIsLoadingProfile(true)
      const data = await ProfileAPI.getHealthProfile()
      setProfile(data)

      // Initialize sex selection state
      if (data.sexAtBirth) {
        const sexValue = data.sexAtBirth
        if (['Male', 'Female', 'Other'].includes(sexValue)) {
          setSelectedSex(sexValue)
        } else {
          setSelectedSex('Custom')
          setCustomSex(sexValue)
        }
      }
    } catch (error) {
      console.error('[PROFILE] Failed to load health profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const saveHealthProfile = async () => {
    try {
      setIsSavingProfile(true)

      // Build profile object
      const updatedProfile: Partial<ProfileAPI.HealthProfile> = {
        ...profile,
      }

      // Update sex from selection state
      if (selectedSex === 'Custom') {
        updatedProfile.sexAtBirth = customSex || undefined
      } else if (selectedSex) {
        updatedProfile.sexAtBirth = selectedSex
      }

      await ProfileAPI.updateHealthProfile(updatedProfile)

      // Reload profile to get computed BMI
      await loadHealthProfile()

      Alert.alert('Success', 'Health profile updated successfully')
    } catch (error: any) {
      console.error('[PROFILE] Failed to save health profile:', error)
      Alert.alert('Error', error.message || 'Failed to save profile. Please try again.')
    } finally {
      setIsSavingProfile(false)
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

      {/* Personal Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={profile.givenName || ''}
                onChangeText={(text) => setProfile({ ...profile, givenName: text })}
                placeholder="John"
                editable={!isSavingProfile}
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={profile.familyName || ''}
                onChangeText={(text) => setProfile({ ...profile, familyName: text })}
                placeholder="Doe"
                editable={!isSavingProfile}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Health Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Profile</Text>
        <View style={styles.card}>
          {isLoadingProfile ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <>
              {/* Sex */}
              <Text style={styles.label}>Sex</Text>
              <View style={styles.chipContainer}>
                {['Male', 'Female', 'Other', 'Custom'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.chip,
                      selectedSex === option && styles.chipSelected,
                    ]}
                    onPress={() => {
                      setSelectedSex(option)
                      if (option !== 'Custom') {
                        setCustomSex('')
                      }
                    }}
                    disabled={isSavingProfile}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedSex === option && styles.chipTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedSex === 'Custom' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={customSex}
                  onChangeText={setCustomSex}
                  placeholder="Please specify"
                  editable={!isSavingProfile}
                />
              )}

              {/* Age, Height, Weight */}
              <View style={styles.inputRow}>
                <View style={styles.inputThird}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.age?.toString() || ''}
                    onChangeText={(text) =>
                      setProfile({ ...profile, age: text ? Number(text) : undefined })
                    }
                    placeholder="25"
                    keyboardType="number-pad"
                    editable={!isSavingProfile}
                  />
                </View>
                <View style={styles.inputThird}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.heightCm?.toString() || ''}
                    onChangeText={(text) =>
                      setProfile({ ...profile, heightCm: text ? Number(text) : undefined })
                    }
                    placeholder="170"
                    keyboardType="number-pad"
                    editable={!isSavingProfile}
                  />
                </View>
                <View style={styles.inputThird}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.weightKg?.toString() || ''}
                    onChangeText={(text) =>
                      setProfile({ ...profile, weightKg: text ? Number(text) : undefined })
                    }
                    placeholder="70"
                    keyboardType="number-pad"
                    editable={!isSavingProfile}
                  />
                </View>
              </View>

              {/* BMI Display */}
              {profile.bmi && (
                <View style={styles.bmiContainer}>
                  <Text style={styles.bmiLabel}>BMI: </Text>
                  <Text style={styles.bmiValue}>{profile.bmi.toFixed(1)}</Text>
                </View>
              )}

              {/* Diet */}
              <Text style={styles.label}>Diet (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={profile.diet?.join(', ') || ''}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    diet: text.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="vegetarian, gluten-free"
                editable={!isSavingProfile}
              />

              {/* Behaviors */}
              <Text style={styles.label}>Behaviors (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={profile.behaviors?.join(', ') || ''}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    behaviors: text.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="exercise, meditation"
                editable={!isSavingProfile}
              />

              {/* Allergies */}
              <Text style={styles.label}>Allergies (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={profile.allergies?.join(', ') || ''}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    allergies: text.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="peanuts, shellfish"
                editable={!isSavingProfile}
              />

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, isSavingProfile && styles.saveButtonDisabled]}
                onPress={saveHealthProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.helperText}>
                Your profile helps the AI tailor responses. You can update it anytime.
              </Text>
            </>
          )}
        </View>
      </View>

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
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputThird: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextSelected: {
    color: '#fff',
  },
  bmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  bmiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  bmiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
