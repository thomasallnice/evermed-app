# Meal Templates - Visual Component Guide

## MealTemplateSelector Component

### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│  Quick Templates                      3 saved       │
├─────────────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│ │ Template │  │ Template │  │ Template │  →       │
│ │   Card   │  │   Card   │  │   Card   │  scroll  │
│ └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

### Template Card (200px wide)
```
┌────────────────────────────────────┐
│ My Morning Breakfast          [5]  │  ← name + usage count
│                                    │
│  450    35g    20g    15g         │  ← nutrition row
│  kcal  carbs protein  fat          │
│                                    │
│         2d ago                     │  ← last used
└────────────────────────────────────┘
```

### States

**Loading State:**
```
┌─────────────────────────────────┐
│  ⚪ Loading templates...        │
└─────────────────────────────────┘
```

**Empty State:**
```
┌─────────────────────────────────┐
│           📋                    │
│    No templates yet             │
│  Log meals to create templates! │
└─────────────────────────────────┘
```

**Error State:**
```
┌─────────────────────────────────┐
│           ⚠️                    │
│    Failed to load templates     │
│      [Try Again Button]         │
└─────────────────────────────────┘
```

---

## SaveTemplateModal Component

### Modal Layout (Bottom Sheet)
```
┌───────────────────────────────────────┐
│               🌅                      │  ← meal type emoji
│       Save as Template                │
│  Create a quick template for this meal│
├───────────────────────────────────────┤
│                                       │
│  ┌─────────────────────────────────┐ │
│  │  450   35g   20g   15g         │ │  ← nutrition preview
│  │  kcal  carbs protein  fat       │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Template Name *                      │
│  ┌─────────────────────────────────┐ │
│  │ My Morning Breakfast           │ │  ← name input
│  └─────────────────────────────────┘ │
│  15/100                               │
│                                       │
│  Description (optional)               │
│  ┌─────────────────────────────────┐ │
│  │ 2 eggs, toast, coffee          │ │  ← description input
│  │                                 │ │
│  └─────────────────────────────────┘ │
│  23/500                               │
│                                       │
│  ┌──────────┐  ┌──────────────────┐ │
│  │   Skip   │  │  Save Template   │ │  ← action buttons
│  └──────────┘  └──────────────────┘ │
└───────────────────────────────────────┘
```

### Success State
```
┌───────────────────────────────────────┐
│               ✨                      │
│                                       │
│        Template saved!                │
│  You can now use it for quick logging │
│                                       │
│      (auto-closes in 1.5s)           │
└───────────────────────────────────────┘
```

### Error State (inline)
```
┌───────────────────────────────────────┐
│  ... form fields ...                  │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │ ⚠️ Template name is required   │ │  ← error banner
│  └─────────────────────────────────┘ │
│                                       │
│  ┌──────────┐  ┌──────────────────┐ │
│  │   Skip   │  │  Save Template   │ │
│  └──────────┘  └──────────────────┘ │
└───────────────────────────────────────┘
```

---

## Color Scheme

### MealTemplateSelector
- **Card background**: White (#fff)
- **Text**: Dark gray (#111827)
- **Secondary text**: Medium gray (#6b7280)
- **Usage badge**: Light blue bg (#eff6ff), blue text (#2563eb)
- **Shadow**: Subtle elevation (0, 2, 0.1, 4)

### SaveTemplateModal
- **Background**: White (#fff)
- **Primary button**: Blue (#2563eb)
- **Secondary button**: Light gray (#f3f4f6)
- **Input border**: Gray (#d1d5db)
- **Error border**: Red (#ef4444)
- **Success**: Green tones
- **Backdrop**: Semi-transparent black (rgba(0,0,0,0.5))

---

## Typography

### MealTemplateSelector
- **Header title**: 18px, weight 600
- **Card name**: 16px, weight 600
- **Nutrition value**: 14px, weight 600
- **Nutrition label**: 10px, regular
- **Last used**: 12px, regular

### SaveTemplateModal
- **Modal title**: 24px, weight 600
- **Subtitle**: 14px, regular
- **Input label**: 14px, weight 600
- **Input text**: 16px, regular
- **Button text**: 16px, weight 600

---

## Spacing

### MealTemplateSelector
- **Horizontal padding**: 16px
- **Card gap**: 12px
- **Card padding**: 16px
- **Card margin bottom**: 16px

### SaveTemplateModal
- **Modal padding**: 24px
- **Input margin bottom**: 20px
- **Button gap**: 12px
- **Section spacing**: 24px

---

## Interactions

### MealTemplateSelector
1. **Tap card** → Navigate to food entry with pre-filled data
2. **Pull down** → Refresh templates list
3. **Horizontal scroll** → View more templates

### SaveTemplateModal
1. **Tap backdrop** → Close modal
2. **Type in inputs** → Clear error state
3. **Tap Skip** → Close without saving
4. **Tap Save Template** → Validate and save
5. **On success** → Show success state, auto-close after 1.5s
6. **On error** → Show error banner, allow retry

---

## Accessibility

Both components include:
- ✅ `accessibilityLabel` on all interactive elements
- ✅ `accessibilityHint` for complex interactions
- ✅ Minimum 44x44pt touch targets
- ✅ High contrast text (WCAG AA compliant)
- ✅ Screen reader compatible
- ✅ Semantic grouping of related elements

---

## Integration Points

### FoodListScreen
```typescript
// Add at top of meal list
<FlatList
  ListHeaderComponent={
    <MealTemplateSelector onSelectTemplate={handleSelectTemplate} />
  }
  // ... rest of props
/>
```

### After Food Analysis
```typescript
// Show modal after successful analysis
<SaveTemplateModal
  visible={showSaveTemplate}
  onClose={() => setShowSaveTemplate(false)}
  ingredients={analysisResult.ingredients}
  nutritionTotals={analysisResult.nutritionTotals}
  mealType="breakfast"
/>
```

---

## Performance Considerations

### MealTemplateSelector
- Uses `FlatList` for efficient horizontal scrolling
- Limits to 20 templates by default (configurable)
- Lazy loads template data
- Implements pull-to-refresh

### SaveTemplateModal
- Debounces input changes to reduce re-renders
- Uses `KeyboardAvoidingView` for iOS keyboard handling
- `ScrollView` with `keyboardShouldPersistTaps` for better UX
- Auto-closes success state to prevent modal buildup

---

## Testing Checklist

### MealTemplateSelector
- [ ] Empty state shows when no templates exist
- [ ] Loading state shows during fetch
- [ ] Error state shows on network failure
- [ ] Templates display with correct nutrition data
- [ ] Usage count badge shows correct number
- [ ] Last used date formats correctly ("2d ago", "Yesterday", etc.)
- [ ] Horizontal scroll works smoothly
- [ ] Pull to refresh reloads data
- [ ] Tap on card triggers `onSelectTemplate` callback
- [ ] Accessibility labels read correctly with screen reader

### SaveTemplateModal
- [ ] Modal slides up from bottom
- [ ] Backdrop tap closes modal
- [ ] Name input is required (shows error if empty)
- [ ] Name limited to 100 characters
- [ ] Description limited to 500 characters
- [ ] Character counters update correctly
- [ ] Nutrition preview shows correct values
- [ ] Skip button closes modal without saving
- [ ] Save button validates before submitting
- [ ] Loading state prevents double-submit
- [ ] Success state shows and auto-closes
- [ ] Error state shows with retry capability
- [ ] Keyboard shows/hides properly on iOS/Android
- [ ] Accessibility labels read correctly with screen reader
