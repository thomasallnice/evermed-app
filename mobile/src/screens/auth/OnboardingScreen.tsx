// Onboarding Screen
// Collect health profile data after signup

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { updateHealthProfile } from '../../api/profile'

// Predefined options
const DIET_OPTIONS = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo',
  'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Mediterranean',
  'Halal', 'Kosher',
]

const BEHAVIOR_OPTIONS = [
  'Regular Exercise', 'Sedentary Lifestyle', 'Athlete',
  'Intermittent Fasting', 'Stress Management', 'Good Sleep',
  'Meditation', 'Yoga',
]

const ALLERGY_OPTIONS = [
  'Peanuts', 'Tree Nuts', 'Dairy', 'Eggs', 'Soy',
  'Wheat/Gluten', 'Shellfish', 'Fish', 'Sesame',
]

export function OnboardingScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Basic info (Step 1)
  const [givenName, setGivenName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [birthday, setBirthday] = useState<Date>(new Date(1990, 0, 1))
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false)
  const [sexAtBirth, setSexAtBirth] = useState('')

  // Physical info (Step 2)
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')

  // Preferences (Step 3)
  const [selectedDiets, setSelectedDiets] = useState<string[]>([])
  const [customDiet, setCustomDiet] = useState('')
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([])
  const [customBehavior, setCustomBehavior] = useState('')
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([])
  const [customAllergy, setCustomAllergy] = useState('')

  const toggleDiet = (diet: string) => {
    setSelectedDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    )
  }

  const toggleBehavior = (behavior: string) => {
    setSelectedBehaviors(prev =>
      prev.includes(behavior) ? prev.filter(b => b !== behavior) : [...prev, behavior]
    )
  }

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies(prev =>
      prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
    )
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!givenName.trim()) {
        Alert.alert('Validation', 'Please enter your first name')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // Compile all data
      const customDiets = customDiet.split(',').map(s => s.trim()).filter(Boolean)
      const customBehaviors = customBehavior.split(',').map(s => s.trim()).filter(Boolean)
      const customAllergies = customAllergy.split(',').map(s => s.trim()).filter(Boolean)

      const profile = {
        givenName: givenName.trim(),
        familyName: familyName.trim() || undefined,
        birthYear: birthday.getFullYear(),
        sexAtBirth: sexAtBirth || undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        diet: [...selectedDiets, ...customDiets],
        behaviors: [...selectedBehaviors, ...customBehaviors],
        allergies: [...selectedAllergies, ...customAllergies],
      }

      await updateHealthProfile(profile)

      // Navigate back to login to verify email and sign in
      Alert.alert(
        'Profile Complete!',
        'Your profile has been set up. Please check your email to verify your account, then sign in to get started.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      )
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Let's get to know you</Text>
      <Text style={styles.stepSubtitle}>Tell us a bit about yourself</Text>

      <View style={styles.section}>
        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={styles.input}
          value={givenName}
          onChangeText={setGivenName}
          placeholder="John"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="Doe"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Birthday</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowBirthdayPicker(true)}
        >
          <Text style={styles.inputText}>
            {birthday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </TouchableOpacity>
        {showBirthdayPicker && (
          <DateTimePicker
            value={birthday}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowBirthdayPicker(Platform.OS === 'ios')
              if (selectedDate) setBirthday(selectedDate)
            }}
            maximumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Sex at Birth</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[styles.radioButton, sexAtBirth === 'male' && styles.radioButtonSelected]}
            onPress={() => setSexAtBirth('male')}
          >
            <Text style={[styles.radioText, sexAtBirth === 'male' && styles.radioTextSelected]}>
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, sexAtBirth === 'female' && styles.radioButtonSelected]}
            onPress={() => setSexAtBirth('female')}
          >
            <Text style={[styles.radioText, sexAtBirth === 'female' && styles.radioTextSelected]}>
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Physical Information</Text>
      <Text style={styles.stepSubtitle}>This helps us provide better insights</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          value={heightCm}
          onChangeText={setHeightCm}
          placeholder="170"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="70"
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  )

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Dietary Preferences</Text>
      <Text style={styles.stepSubtitle}>Help us personalize your experience</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Diet</Text>
        <View style={styles.chipContainer}>
          {DIET_OPTIONS.map((diet) => (
            <TouchableOpacity
              key={diet}
              style={[
                styles.chip,
                selectedDiets.includes(diet) && styles.chipSelected,
              ]}
              onPress={() => toggleDiet(diet)}
            >
              <Text style={[
                styles.chipText,
                selectedDiets.includes(diet) && styles.chipTextSelected,
              ]}>
                {diet}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, styles.customInput]}
          value={customDiet}
          onChangeText={setCustomDiet}
          placeholder="Other (comma-separated)"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Lifestyle & Behaviors</Text>
        <View style={styles.chipContainer}>
          {BEHAVIOR_OPTIONS.map((behavior) => (
            <TouchableOpacity
              key={behavior}
              style={[
                styles.chip,
                selectedBehaviors.includes(behavior) && styles.chipSelected,
              ]}
              onPress={() => toggleBehavior(behavior)}
            >
              <Text style={[
                styles.chipText,
                selectedBehaviors.includes(behavior) && styles.chipTextSelected,
              ]}>
                {behavior}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, styles.customInput]}
          value={customBehavior}
          onChangeText={setCustomBehavior}
          placeholder="Other (comma-separated)"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Allergies</Text>
        <View style={styles.chipContainer}>
          {ALLERGY_OPTIONS.map((allergy) => (
            <TouchableOpacity
              key={allergy}
              style={[
                styles.chip,
                selectedAllergies.includes(allergy) && styles.chipSelected,
              ]}
              onPress={() => toggleAllergy(allergy)}
            >
              <Text style={[
                styles.chipText,
                selectedAllergies.includes(allergy) && styles.chipTextSelected,
              ]}>
                {allergy}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, styles.customInput]}
          value={customAllergy}
          onChangeText={setCustomAllergy}
          placeholder="Other (comma-separated)"
        />
      </View>
    </View>
  )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Progress indicator */}
          <View style={styles.progressBar}>
            <View style={[styles.progressStep, currentStep >= 1 && styles.progressStepActive]} />
            <View style={[styles.progressStep, currentStep >= 2 && styles.progressStepActive]} />
            <View style={[styles.progressStep, currentStep >= 3 && styles.progressStepActive]} />
          </View>

          {/* Step content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleBack}
                disabled={isLoading}
              >
                <Text style={styles.buttonSecondaryText}>Back</Text>
              </TouchableOpacity>
            )}

            {currentStep < 3 ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleNext}
              >
                <Text style={styles.buttonPrimaryText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, isLoading && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Complete</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {currentStep === 1 && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Skip Onboarding',
                  'You can complete your profile later in the app settings. Please check your email to verify your account.',
                  [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                )
              }}
              style={styles.skipButton}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#2563eb',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputText: {
    fontSize: 16,
    color: '#111827',
  },
  customInput: {
    marginTop: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  radioText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  radioTextSelected: {
    color: '#2563eb',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipText: {
    color: '#6b7280',
    fontSize: 14,
  },
})
