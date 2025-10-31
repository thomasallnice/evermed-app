import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { createGlucoseReading } from '../../api/glucose'
import { HapticFeedback } from '../../utils/haptics'

// Navigation types
type RootStackParamList = {
  ManualEntry: undefined
  GlucoseList: undefined
}

type Props = NativeStackScreenProps<RootStackParamList, 'ManualEntry'>

// Helper functions
function convertToMgDl(value: number, unit: 'mg/dL' | 'mmol/L'): number {
  return unit === 'mmol/L' ? value * 18.0182 : value
}

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

export default function ManualEntryScreen({ navigation }: Props) {
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<'mg/dL' | 'mmol/L'>('mg/dL')
  const [timestamp, setTimestamp] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [source, setSource] = useState<'fingerstick' | 'lab'>('fingerstick')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const glucoseValue = parseFloat(value) || 0
  const mgDlValue = convertToMgDl(glucoseValue, unit)
  const rangeColor = glucoseValue > 0 ? getGlucoseColor(mgDlValue) : '#6b7280'
  const rangeLabel = glucoseValue > 0 ? getRangeLabel(mgDlValue) : ''

  const handleSave = async () => {
    // Validation
    if (!value || glucoseValue <= 0) {
      HapticFeedback.error()
      Alert.alert('Invalid Value', 'Please enter a valid glucose value')
      return
    }

    if (mgDlValue < 20 || mgDlValue > 600) {
      HapticFeedback.error()
      Alert.alert(
        'Out of Range',
        'Glucose value must be between 20-600 mg/dL (1.1-33.3 mmol/L)'
      )
      return
    }

    if (timestamp > new Date()) {
      HapticFeedback.error()
      Alert.alert('Invalid Time', 'Timestamp cannot be in the future')
      return
    }

    try {
      setSaving(true)

      // Call API to save glucose reading
      await createGlucoseReading(
        mgDlValue,
        source,
        timestamp.toISOString()
      )

      HapticFeedback.success()
      Alert.alert('Success', 'Glucose reading saved', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (error: any) {
      HapticFeedback.error()
      const errorMessage = error?.message || 'Failed to save glucose reading. Please try again.'
      Alert.alert('Error', errorMessage)
      console.error('Save glucose error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    HapticFeedback.light()
    navigation.goBack()
  }

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setTimestamp(selectedDate)
    }
  }

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false)
    if (selectedTime) {
      const newTimestamp = new Date(timestamp)
      newTimestamp.setHours(selectedTime.getHours())
      newTimestamp.setMinutes(selectedTime.getMinutes())
      setTimestamp(newTimestamp)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Glucose Reading</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={saving}
          >
            <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Glucose Value Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>GLUCOSE VALUE</Text>
            <View style={styles.valueInputContainer}>
              <TextInput
                style={styles.valueInput}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                maxLength={6}
                autoFocus
              />
              <View style={styles.unitContainer}>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'mg/dL' && styles.unitButtonActive]}
                  onPress={() => {
                    HapticFeedback.selection()
                    setUnit('mg/dL')
                  }}
                >
                  <Text
                    style={[styles.unitButtonText, unit === 'mg/dL' && styles.unitButtonTextActive]}
                  >
                    mg/dL
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'mmol/L' && styles.unitButtonActive]}
                  onPress={() => {
                    HapticFeedback.selection()
                    setUnit('mmol/L')
                  }}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unit === 'mmol/L' && styles.unitButtonTextActive,
                    ]}
                  >
                    mmol/L
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Range Indicator */}
            {glucoseValue > 0 && (
              <View style={[styles.rangeIndicator, { backgroundColor: rangeColor + '15' }]}>
                <View style={[styles.rangeDot, { backgroundColor: rangeColor }]} />
                <Text style={[styles.rangeLabel, { color: rangeColor }]}>{rangeLabel}</Text>
                {unit === 'mmol/L' && (
                  <Text style={styles.convertedValue}>({mgDlValue.toFixed(0)} mg/dL)</Text>
                )}
              </View>
            )}
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATE & TIME</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeIcon}>📅</Text>
                <Text style={styles.dateTimeText}>{formatDate(timestamp)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeIcon}>🕐</Text>
                <Text style={styles.dateTimeText}>{formatTime(timestamp)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Source */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SOURCE</Text>
            <View style={styles.sourceRow}>
              <TouchableOpacity
                style={[styles.sourceButton, source === 'fingerstick' && styles.sourceButtonActive]}
                onPress={() => {
                  HapticFeedback.selection()
                  setSource('fingerstick')
                }}
              >
                <Text style={styles.sourceIcon}>🩸</Text>
                <Text
                  style={[
                    styles.sourceButtonText,
                    source === 'fingerstick' && styles.sourceButtonTextActive,
                  ]}
                >
                  Fingerstick
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceButton, source === 'lab' && styles.sourceButtonActive]}
                onPress={() => {
                  HapticFeedback.selection()
                  setSource('lab')
                }}
              >
                <Text style={styles.sourceIcon}>🧪</Text>
                <Text
                  style={[styles.sourceButtonText, source === 'lab' && styles.sourceButtonTextActive]}
                >
                  Lab Test
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes about this reading..."
              placeholderTextColor="#9ca3af"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Target Range Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Target Range</Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>70-180 mg/dL</Text> (3.9-10.0 mmol/L)
            </Text>
            <Text style={styles.infoSubtext}>
              This is the recommended target range for most people. Consult your healthcare provider
              for your personal targets.
            </Text>
          </View>
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={timestamp}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={timestamp}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'right',
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  valueInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  valueInput: {
    fontSize: 72,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    minWidth: 150,
  },
  unitContainer: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  unitButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  unitButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  unitButtonTextActive: {
    color: '#2563eb',
  },
  rangeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
  },
  rangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  rangeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  convertedValue: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateTimeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sourceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  sourceButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  sourceIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sourceButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  sourceButtonTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 8,
  },
  infoBold: {
    fontWeight: '700',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#60a5fa',
    lineHeight: 18,
  },
})
