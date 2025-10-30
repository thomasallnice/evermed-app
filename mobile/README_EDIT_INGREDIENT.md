# EditIngredientScreen Documentation

## Overview
The `EditIngredientScreen` provides an advanced ingredient editing experience with Nutritionix search integration, allowing users to easily add, remove, and modify ingredients with accurate nutrition data.

## Features

### 1. Real-Time Nutrition Calculation
- Displays total calories, carbs, protein, fat, and fiber
- Updates automatically as ingredients are added/removed/modified
- Color-coded nutrition cards matching app design system

### 2. Nutritionix Search Integration
- Search over 800,000 foods from Nutritionix database
- Debounced search (500ms delay) for optimal performance
- Shows food name, brand (if applicable), serving size, and nutrition
- One-tap to add foods with pre-filled nutrition data

### 3. Ingredient Management
- Add new ingredients via search
- Edit existing ingredients (tap name to search for replacement)
- Adjust quantities with automatic nutrition scaling
- Change units (g, ml, oz, cup, tbsp, tsp, serving, piece)
- Remove ingredients with confirmation

### 4. Multi-Dish Support
- Properly filters ingredients by dish when editing specific dish
- Preserves other dishes' ingredients when saving
- Shows which dish is being edited in header

## Navigation

### From FoodDetailScreen
```typescript
navigation.navigate('EditIngredient', {
  entry: FoodEntry,           // Complete food entry object
  dishIndex?: number          // Optional: 0-based index for multi-dish meals
})
```

### Example Usage
```typescript
// Edit all ingredients
<TouchableOpacity onPress={() => navigation.navigate('EditIngredient', { entry })}>
  <Text>Edit Ingredients</Text>
</TouchableOpacity>

// Edit specific dish (multi-dish meal)
<TouchableOpacity onPress={() => navigation.navigate('EditIngredient', { entry, dishIndex: 1 })}>
  <Text>Edit Dish 2</Text>
</TouchableOpacity>
```

## API Integration

### Nutritionix Search
The screen uses the `searchNutritionix()` function from `/mobile/src/api/nutritionix.ts`:

```typescript
const results = await searchNutritionix(query)
// Returns: NutritionixSearchResult[]
```

**Backend Endpoint:** `POST /api/metabolic/nutritionix/search`
- Requires authentication (Bearer token)
- Request body: `{ query: string }`
- Response: `{ results: NutritionixSearchResult[] }`

### Save Changes
Updates are saved via `updateFoodEntry()` from `/mobile/src/api/food.ts`:

```typescript
await updateFoodEntry(entryId, {
  ingredients: updatedIngredients
})
```

**Backend Endpoint:** `PATCH /api/metabolic/food/:id`
- Automatically recalculates nutrition totals on backend
- Merges with other dishes' ingredients for multi-dish meals

## Backend Requirements

### 1. Nutritionix Proxy Endpoint
Create `/apps/web/src/app/api/metabolic/nutritionix/search/route.ts`:

```typescript
export async function POST(request: Request) {
  const { query } = await request.json()

  // Call Nutritionix API with your credentials
  const response = await fetch('https://trackapi.nutritionix.com/v2/search/instant', {
    headers: {
      'x-app-id': process.env.NUTRITIONIX_APP_ID,
      'x-app-key': process.env.NUTRITIONIX_APP_KEY,
    },
    params: { query }
  })

  const data = await response.json()

  // Transform and return results
  return Response.json({ results: transformResults(data) })
}
```

### 2. Environment Variables
Add to `.env`:
```
NUTRITIONIX_APP_ID=your_app_id
NUTRITIONIX_APP_KEY=your_app_key
```

**Get credentials:** https://developer.nutritionix.com/signup

## User Flow

1. **Open Screen**
   - User taps "Edit with Search" on FoodDetailScreen
   - Screen loads with current ingredients

2. **View Nutrition Summary**
   - Real-time totals displayed at top
   - Updates as ingredients change

3. **Add Ingredient**
   - Tap "Add Ingredient" button
   - Search modal opens
   - Type food name (e.g., "banana")
   - Tap result to add with pre-filled nutrition

4. **Edit Ingredient**
   - Tap ingredient name to search for replacement
   - Adjust quantity (nutrition scales automatically)
   - Change unit via picker

5. **Remove Ingredient**
   - Tap red X button
   - Confirm deletion

6. **Save Changes**
   - Tap "Save" in header
   - Validation ensures at least 1 ingredient
   - Success alert → navigate back to detail screen

7. **Cancel Changes**
   - Tap "Cancel" in header
   - Confirmation alert to prevent accidental data loss

## Validation Rules

- **At least 1 ingredient required**
- **All ingredients must have:**
  - Non-empty name
  - Quantity > 0
  - Valid unit
  - Non-negative nutrition values

## Edge Cases Handled

1. **Empty search query** → Shows hint text
2. **No search results** → Shows "No foods found" message
3. **Multi-dish meals** → Filters and preserves other dishes
4. **Network errors** → Shows error alert with retry option
5. **Session expiration** → Refreshes token automatically
6. **Concurrent edits** → Last save wins (optimistic locking not implemented)

## Design System

### Colors
- Primary blue: `#2563eb` (Save button, nutrition values)
- Gray backgrounds: `#f9fafb` (cards, inputs)
- Red delete: `#dc2626` (remove buttons)
- Border gray: `#e5e7eb`

### Spacing
- Card padding: 16-20px
- Section spacing: 24px
- Grid gaps: 12px
- Button padding: 8-16px

### Typography
- Header title: 18px, bold
- Section title: 18px, bold
- Ingredient name: 16px, semibold
- Body text: 14-16px
- Small text: 12-13px

## Performance Considerations

1. **Debounced search** (500ms) prevents excessive API calls
2. **useMemo** for nutrition totals (only recalculates when ingredients change)
3. **FlatList** for ingredient rendering (handles large lists efficiently)
4. **Optimistic quantity updates** (instant feedback without API call)

## Future Enhancements

1. **Barcode scanning** for packaged foods
2. **Recent searches** caching
3. **Favorite ingredients** quick-add
4. **Voice input** for hands-free logging
5. **Custom food creation** for homemade recipes
6. **Batch ingredient import** from recipes
7. **Offline mode** with local database sync

## Testing Checklist

- [ ] Add ingredient via search
- [ ] Replace ingredient by tapping name
- [ ] Adjust quantity (verify nutrition scales)
- [ ] Change unit
- [ ] Remove ingredient
- [ ] Save with validation errors
- [ ] Save successfully
- [ ] Cancel with confirmation
- [ ] Multi-dish meal editing
- [ ] Search with no results
- [ ] Network error handling
- [ ] Session expiration handling

## Troubleshooting

### Search Returns No Results
- Check Nutritionix API credentials in `.env`
- Verify backend proxy endpoint is deployed
- Check network logs for 401/500 errors

### Nutrition Not Scaling
- Verify `handleUpdateQuantity` divides by original quantity
- Check that nutrition values are numbers, not strings

### Multi-Dish Ingredients Lost
- Ensure `foodPhotoId` is preserved when editing
- Verify other dishes' ingredients are merged before save

### Navigation Not Working
- Confirm route is added to `MainNavigator.tsx`
- Check route name matches: `'EditIngredient'`

## Related Files

- `/mobile/src/screens/food/EditIngredientScreen.tsx` - Main screen component
- `/mobile/src/api/nutritionix.ts` - Nutritionix API client
- `/mobile/src/api/food.ts` - Food entry API client
- `/mobile/src/navigation/MainNavigator.tsx` - Navigation config
- `/mobile/src/screens/food/FoodDetailScreen.tsx` - Parent screen

## Support

For issues or questions:
1. Check console logs for `[NUTRITIONIX SEARCH]` and `[FOOD UPDATE]` messages
2. Verify Nutritionix API quota (free tier: 100 requests/day)
3. Test with mock data by creating `/mobile/src/api/__mocks__/nutritionix.ts`
