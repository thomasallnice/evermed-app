// Save Template Modal
// Modal dialog for saving a meal as a reusable template

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { createMealTemplate, Ingredient, NutritionTotals } from '../api/templates'

export interface SaveTemplateModalProps {
  visible: boolean
  onClose: () => void
  ingredients: Ingredient[]
  nutritionTotals: NutritionTotals
  mealType?: string
}

export function SaveTemplateModal({
  visible,
  onClose,
  ingredients,
  nutritionTotals,
  mealType,
}: SaveTemplateModalProps) {
  const [templateName, setTemplateName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const getMealTypeEmoji = (type?: string) => {
    switch (type) {
      case 'breakfast':
        return '🌅'
      case 'lunch':
        return '☀️'
      case 'dinner':
        return '🌙'
      case 'snack':
        return '🍎'
      default:
        return '🍽️'
    }
  }

  const handleSave = async () => {
    // Validate name
    if (!templateName.trim()) {
      setError('Template name is required')
      return
    }

    if (templateName.trim().length > 100) {
      setError('Template name must be 100 characters or less')
      return
    }

    if (description.length > 500) {
      setError('Description must be 500 characters or less')
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      await createMealTemplate({
        name: templateName.trim(),
        description: description.trim() || undefined,
        ingredients,
        nutritionTotals,
      })

      // Show success feedback
      setSuccess(true)

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err: any) {
      console.error('Failed to save template:', err)
      setError(err.message || 'Failed to save template. Please try again.')
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    // Reset state
    setTemplateName('')
    setDescription('')
    setError(null)
    setSuccess(false)
    setIsSaving(false)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.modalContent}>
          {success ? (
            // Success State
            <View style={styles.successContainer}>
              <Text style={styles.successEmoji}>✨</Text>
              <Text style={styles.successTitle}>Template saved!</Text>
              <Text style={styles.successSubtitle}>You can now use it for quick logging</Text>
            </View>
          ) : (
            // Form State
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <Text style={styles.headerEmoji}>{getMealTypeEmoji(mealType)}</Text>
                <Text style={styles.title}>Save as Template</Text>
                <Text style={styles.subtitle}>
                  Create a quick template for this meal
                </Text>
              </View>

              {/* Nutrition Preview */}
              <View style={styles.nutritionPreview}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Math.round(nutritionTotals.calories)}
                  </Text>
                  <Text style={styles.nutritionLabel}>kcal</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Math.round(nutritionTotals.carbs)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Math.round(nutritionTotals.protein)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Math.round(nutritionTotals.fat)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>fat</Text>
                </View>
              </View>

              {/* Template Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Template Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, error && !templateName.trim() && styles.inputError]}
                  value={templateName}
                  onChangeText={(text) => {
                    setTemplateName(text)
                    setError(null)
                  }}
                  placeholder="e.g., My Morning Breakfast"
                  placeholderTextColor="#9ca3af"
                  maxLength={100}
                  autoFocus
                  accessibilityLabel="Template name"
                  accessibilityHint="Enter a name for this template"
                />
                <Text style={styles.charCount}>{templateName.length}/100</Text>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g., 2 eggs, toast, coffee"
                  placeholderTextColor="#9ca3af"
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  accessibilityLabel="Template description"
                  accessibilityHint="Optional description for this template"
                />
                <Text style={styles.charCount}>{description.length}/500</Text>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleClose}
                  disabled={isSaving}
                  accessibilityLabel="Skip saving template"
                  accessibilityHint="Close this dialog without saving"
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                  accessibilityLabel="Save template"
                  accessibilityHint="Save this meal as a reusable template"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Template</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  nutritionPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  nutritionLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
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
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  textArea: {
    height: 80,
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'right',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
})
