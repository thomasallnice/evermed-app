# Meal Templates Components - Usage Guide

This document explains how to integrate the meal template components into the Carbly mobile app.

## Components

### 1. MealTemplateSelector
Horizontal scrolling list of saved templates for quick meal logging.

### 2. SaveTemplateModal
Modal dialog for saving meals as reusable templates.

## Integration Example

### Step 1: Add MealTemplateSelector to FoodListScreen

```typescript
// In /mobile/src/screens/food/FoodListScreen.tsx

import { MealTemplateSelector } from '../../components/MealTemplateSelector'
import { MealTemplate } from '../../api/templates'

export function FoodListScreen({ navigation }: any) {
  // ... existing code ...

  const handleSelectTemplate = async (template: MealTemplate) => {
    // Navigate to food upload/entry screen with pre-filled data
    navigation.navigate('FoodUpload', {
      template: {
        name: template.name,
        ingredients: template.ingredients,
        nutritionTotals: template.nutritionTotals,
      },
    })

    // Alternative: If you want to increment usage count immediately
    // import { incrementTemplateUsage } from '../../api/templates'
    // await incrementTemplateUsage(template.id)
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <FlatList
        data={entries}
        renderItem={renderMealCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <MealTemplateSelector onSelectTemplate={handleSelectTemplate} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>No meals logged today</Text>
            <Text style={styles.emptySubtext}>
              Tap the camera button below to log your first meal
            </Text>
          </View>
        }
      />
    </GestureHandlerRootView>
  )
}
```

### Step 2: Add SaveTemplateModal to Food Upload/Analysis Flow

```typescript
// In your food upload or analysis completion screen
// e.g., /mobile/src/screens/food/FoodUploadScreen.tsx or FoodAnalysisScreen.tsx

import { SaveTemplateModal } from '../../components/SaveTemplateModal'
import { Ingredient, NutritionTotals } from '../../api/templates'

export function FoodAnalysisScreen({ navigation, route }: any) {
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [nutritionTotals, setNutritionTotals] = useState<NutritionTotals>({
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
    fiber: 0,
  })

  // When analysis completes successfully
  const handleAnalysisComplete = (analysisResult: any) => {
    // Extract ingredients and nutrition from analysis result
    const extractedIngredients = analysisResult.ingredients.map((ing: any) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      calories: ing.calories,
      carbsG: ing.carbsG,
      proteinG: ing.proteinG,
      fatG: ing.fatG,
      fiberG: ing.fiberG,
    }))

    const totals = {
      calories: analysisResult.totalCalories,
      carbs: analysisResult.totalCarbsG,
      protein: analysisResult.totalProteinG,
      fat: analysisResult.totalFatG,
      fiber: analysisResult.totalFiberG,
    }

    setIngredients(extractedIngredients)
    setNutritionTotals(totals)

    // Show save template modal
    setShowSaveTemplate(true)
  }

  return (
    <View style={styles.container}>
      {/* Your existing analysis UI */}

      {/* Save Template Modal */}
      <SaveTemplateModal
        visible={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        ingredients={ingredients}
        nutritionTotals={nutritionTotals}
        mealType={route.params?.mealType} // e.g., 'breakfast', 'lunch', 'dinner', 'snack'
      />
    </View>
  )
}
```

### Step 3: Using Templates to Pre-fill Food Entry

When a user selects a template from MealTemplateSelector, you can use the template data to create a new food entry:

```typescript
// In your food entry creation logic

import { createFoodEntry } from '../../api/food'
import { incrementTemplateUsage } from '../../api/templates'

const handleUseTemplate = async (template: MealTemplate) => {
  try {
    // Create food entry from template
    const entry = await createFoodEntry({
      mealType: 'breakfast', // Or let user choose
      timestamp: new Date().toISOString(),
      ingredients: template.ingredients,
      totalCalories: template.nutritionTotals.calories,
      totalCarbsG: template.nutritionTotals.carbs,
      totalProteinG: template.nutritionTotals.protein,
      totalFatG: template.nutritionTotals.fat,
      totalFiberG: template.nutritionTotals.fiber,
      analysisStatus: 'completed',
    })

    // Increment template usage count
    await incrementTemplateUsage(template.id)

    // Show success message
    Alert.alert('Success', 'Meal logged from template!')

    // Navigate or refresh
    navigation.goBack()
  } catch (error) {
    console.error('Failed to use template:', error)
    Alert.alert('Error', 'Failed to log meal from template')
  }
}
```

## Component Props

### MealTemplateSelector Props

```typescript
interface MealTemplateSelectorProps {
  onSelectTemplate: (template: MealTemplate) => void
  style?: ViewStyle // Optional style override
}
```

### SaveTemplateModal Props

```typescript
interface SaveTemplateModalProps {
  visible: boolean
  onClose: () => void
  ingredients: Ingredient[]
  nutritionTotals: NutritionTotals
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}
```

## Features

### MealTemplateSelector Features
- ✅ Horizontal scrolling list
- ✅ Sort by usage count (most used first)
- ✅ Shows nutrition summary per template
- ✅ Shows usage count and last used date
- ✅ Pull to refresh
- ✅ Loading, error, and empty states
- ✅ Accessibility labels

### SaveTemplateModal Features
- ✅ Modal with slide-up animation
- ✅ Template name input (required, 1-100 chars)
- ✅ Description input (optional, max 500 chars)
- ✅ Nutrition preview
- ✅ Character count indicators
- ✅ Form validation
- ✅ Loading state while saving
- ✅ Success feedback with auto-close
- ✅ Error handling with retry
- ✅ Keyboard-aware layout
- ✅ Accessibility labels

## Styling

Both components follow the existing Carbly design system:
- Primary blue: `#2563eb`
- Gray background: `#f9fafb`
- White cards with shadow
- Rounded corners (16px)
- Consistent typography
- Material-style elevation

## Error Handling

Both components handle errors gracefully:
- Network failures show error UI with retry button
- Form validation errors display inline
- API errors are logged and shown to user
- Loading states prevent duplicate actions

## Accessibility

Both components include:
- Proper accessibility labels
- Accessibility hints for interactive elements
- Sufficient touch target sizes (44x44 minimum)
- High contrast text
- Screen reader support

## Testing

To test these components:

1. **MealTemplateSelector**:
   - Create some meal templates first
   - Check empty state with no templates
   - Verify horizontal scrolling works
   - Test pull to refresh
   - Verify template selection navigation

2. **SaveTemplateModal**:
   - Test with valid and invalid inputs
   - Verify character limits work
   - Test save success flow
   - Test error handling
   - Verify keyboard dismissal
   - Test skip button

## Future Enhancements

Potential improvements:
- Search/filter templates by name
- Edit/delete templates from selector
- Template categories (breakfast, lunch, etc.)
- Template sharing between users
- Template photos
- Favorite templates
