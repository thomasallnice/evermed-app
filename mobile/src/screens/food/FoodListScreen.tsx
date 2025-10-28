// Food List Screen
// Shows list of logged meals

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler'
import { getFoodEntries, FoodEntry, deleteFoodEntry } from '../../api/food'

export function FoodListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
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

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFoodEntry(id)
              setEntries(entries.filter(e => e.id !== id))
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete meal. Please try again.')
            }
          },
        },
      ]
    )
  }

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    id: string
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    })

    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(id)}
      >
        <Animated.View
          style={[
            styles.deleteButtonContent,
            {
              transform: [{ translateX: trans }],
            },
          ]}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
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
    <Swipeable
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
      overshootRight={false}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('FoodDetail', { id: item.id })}
      >
        <View style={styles.cardContent}>
          {item.photoUrls && item.photoUrls.length > 0 ? (
            <Image
              source={{ uri: item.photoUrls[0] }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.placeholderEmoji}>{getMealTypeEmoji(item.mealType)}</Text>
            </View>
          )}

          <View style={styles.cardInfo}>
            <View style={styles.cardHeader}>
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

            {item.photoUrls && item.photoUrls.length > 1 && (
              <View style={styles.photoCountBadge}>
                <Text style={styles.photoCountBadgeText}>
                  +{item.photoUrls.length - 1} photo{item.photoUrls.length - 1 > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

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
    </Swipeable>
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
    <GestureHandlerRootView style={styles.container}>
      <FlatList
        data={entries}
        renderItem={renderMealCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
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
    </GestureHandlerRootView>
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
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  previewPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  photoCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  photoCountBadgeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
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
  deleteButton: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 100,
    height: '100%',
  },
  deleteButtonContent: {
    paddingHorizontal: 20,
    height: '100%',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
})
