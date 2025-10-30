// Edit Ingredient Screen
// Allows users to edit meal ingredients with Nutritionix search integration

import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { MaterialIcons } from '@expo/vector-icons'
import { updateFoodEntry, FoodEntry } from '../../api/food'
import { searchNutritionix, NutritionixSearchResult } from '../../api/nutritionix'

interface Ingredient {
  id?: string
  name: string
  quantity: number
  unit: string
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  fiberG: number
  foodPhotoId?: string | null
}

interface NutritionTotals {
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  fiberG: number
}

export function EditIngredientScreen({ route, navigation }: any) {
  const { entry, dishIndex } = route.params as { entry: FoodEntry; dishIndex?: number }

  // Filter ingredients for specific dish if multi-dish meal
  const getInitialIngredients = (): Ingredient[] => {
    if (!entry.ingredients) return []

    // If dishIndex provided, filter for that dish
    if (typeof dishIndex === 'number' && entry.photos?.[dishIndex]) {
      const photoId = entry.photos[dishIndex].id
      return entry.ingredients.filter((ing) => ing.foodPhotoId === photoId)
    }

    // Otherwise return all ingredients
    return entry.ingredients
  }

  const [ingredients, setIngredients] = useState<Ingredient[]>(getInitialIngredients())
  const [saving, setSaving] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NutritionixSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Real-time nutrition totals calculation
  const totals = useMemo<NutritionTotals>(() => {
    return {
      calories: ingredients.reduce((sum, ing) => sum + ing.calories, 0),
      carbsG: ingredients.reduce((sum, ing) => sum + ing.carbsG, 0),
      proteinG: ingredients.reduce((sum, ing) => sum + ing.proteinG, 0),
      fatG: ingredients.reduce((sum, ing) => sum + ing.fatG, 0),
      fiberG: ingredients.reduce((sum, ing) => sum + ing.fiberG, 0),
    }
  }, [ingredients])

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      await handleSearch()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const results = await searchNutritionix(searchQuery)
      setSearchResults(results)
    } catch (error: any) {
      Alert.alert('Search Error', error.message || 'Failed to search foods')
    } finally {
      setSearching(false)
    }
  }

  const handleSelectFood = (result: NutritionixSearchResult) => {
    const newIngredient: Ingredient = {
      name: result.name,
      quantity: result.servingQty,
      unit: result.servingUnit,
      calories: Math.round(result.calories),
      carbsG: Math.round(result.totalCarbs * 10) / 10,
      proteinG: Math.round(result.protein * 10) / 10,
      fatG: Math.round(result.totalFat * 10) / 10,
      fiberG: Math.round(result.dietaryFiber * 10) / 10,
      // Associate with current dish if multi-dish
      foodPhotoId: typeof dishIndex === 'number' && entry.photos?.[dishIndex]
        ? entry.photos[dishIndex].id
        : null,
    }

    setIngredients([...ingredients, newIngredient])
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleAddIngredient = () => {
    setEditingIndex(null)
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(true)
  }

  const handleEditIngredient = (index: number) => {
    setEditingIndex(index)
    setSearchQuery(ingredients[index].name)
    setShowSearch(true)
  }

  const handleRemoveIngredient = (index: number) => {
    Alert.alert(
      'Remove Ingredient',
      `Remove ${ingredients[index].name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setIngredients(ingredients.filter((_, i) => i !== index))
          },
        },
      ]
    )
  }

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const updated = [...ingredients]
    const originalQuantity = updated[index].quantity
    const ratio = quantity / originalQuantity

    // Scale all nutrition values proportionally
    updated[index] = {
      ...updated[index],
      quantity,
      calories: Math.round(updated[index].calories * ratio),
      carbsG: Math.round(updated[index].carbsG * ratio * 10) / 10,
      proteinG: Math.round(updated[index].proteinG * ratio * 10) / 10,
      fatG: Math.round(updated[index].fatG * ratio * 10) / 10,
      fiberG: Math.round(updated[index].fiberG * ratio * 10) / 10,
    }

    setIngredients(updated)
  }

  const handleUpdateUnit = (index: number, unit: string) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], unit }
    setIngredients(updated)
  }

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes?',
      'Your changes will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    )
  }

  const handleSave = async () => {
    // Validation
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Please add at least one ingredient.')
      return
    }

    // Validate all ingredients have valid data
    for (const ing of ingredients) {
      if (!ing.name.trim()) {
        Alert.alert('Invalid Ingredient', 'All ingredients must have a name.')
        return
      }
      if (ing.quantity <= 0) {
        Alert.alert('Invalid Quantity', `${ing.name}: Quantity must be greater than 0.`)
        return
      }
    }

    setSaving(true)
    try {
      // If editing specific dish, merge with other dishes' ingredients
      let updatedIngredients = ingredients
      if (typeof dishIndex === 'number' && entry.photos?.[dishIndex]) {
        const photoId = entry.photos[dishIndex].id
        // Keep ingredients from other dishes
        const otherDishIngredients = entry.ingredients?.filter(
          (ing) => ing.foodPhotoId !== photoId
        ) || []
        updatedIngredients = [...otherDishIngredients, ...ingredients]
      }

      await updateFoodEntry(entry.id, {
        ingredients: updatedIngredients,
      })

      Alert.alert('Success', 'Ingredients updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('Save Failed', error.message || 'Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const renderNutritionSummary = () => (
    <View style={styles.nutritionSummary}>
      <Text style={styles.summaryTitle}>Total Nutrition</Text>
      <View style={styles.nutritionGrid}>
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionValue}>{Math.round(totals.calories)}</Text>
          <Text style={styles.nutritionLabel}>Calories</Text>
        </View>
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionValue}>{Math.round(totals.carbsG)}g</Text>
          <Text style={styles.nutritionLabel}>Carbs</Text>
        </View>
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionValue}>{Math.round(totals.proteinG)}g</Text>
          <Text style={styles.nutritionLabel}>Protein</Text>
        </View>
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionValue}>{Math.round(totals.fatG)}g</Text>
          <Text style={styles.nutritionLabel}>Fat</Text>
        </View>
        {totals.fiberG > 0 && (
          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionValue}>{Math.round(totals.fiberG)}g</Text>
            <Text style={styles.nutritionLabel}>Fiber</Text>
          </View>
        )}
      </View>
    </View>
  )

  const renderIngredient = ({ item, index }: { item: Ingredient; index: number }) => (
    <View style={styles.ingredientCard}>
      <View style={styles.ingredientHeader}>
        <TouchableOpacity
          style={styles.ingredientNameButton}
          onPress={() => handleEditIngredient(index)}
        >
          <Text style={styles.ingredientName}>{item.name}</Text>
          <MaterialIcons name="edit" size={16} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveIngredient(index)}
        >
          <MaterialIcons name="close" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <View style={styles.ingredientRow}>
        <Text style={styles.ingredientLabel}>Quantity</Text>
        <TextInput
          style={styles.quantityInput}
          value={item.quantity.toString()}
          onChangeText={(value) => {
            const num = parseFloat(value) || 0
            if (num > 0) handleUpdateQuantity(index, num)
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <View style={styles.unitPickerContainer}>
          <Picker
            selectedValue={item.unit}
            onValueChange={(value) => handleUpdateUnit(index, value)}
            style={styles.unitPicker}
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
      </View>

      <View style={styles.ingredientNutrition}>
        <Text style={styles.ingredientNutritionText}>
          {Math.round(item.calories)} cal
        </Text>
        <Text style={styles.ingredientNutritionDot}>•</Text>
        <Text style={styles.ingredientNutritionText}>
          {Math.round(item.carbsG)}g carbs
        </Text>
        <Text style={styles.ingredientNutritionDot}>•</Text>
        <Text style={styles.ingredientNutritionText}>
          {Math.round(item.proteinG)}g protein
        </Text>
      </View>
    </View>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="restaurant" size={64} color="#d1d5db" />
      <Text style={styles.emptyStateTitle}>No Ingredients Yet</Text>
      <Text style={styles.emptyStateText}>
        Tap "Add Ingredient" below to search and add foods
      </Text>
    </View>
  )

  const renderSearchModal = () => (
    <Modal
      visible={showSearch}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSearch(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {editingIndex !== null ? 'Replace Ingredient' : 'Add Ingredient'}
          </Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => {
              setShowSearch(false)
              setSearchQuery('')
              setSearchResults([])
              setEditingIndex(null)
            }}
          >
            <MaterialIcons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search foods (e.g., apple, chicken breast)"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color="#2563eb" />}
        </View>

        {!searchQuery.trim() && (
          <View style={styles.searchHint}>
            <MaterialIcons name="info-outline" size={20} color="#6b7280" />
            <Text style={styles.searchHintText}>
              Type to search over 800,000 foods from the Nutritionix database
            </Text>
          </View>
        )}

        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.searchResultItem}
              onPress={() => {
                if (editingIndex !== null) {
                  // Replace existing ingredient
                  const updated = [...ingredients]
                  updated[editingIndex] = {
                    ...updated[editingIndex],
                    name: item.name,
                    quantity: item.servingQty,
                    unit: item.servingUnit,
                    calories: Math.round(item.calories),
                    carbsG: Math.round(item.totalCarbs * 10) / 10,
                    proteinG: Math.round(item.protein * 10) / 10,
                    fatG: Math.round(item.totalFat * 10) / 10,
                    fiberG: Math.round(item.dietaryFiber * 10) / 10,
                  }
                  setIngredients(updated)
                  setShowSearch(false)
                  setSearchQuery('')
                  setSearchResults([])
                  setEditingIndex(null)
                } else {
                  handleSelectFood(item)
                }
              }}
            >
              <View style={styles.searchResultContent}>
                <View style={styles.searchResultLeft}>
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  {item.brandName && (
                    <Text style={styles.searchResultBrand}>{item.brandName}</Text>
                  )}
                  <Text style={styles.searchResultServing}>
                    {item.servingQty} {item.servingUnit}
                  </Text>
                </View>
                <View style={styles.searchResultRight}>
                  <Text style={styles.searchResultCalories}>{Math.round(item.calories)} cal</Text>
                  <Text style={styles.searchResultMacros}>
                    {Math.round(item.totalCarbs)}c • {Math.round(item.protein)}p • {Math.round(item.totalFat)}f
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searchQuery.trim() && !searching ? (
              <View style={styles.noResults}>
                <MaterialIcons name="search-off" size={48} color="#d1d5db" />
                <Text style={styles.noResultsText}>No foods found</Text>
                <Text style={styles.noResultsHint}>Try different keywords</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.searchResults}
        />
      </SafeAreaView>
    </Modal>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {typeof dishIndex === 'number' ? `Edit Dish ${dishIndex + 1}` : 'Edit Ingredients'}
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={ingredients}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderIngredient}
          ListHeaderComponent={ingredients.length > 0 ? renderNutritionSummary : null}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
        />

        {/* Add Ingredient Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddIngredient}
          disabled={saving}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Ingredient</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Search Modal */}
      {renderSearchModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  nutritionSummary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    minWidth: 80,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  ingredientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientNameButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ingredientLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    width: 70,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
  },
  unitPickerContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitPicker: {
    height: 40,
  },
  ingredientNutrition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientNutritionText: {
    fontSize: 13,
    color: '#6b7280',
  },
  ingredientNutritionDot: {
    fontSize: 13,
    color: '#d1d5db',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 280,
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Search Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 16,
    gap: 8,
  },
  searchIcon: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  searchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchHintText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  searchResults: {
    padding: 16,
  },
  searchResultItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchResultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  searchResultLeft: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  searchResultBrand: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  searchResultServing: {
    fontSize: 13,
    color: '#9ca3af',
  },
  searchResultRight: {
    alignItems: 'flex-end',
  },
  searchResultCalories: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  searchResultMacros: {
    fontSize: 12,
    color: '#6b7280',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  noResultsHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
})
