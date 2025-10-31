import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
  fetchReportData,
  exportCSV,
  exportTextReport,
  getMondayOfWeek,
  formatDateISO,
  type ReportOptions,
  type ReportData,
} from '../../api/reports'

// Navigation types
type RootStackParamList = {
  Reports: undefined
}

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>

export default function ReportsScreen({ navigation }: Props) {
  // Date range state
  const [selectedWeek, setSelectedWeek] = useState(getMondayOfWeek(new Date()))
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Report options state
  const [includeGlucose, setIncludeGlucose] = useState(true)
  const [includeMeals, setIncludeMeals] = useState(true)
  const [includeInsights, setIncludeInsights] = useState(true)
  const [customNotes, setCustomNotes] = useState('')

  // Loading state
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      const monday = getMondayOfWeek(selectedDate)
      setSelectedWeek(monday)
    }
  }

  const handlePreviousWeek = () => {
    const prevWeek = new Date(selectedWeek)
    prevWeek.setDate(selectedWeek.getDate() - 7)
    setSelectedWeek(prevWeek)
  }

  const handleNextWeek = () => {
    const nextWeek = new Date(selectedWeek)
    nextWeek.setDate(selectedWeek.getDate() + 7)
    const today = getMondayOfWeek(new Date())
    // Don't allow future weeks
    if (nextWeek <= today) {
      setSelectedWeek(nextWeek)
    }
  }

  const getWeekEndDate = (weekStart: Date): Date => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return weekEnd
  }

  const formatWeekRange = (weekStart: Date): string => {
    const weekEnd = getWeekEndDate(weekStart)
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const handleGenerateReport = async () => {
    try {
      setLoading(true)

      const options: ReportOptions = {
        weekStart: formatDateISO(selectedWeek),
        includeGlucose,
        includeMeals,
        includeInsights,
        customNotes: customNotes.trim() || undefined,
      }

      const data = await fetchReportData(options)
      setReportData(data)

      Alert.alert(
        'Report Ready',
        'Your weekly report has been generated. Choose an export format below.',
        [{ text: 'OK' }]
      )
    } catch (error: any) {
      console.error('Error generating report:', error)
      const errorMessage = error?.message || 'Failed to generate report'
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    if (!reportData) {
      Alert.alert('Error', 'Please generate a report first')
      return
    }

    try {
      setLoading(true)
      await exportCSV(reportData)
    } catch (error: any) {
      console.error('Error exporting CSV:', error)
      const errorMessage = error?.message || 'Failed to export CSV'
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleExportText = async () => {
    if (!reportData) {
      Alert.alert('Error', 'Please generate a report first')
      return
    }

    try {
      setLoading(true)
      await exportTextReport(reportData)
    } catch (error: any) {
      console.error('Error exporting report:', error)
      const errorMessage = error?.message || 'Failed to export report'
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderDatePicker = () => {
    const isCurrentWeek = selectedWeek >= getMondayOfWeek(new Date())
    const weekRange = formatWeekRange(selectedWeek)

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>WEEK</Text>
        <View style={styles.dateNavigation}>
          <TouchableOpacity
            style={styles.dateNavButton}
            onPress={handlePreviousWeek}
            accessibilityLabel="Previous week"
            accessibilityHint="View the previous week for the report"
            accessibilityRole="button"
          >
            <Text style={styles.dateNavIcon}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateDisplay}
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel={`Selected week: ${weekRange}`}
            accessibilityHint="Tap to open calendar and change week"
            accessibilityRole="button"
          >
            <Text style={styles.dateText}>{weekRange}</Text>
            <Text style={styles.dateSubtext}>Tap to change week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateNavButton}
            onPress={handleNextWeek}
            disabled={isCurrentWeek}
            accessibilityLabel="Next week"
            accessibilityHint={isCurrentWeek ? "Cannot select future weeks" : "View the next week for the report"}
            accessibilityRole="button"
            accessibilityState={{ disabled: isCurrentWeek }}
          >
            <Text
              style={[
                styles.dateNavIcon,
                isCurrentWeek && styles.dateNavIconDisabled,
              ]}
            >
              →
            </Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={selectedWeek}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>
    )
  }

  const renderReportOptions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>INCLUDE IN REPORT</Text>
      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => setIncludeGlucose(!includeGlucose)}
        accessibilityLabel="Glucose readings"
        accessibilityHint={`${includeGlucose ? 'Included' : 'Not included'}. Tap to ${includeGlucose ? 'exclude' : 'include'} glucose readings in the report`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: includeGlucose }}
      >
        <View style={styles.checkbox}>
          {includeGlucose && <View style={styles.checkboxChecked} />}
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Glucose Readings</Text>
          <Text style={styles.optionDescription}>
            Include all glucose readings for the week
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => setIncludeMeals(!includeMeals)}
        accessibilityLabel="Meals and nutrition"
        accessibilityHint={`${includeMeals ? 'Included' : 'Not included'}. Tap to ${includeMeals ? 'exclude' : 'include'} meals and nutrition details in the report`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: includeMeals }}
      >
        <View style={styles.checkbox}>
          {includeMeals && <View style={styles.checkboxChecked} />}
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Meals & Nutrition</Text>
          <Text style={styles.optionDescription}>
            Include all meals with nutrition details
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => setIncludeInsights(!includeInsights)}
        accessibilityLabel="Insights and patterns"
        accessibilityHint={`${includeInsights ? 'Included' : 'Not included'}. Tap to ${includeInsights ? 'exclude' : 'include'} insights and patterns in the report`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: includeInsights }}
      >
        <View style={styles.checkbox}>
          {includeInsights && <View style={styles.checkboxChecked} />}
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Insights & Patterns</Text>
          <Text style={styles.optionDescription}>
            Include weekly summary and best/worst meals
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  )

  const renderNotesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>NOTES FOR HEALTHCARE PROVIDER (OPTIONAL)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Add any notes, questions, or concerns for your doctor..."
        placeholderTextColor="#9ca3af"
        value={customNotes}
        onChangeText={setCustomNotes}
        multiline
        numberOfLines={5}
        maxLength={500}
        accessibilityLabel="Notes for healthcare provider"
        accessibilityHint="Add any notes, questions, or concerns to include in the report. Maximum 500 characters"
        accessibilityRole="none"
      />
      <Text
        style={styles.charCount}
        accessible={true}
        accessibilityLabel={`${customNotes.length} of 500 characters used`}
        accessibilityRole="text"
      >
        {customNotes.length}/500 characters
      </Text>
    </View>
  )

  const renderReportPreview = () => {
    if (!reportData) return null

    const weekStart = new Date(reportData.weekStart).toLocaleDateString()
    const weekEnd = new Date(reportData.weekEnd).toLocaleDateString()

    return (
      <View style={styles.previewSection}>
        <Text style={styles.sectionLabel}>REPORT PREVIEW</Text>
        <View
          style={styles.previewCard}
          accessible={true}
          accessibilityLabel={`Report preview for ${weekStart} to ${weekEnd}. Average glucose ${Math.round(reportData.summary.avgGlucose)} mg/dL, ${Math.round(reportData.summary.timeInRange)}% time in range, ${reportData.summary.totalSpikes} spikes, ${reportData.summary.totalMeals} meals. Report includes ${reportData.dailyData.length} days of data`}
          accessibilityRole="summary"
        >
          <Text style={styles.previewTitle}>Weekly Glucose & Meal Report</Text>
          <Text style={styles.previewSubtitle}>
            {weekStart} - {weekEnd}
          </Text>

          <View style={styles.previewStats}>
            <View style={styles.previewStat}>
              <Text style={styles.previewStatLabel}>Avg Glucose</Text>
              <Text style={styles.previewStatValue}>
                {Math.round(reportData.summary.avgGlucose)} mg/dL
              </Text>
            </View>
            <View style={styles.previewStat}>
              <Text style={styles.previewStatLabel}>Time in Range</Text>
              <Text style={styles.previewStatValue}>
                {Math.round(reportData.summary.timeInRange)}%
              </Text>
            </View>
            <View style={styles.previewStat}>
              <Text style={styles.previewStatLabel}>Spikes</Text>
              <Text style={styles.previewStatValue}>{reportData.summary.totalSpikes}</Text>
            </View>
            <View style={styles.previewStat}>
              <Text style={styles.previewStatLabel}>Meals</Text>
              <Text style={styles.previewStatValue}>{reportData.summary.totalMeals}</Text>
            </View>
          </View>

          <Text style={styles.previewNote}>
            Report includes {reportData.dailyData.length} days of data
          </Text>
        </View>
      </View>
    )
  }

  const renderExportButtons = () => (
    <View style={styles.exportSection}>
      <Text style={styles.sectionLabel}>EXPORT OPTIONS</Text>

      <TouchableOpacity
        style={[styles.exportButton, styles.exportButtonPrimary]}
        onPress={handleExportText}
        disabled={loading || !reportData}
        accessibilityLabel="Export as text report"
        accessibilityHint="Export the report as a formatted text file suitable for email"
        accessibilityRole="button"
        accessibilityState={{ disabled: loading || !reportData }}
      >
        <Text style={styles.exportButtonIcon}>📄</Text>
        <View style={styles.exportButtonContent}>
          <Text style={[styles.exportButtonTitle, { color: '#fff' }]}>Text Report</Text>
          <Text style={[styles.exportButtonDescription, { color: '#e0e7ff' }]}>
            Formatted text file suitable for email
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.exportButton, styles.exportButtonSecondary]}
        onPress={handleExportCSV}
        disabled={loading || !reportData}
        accessibilityLabel="Export as CSV data"
        accessibilityHint="Export the report as a spreadsheet file for detailed analysis"
        accessibilityRole="button"
        accessibilityState={{ disabled: loading || !reportData }}
      >
        <Text style={styles.exportButtonIcon}>📊</Text>
        <View style={styles.exportButtonContent}>
          <Text style={[styles.exportButtonTitle, { color: '#2563eb' }]}>CSV Data</Text>
          <Text style={[styles.exportButtonDescription, { color: '#60a5fa' }]}>
            Spreadsheet format for analysis
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.exportNote}>
        Reports will open in the iOS share sheet, allowing you to send via Email, Messages,
        Files, or other apps.
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports & Export</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Range Picker */}
        {renderDatePicker()}

        {/* Report Options */}
        {renderReportOptions()}

        {/* Notes Section */}
        {renderNotesSection()}

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGenerateReport}
          disabled={loading}
          accessibilityLabel={loading ? "Generating report" : "Generate report"}
          accessibilityHint="Create a weekly report with the selected options"
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.generateButtonIcon}>📋</Text>
              <Text style={styles.generateButtonText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Report Preview */}
        {renderReportPreview()}

        {/* Export Buttons */}
        {reportData && renderExportButtons()}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            This report is for informational purposes only and should not be used for diagnosis
            or treatment decisions. Please consult your healthcare provider for medical advice.
          </Text>
        </View>
      </ScrollView>
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
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavIcon: {
    fontSize: 24,
    color: '#2563eb',
    fontWeight: '600',
  },
  dateNavIconDisabled: {
    color: '#d1d5db',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  dateSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2563eb',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#2563eb',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'right',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  previewSection: {
    marginBottom: 24,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  previewStat: {
    flex: 1,
    alignItems: 'center',
  },
  previewStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  previewStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  previewNote: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  exportSection: {
    marginBottom: 24,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  exportButtonPrimary: {
    backgroundColor: '#2563eb',
  },
  exportButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  exportButtonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  exportButtonContent: {
    flex: 1,
  },
  exportButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exportButtonDescription: {
    fontSize: 14,
  },
  exportNote: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginTop: 8,
  },
  disclaimer: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#60a5fa',
    lineHeight: 18,
  },
})
