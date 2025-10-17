// Food List Screen
// Shows list of logged meals

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { getFoodEntries, FoodEntry } from '../../api/food'

export function FoodListScreen({ navigation }: any) {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadEntries = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const result = await getFoodEntries({
        startDate: today.toISOString(),
        limit: 20,
      })
      setEntries(result.entries)
    } catch (error) {
      console.error('Failed to load food entries:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const onRefresh = useCallback(() => {
    setIsRefreshing(true)
    loadEntries()
  }, [])

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

  const getAnalysisStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Analyzing...'
      case 'completed':
        return 'Complete'
      case 'failed':
        return 'Failed'
      default:
        return status
    }
  }

  const renderMealCard = ({ item }: { item: FoodEntry }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('FoodDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.mealEmoji}>{getMealTypeEmoji(item.mealType)}</Text>
          <View>
            <Text style={styles.mealType}>
              {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
            </Text>
            <Text style={styles.mealTime}>
              {new Date(item.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.analysisStatus === 'pending' && styles.statusPending,
            item.analysisStatus === 'completed' && styles.statusCompleted,
            item.analysisStatus === 'failed' && styles.statusFailed,
          ]}
        >
          <Text style={styles.statusText}>
            {getAnalysisStatusText(item.analysisStatus)}
          </Text>
        </View>
      </View>

      {item.photoUrls && item.photoUrls.length > 0 && (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: item.photoUrls[0] }}
            style={styles.photo}
            resizeMode="cover"
          />
          {item.photoUrls.length > 1 && (
            <View style={styles.photoCount}>
              <Text style={styles.photoCountText}>
                +{item.photoUrls.length - 1} more
              </Text>
            </View>
          )}
        </View>
      )}

      {item.analysisStatus === 'completed' && (
        <View style={styles.nutritionSummary}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(item.totalCalories)}</Text>
            <Text style={styles.nutritionLabel}>kcal</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(item.totalCarbsG)}g</Text>
            <Text style={styles.nutritionLabel}>carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(item.totalProteinG)}g</Text>
            <Text style={styles.nutritionLabel}>protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(item.totalFatG)}g</Text>
            <Text style={styles.nutritionLabel}>fat</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  )

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your meals...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        renderItem={renderMealCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Camera')}
      >
        <Text style={styles.fabText}>📸</Text>
      </TouchableOpacity>
    </View>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealEmoji: {
    fontSize: 32,
  },
  mealType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  mealTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusFailed: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 200,
  },
  photoCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  nutritionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
  },
})
