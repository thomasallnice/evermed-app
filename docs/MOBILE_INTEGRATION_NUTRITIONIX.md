# Mobile Integration: Nutritionix Food Search

**For:** Mobile App Team (iOS/Android with React Native/Expo)
**API Endpoint:** `POST /api/metabolic/nutritionix/search`
**Status:** ✅ Ready for Integration
**Date:** 2025-10-30

## Overview

The backend now provides a secure proxy API for searching foods in the Nutritionix database (800,000+ foods). This endpoint handles API credentials securely on the backend, so the mobile app only needs to send the search query.

## Quick Start

### TypeScript Interface

```typescript
interface NutritionixSearchResult {
  name: string;
  brandName: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  totalCarbs: number;
  protein: number;
  totalFat: number;
  dietaryFiber: number;
  isCommon: boolean;
  photoUrl?: string;
}

interface SearchResponse {
  results: NutritionixSearchResult[];
}
```

### API Client Implementation

```typescript
import { supabase } from './supabase';

/**
 * Search for foods in Nutritionix database
 *
 * @param query - Search query (1-100 characters)
 * @returns Array of food search results
 * @throws Error if request fails
 */
export async function searchFoods(
  query: string
): Promise<NutritionixSearchResult[]> {
  // Validate query length
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  if (query.length > 100) {
    throw new Error('Query must be less than 100 characters');
  }

  // Get Supabase session token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Not authenticated');
  }

  // Make API request
  const response = await fetch(
    `${process.env.API_BASE_URL}/api/metabolic/nutritionix/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ query: query.trim() }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    throw new Error(error.error || 'Failed to search foods');
  }

  const data: SearchResponse = await response.json();
  return data.results;
}
```

### Environment Variables

```bash
# .env or app.config.js
API_BASE_URL=https://your-domain.vercel.app
```

## UI Integration Examples

### 1. Basic Search Input with Debounce

```typescript
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, ActivityIndicator } from 'react-native';
import { searchFoods } from './api/nutritionix';
import { useDebounce } from './hooks/useDebounce';

export function FoodSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NutritionixSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input (300ms delay)
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const searchResults = await searchFoods(debouncedQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  return (
    <View>
      <TextInput
        placeholder="Search foods (e.g., apple, chicken breast)"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {loading && <ActivityIndicator />}

      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => (
          <FoodSearchResultItem food={item} onSelect={() => handleSelect(item)} />
        )}
      />
    </View>
  );
}
```

### 2. Search Result Item Component

```typescript
import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

interface Props {
  food: NutritionixSearchResult;
  onSelect: () => void;
}

export function FoodSearchResultItem({ food, onSelect }: Props) {
  return (
    <TouchableOpacity onPress={onSelect}>
      <View style={{ flexDirection: 'row', padding: 12, borderBottomWidth: 1 }}>
        {food.photoUrl && (
          <Image
            source={{ uri: food.photoUrl }}
            style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
          />
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>
            {food.name}
          </Text>

          {food.brandName && (
            <Text style={{ fontSize: 14, color: '#666' }}>
              {food.brandName}
            </Text>
          )}

          <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            {food.servingQty} {food.servingUnit} • {food.calories} cal
          </Text>

          {food.isCommon ? (
            <Text style={{ fontSize: 10, color: '#4CAF50', marginTop: 2 }}>
              COMMON FOOD
            </Text>
          ) : (
            <Text style={{ fontSize: 10, color: '#2196F3', marginTop: 2 }}>
              BRANDED
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 14, fontWeight: '600' }}>
            {food.calories} cal
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            {food.totalCarbs}g carbs
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            {food.protein}g protein
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

### 3. Grouped Results (Common vs Branded)

```typescript
import React from 'react';
import { SectionList, Text, View } from 'react-native';

interface Props {
  results: NutritionixSearchResult[];
  onSelect: (food: NutritionixSearchResult) => void;
}

export function GroupedFoodSearchResults({ results, onSelect }: Props) {
  // Group results by type
  const sections = [
    {
      title: 'Common Foods',
      data: results.filter(f => f.isCommon),
    },
    {
      title: 'Branded Foods',
      data: results.filter(f => !f.isCommon),
    },
  ].filter(section => section.data.length > 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.name}-${index}`}
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor: '#f5f5f5', padding: 8 }}>
          <Text style={{ fontWeight: '600', fontSize: 14, color: '#666' }}>
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <FoodSearchResultItem food={item} onSelect={() => onSelect(item)} />
      )}
    />
  );
}
```

### 4. Debounce Hook

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

## Error Handling

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Display results |
| 400 | Invalid query | Show validation error |
| 401 | Unauthorized | Redirect to login |
| 429 | Rate limit exceeded | Show "Try again later" message |
| 500 | Server error | Show "Something went wrong" message |
| 503 | Service unavailable | Show "Service temporarily unavailable" |

### Error Handling Example

```typescript
try {
  const results = await searchFoods(query);
  setResults(results);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Rate limit')) {
      Alert.alert(
        'Rate Limit Exceeded',
        'Too many searches. Please try again in a few minutes.',
        [{ text: 'OK' }]
      );
    } else if (error.message.includes('Not authenticated')) {
      // Redirect to login
      navigation.navigate('Login');
    } else {
      Alert.alert(
        'Search Failed',
        'Unable to search foods. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }
}
```

## Performance Optimization

### 1. Debounce User Input

**Why:** Avoid excessive API calls while user is typing

**Implementation:** Use 300-500ms debounce delay

```typescript
const debouncedQuery = useDebounce(query, 300);
```

### 2. Minimum Query Length

**Why:** Prevent searches for very short queries

**Implementation:** Only search when query >= 2 characters

```typescript
if (query.length < 2) {
  setResults([]);
  return;
}
```

### 3. Cancel Previous Requests

**Why:** Avoid race conditions when user types quickly

**Implementation:** Use AbortController

```typescript
useEffect(() => {
  const controller = new AbortController();

  const performSearch = async () => {
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        // ...
      });
      // ...
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      // Handle other errors
    }
  };

  performSearch();

  return () => {
    controller.abort();
  };
}, [debouncedQuery]);
```

### 4. Cache Recent Searches (Optional)

**Why:** Avoid redundant API calls for repeated searches

**Implementation:** Use AsyncStorage or in-memory cache

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'nutritionix_search_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedResults(query: string) {
  const cached = await AsyncStorage.getItem(`${CACHE_KEY}:${query.toLowerCase()}`);
  if (!cached) return null;

  const { results, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_TTL) {
    return null; // Cache expired
  }

  return results;
}

async function setCachedResults(query: string, results: NutritionixSearchResult[]) {
  await AsyncStorage.setItem(
    `${CACHE_KEY}:${query.toLowerCase()}`,
    JSON.stringify({ results, timestamp: Date.now() })
  );
}
```

## Testing

### Manual Testing

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Test with curl:**
   ```bash
   curl -X POST http://localhost:3000/api/metabolic/nutritionix/search \
     -H "Content-Type: application/json" \
     -H "x-user-id: test-user-123" \
     -d '{"query": "apple"}'
   ```

3. **Expected response:**
   ```json
   {
     "results": [
       {
         "name": "Apple",
         "brandName": null,
         "servingQty": 1,
         "servingUnit": "medium apple",
         "calories": 95,
         "totalCarbs": 25,
         "protein": 0.5,
         "totalFat": 0.3,
         "dietaryFiber": 4.4,
         "isCommon": true,
         "photoUrl": "https://..."
       }
     ]
   }
   ```

### Test Script

```bash
./scripts/test-nutritionix-search.sh "apple" "http://localhost:3000"
```

## Common Issues

### 1. "Not authenticated" error

**Cause:** Missing or invalid Supabase session

**Fix:**
```typescript
// Check if user is authenticated
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  navigation.navigate('Login');
  return;
}
```

### 2. Empty results for valid foods

**Cause:** Query doesn't match Nutritionix database

**Fix:**
- Try different query variations (e.g., "chicken" vs "chicken breast")
- Use more generic terms
- Show "No results found" message with suggestion to try different keywords

### 3. Slow search results (>1s)

**Cause:** Network latency or API processing time

**Fix:**
- Show loading indicator immediately
- Implement request timeout (10s)
- Cache results locally
- Consider debouncing input (300-500ms)

### 4. Rate limit errors (429)

**Cause:** Exceeded 500 requests/day on free tier

**Fix:**
- Implement client-side caching
- Increase debounce delay
- Backend will upgrade to paid plan if needed

## API Limits

### Free Tier (Current)

- **500 requests/day**
- **Mitigation:** 24-hour backend caching (>80% cache hit rate expected)

### Mobile App Best Practices

1. **Debounce input** (300-500ms) to reduce requests
2. **Cache results** locally (AsyncStorage)
3. **Minimum query length** (>= 2 characters)
4. **Cancel previous requests** when user types

## Support

### Documentation

- **Full API Spec:** `/docs/api/NUTRITIONIX_SEARCH.md`
- **Implementation Details:** `/docs/NUTRITIONIX_SEARCH_IMPLEMENTATION.md`

### Questions?

Contact backend team or check:
- Backend API logs (Vercel logs)
- Integration tests: `/tests/integration/nutritionix-search.spec.ts`

---

**Mobile Integration Status:** ✅ Ready
**Backend Status:** ✅ Deployed to Staging
**Last Updated:** 2025-10-30
