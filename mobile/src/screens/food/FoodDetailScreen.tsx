// Food Detail Screen
// Shows detailed view of a single meal with edit functionality

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { getFoodEntry, deleteFoodEntry, updateFoodEntry, FoodEntry } from '../../api/food'

interface EditableIngredient {
  id?: string
  name: string
  quantity: number
  unit: string
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  fiberG: number
}

export function FoodDetailScreen({ route, navigation }: any) {
  const { id } = route.params
  const [entry, setEntry] = useState<FoodEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedMealType, setEditedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [editedIngredients, setEditedIngredients] = useState<EditableIngredient[]>([])
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    loadEntry()
  }, [id])

  const loadEntry = async () => {
    try {
      const data = await getFoodEntry(id)
      setEntry(data)
      setEditedMealType(data.mealType)
      setEditedIngredients(data.ingredients || [])
    } catch (error) {
      Alert.alert('Error', 'Failed to load meal details')
      navigation.goBack()
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    if (!entry) return
    setEditedMealType(entry.mealType)
    setEditedIngredients(entry.ingredients || [])
    setIsEditing(true)
    setErrorMessage(null)
  }

  const handleCancel = () => {
    if (!entry) return
    setEditedMealType(entry.mealType)
    setEditedIngredients(entry.ingredients || [])
    setIsEditing(false)
    setErrorMessage(null)
  }

  const handleSave = async () => {
    // Validate ingredients
    const validationError = validateIngredients()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const updated = await updateFoodEntry(id, {
        mealType: editedMealType,
        ingredients: editedIngredients,
      })
      setEntry(updated)
      setIsEditing(false)
      setShowSuccessBanner(true)
      setTimeout(() => setShowSuccessBanner(false), 3000)
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const validateIngredients = (): string | null => {
    if (editedIngredients.length === 0) {
      return 'At least one ingredient is required'
    }

    for (let i = 0; i < editedIngredients.length; i++) {
      const ingredient = editedIngredients[i]
      if (!ingredient.name || ingredient.name.trim() === '') {
        return `Ingredient ${i + 1}: Name is required`
      }
      if (ingredient.quantity <= 0) {
        return `${ingredient.name}: Quantity must be greater than 0`
      }
      if (!ingredient.unit || ingredient.unit.trim() === '') {
        return `${ingredient.name}: Unit is required`
      }
      if (ingredient.calories < 0 || ingredient.carbsG < 0 || ingredient.proteinG < 0 || ingredient.fatG < 0 || ingredient.fiberG < 0) {
        return `${ingredient.name}: Nutrition values cannot be negative`
      }
    }

    return null
  }

  const handleAddIngredient = () => {
    setEditedIngredients([
      ...editedIngredients,
      {
        name: '',
        quantity: 0,
        unit: 'g',
        calories: 0,
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
        fiberG: 0,
      },
    ])
  }

  const handleRemoveIngredient = (index: number) => {
    setEditedIngredients(editedIngredients.filter((_, i) => i !== index))
  }

  const handleUpdateIngredient = (index: number, field: keyof EditableIngredient, value: any) => {
    const updated = [...editedIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setEditedIngredients(updated)
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            try {
              await deleteFoodEntry(id)
              navigation.goBack()
            } catch (error) {
              Alert.alert('Error', 'Failed to delete meal')
            } finally {
              setIsDeleting(false)
            }
          },
        },
      ]
    )
  }

  const getMealTypeEmoji = (mealType: string) => {
    switch (mealType) {
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (!entry) {
    return null
  }

  return (
    <ScrollView style={styles.container}>
      {/* Photos */}
      {entry.photoUrls && entry.photoUrls.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroll}
        >
          {entry.photoUrls.map((url, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri: url }} style={styles.photo} resizeMode="cover" />
              {entry.photoUrls.length > 1 && (
                <View style={styles.photoIndicator}>
                  <Text style={styles.photoIndicatorText}>
                    {index + 1} / {entry.photoUrls.length}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Success Banner */}
      {showSuccessBanner && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>Meal updated successfully!</Text>
        </View>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.mealEmoji}>{getMealTypeEmoji(isEditing ? editedMealType : entry.mealType)}</Text>
          <View>
            <Text style={styles.mealType}>
              {(isEditing ? editedMealType : entry.mealType).charAt(0).toUpperCase() + (isEditing ? editedMealType : entry.mealType).slice(1)}
            </Text>
            <Text style={styles.mealTime}>
              {new Date(entry.timestamp).toLocaleString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
        {!isEditing && (
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.cancelButton, isSaving && styles.buttonDisabled]}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Meal Type Selector (Edit Mode) */}
      {isEditing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Type</Text>
          <View style={styles.mealTypeSelector}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealTypeButton,
                  editedMealType === type && styles.mealTypeButtonActive,
                ]}
                onPress={() => setEditedMealType(type)}
                disabled={isSaving}
              >
                <Text style={styles.mealTypeEmoji}>{getMealTypeEmoji(type)}</Text>
                <Text style={[
                  styles.mealTypeButtonText,
                  editedMealType === type && styles.mealTypeButtonTextActive,
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Nutrition Summary */}
      {entry.analysisStatus === 'completed' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition Summary</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionValue}>{Math.round(entry.totalCalories)}</Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionValue}>{Math.round(entry.totalCarbsG)}g</Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionValue}>{Math.round(entry.totalProteinG)}g</Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionValue}>{Math.round(entry.totalFatG)}g</Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
              {entry.totalFiberG > 0 && (
                <View style={styles.nutritionCard}>
                  <Text style={styles.nutritionValue}>{Math.round(entry.totalFiberG)}g</Text>
                  <Text style={styles.nutritionLabel}>Fiber</Text>
                </View>
              )}
            </View>
          </View>

          {/* Ingredients (Read-Only) */}
          {!isEditing && entry.ingredients && entry.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {entry.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientCard}>
                  <View style={styles.ingredientHeader}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientQuantity}>
                      {ingredient.quantity} {ingredient.unit}
                    </Text>
                  </View>
                  <View style={styles.ingredientNutrition}>
                    <Text style={styles.ingredientNutritionText}>
                      {Math.round(ingredient.calories)} kcal
                    </Text>
                    <Text style={styles.ingredientNutritionText}>•</Text>
                    <Text style={styles.ingredientNutritionText}>
                      {Math.round(ingredient.carbsG)}g carbs
                    </Text>
                    <Text style={styles.ingredientNutritionText}>•</Text>
                    <Text style={styles.ingredientNutritionText}>
                      {Math.round(ingredient.proteinG)}g protein
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Ingredients (Edit Mode) */}
      {isEditing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {editedIngredients.map((ingredient, index) => (
            <View key={index} style={styles.editIngredientCard}>
              <View style={styles.editIngredientHeader}>
                <TextInput
                  style={styles.ingredientNameInput}
                  value={ingredient.name}
                  onChangeText={(value) => handleUpdateIngredient(index, 'name', value)}
                  placeholder="Ingredient name"
                  placeholderTextColor="#9ca3af"
                  editable={!isSaving}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveIngredient(index)}
                  disabled={isSaving}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editIngredientRow}>
                <Text style={styles.editLabel}>Quantity</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ingredient.quantity.toString()}
                  onChangeText={(value) => handleUpdateIngredient(index, 'quantity', parseFloat(value) || 0)}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                  editable={!isSaving}
                />
                <Picker
                  selectedValue={ingredient.unit}
                  onValueChange={(value) => handleUpdateIngredient(index, 'unit', value)}
                  style={styles.unitPicker}
                  enabled={!isSaving}
                >
                  <Picker.Item label="g" value="g" />
                  <Picker.Item label="ml" value="ml" />
                  <Picker.Item label="oz" value="oz" />
                  <Picker.Item label="cup" value="cup" />
                  <Picker.Item label="tbsp" value="tbsp" />
                  <Picker.Item label="tsp" value="tsp" />
                  <Picker.Item label="serving" value="serving" />
                  <Picker.Item label="piece" value="piece" />
                </Picker>
              </View>

              <View style={styles.editIngredientRow}>
                <Text style={styles.editLabel}>Calories</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ingredient.calories.toString()}
                  onChangeText={(value) => handleUpdateIngredient(index, 'calories', parseFloat(value) || 0)}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                  editable={!isSaving}
                />
                <Text style={styles.unitText}>kcal</Text>
              </View>

              <View style={styles.editIngredientRow}>
                <Text style={styles.editLabel}>Carbs</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ingredient.carbsG.toString()}
                  onChangeText={(value) => handleUpdateIngredient(index, 'carbsG', parseFloat(value) || 0)}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                  editable={!isSaving}
                />
                <Text style={styles.unitText}>g</Text>
              </View>

              <View style={styles.editIngredientRow}>
                <Text style={styles.editLabel}>Protein</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ingredient.proteinG.toString()}
                  onChangeText={(value) => handleUpdateIngredient(index, 'proteinG', parseFloat(value) || 0)}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                  editable={!isSaving}
                />
                <Text style={styles.unitText}>g</Text>
              </View>

              <View style={styles.editIngredientRow}>
                <Text style={styles.editLabel}>Fat</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ingredient.fatG.toString()}
                  onChangeText={(value) => handleUpdateIngredient(index, 'fatG', parseFloat(value) || 0)}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                  editable={!isSaving}
                />
                <Text style={styles.unitText}>g</Text>
              </View>

              <View style={styles.editIngredientRow}>
                <Text style={styles.editLabel}>Fiber</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ingredient.fiberG.toString()}
                  onChangeText={(value) => handleUpdateIngredient(index, 'fiberG', parseFloat(value) || 0)}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                  editable={!isSaving}
                />
                <Text style={styles.unitText}>g</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addIngredientButton, isSaving && styles.buttonDisabled]}
            onPress={handleAddIngredient}
            disabled={isSaving}
          >
            <Text style={styles.addIngredientButtonText}>+ Add Ingredient</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Analysis Status */}
      {entry.analysisStatus === 'pending' && (
        <View style={styles.statusCard}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.statusText}>
            AI is analyzing your meal... This usually takes 10-30 seconds.
          </Text>
        </View>
      )}

      {entry.analysisStatus === 'failed' && (
        <View style={[styles.statusCard, styles.statusCardError]}>
          <Text style={styles.statusText}>
            ⚠️ AI analysis failed. You can edit this meal manually or delete it.
          </Text>
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          AI-generated food analysis is an estimate and may not be fully accurate.
          Nutrition information is for general informational purposes only and should
          not be used for medical treatment, insulin dosing, or diagnosis. Always
          consult your healthcare provider for medical advice.
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete Meal</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  photoScroll: {
    height: 300,
    backgroundColor: '#000',
  },
  photoContainer: {
    width: 375, // Approximate screen width
    height: 300,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealEmoji: {
    fontSize: 40,
  },
  mealType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  mealTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    padding: 24,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  ingredientCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  ingredientQuantity: {
    fontSize: 14,
    color: '#6b7280',
  },
  ingredientNutrition: {
    flexDirection: 'row',
    gap: 8,
  },
  ingredientNutritionText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    margin: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
  },
  statusCardError: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  disclaimer: {
    padding: 24,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  actions: {
    padding: 24,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Success/Error Banners
  successBanner: {
    backgroundColor: '#10b981',
    padding: 16,
    alignItems: 'center',
  },
  successBannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    padding: 16,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  // Edit Mode Buttons
  editButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Meal Type Selector
  mealTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  mealTypeButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  mealTypeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  mealTypeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  mealTypeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  mealTypeButtonTextActive: {
    color: '#fff',
  },
  // Edit Ingredient Card
  editIngredientCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  editIngredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ingredientNameInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  removeButton: {
    backgroundColor: '#fee2e2',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editIngredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  editLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    width: 70,
  },
  numberInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  unitPicker: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    height: 42,
  },
  unitText: {
    fontSize: 14,
    color: '#6b7280',
    width: 40,
  },
  addIngredientButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addIngredientButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
})
