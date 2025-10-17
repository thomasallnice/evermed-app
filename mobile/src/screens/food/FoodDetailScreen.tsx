// Food Detail Screen
// Shows detailed view of a single meal

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
} from 'react-native'
import { getFoodEntry, deleteFoodEntry, FoodEntry } from '../../api/food'

export function FoodDetailScreen({ route, navigation }: any) {
  const { id } = route.params
  const [entry, setEntry] = useState<FoodEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadEntry()
  }, [id])

  const loadEntry = async () => {
    try {
      const data = await getFoodEntry(id)
      setEntry(data)
    } catch (error) {
      Alert.alert('Error', 'Failed to load meal details')
      navigation.goBack()
    } finally {
      setIsLoading(false)
    }
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

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.mealEmoji}>{getMealTypeEmoji(entry.mealType)}</Text>
          <View>
            <Text style={styles.mealType}>
              {entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)}
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
      </View>

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

          {/* Ingredients */}
          {entry.ingredients && entry.ingredients.length > 0 && (
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
})
