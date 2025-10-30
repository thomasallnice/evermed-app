// Meal Template Selector
// Horizontal scrolling list of saved meal templates for quick logging

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { getMealTemplates, MealTemplate } from '../api/templates'

export interface MealTemplateSelectorProps {
  onSelectTemplate: (template: MealTemplate) => void
  style?: any
}

export function MealTemplateSelector({ onSelectTemplate, style }: MealTemplateSelectorProps) {
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTemplates = async () => {
    try {
      setError(null)
      const result = await getMealTemplates({
        sortBy: 'usage',
        limit: 20,
      })
      setTemplates(result.templates)
    } catch (err: any) {
      console.error('Failed to load templates:', err)
      setError(err.message || 'Failed to load templates')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const onRefresh = useCallback(() => {
    setIsRefreshing(true)
    loadTemplates()
  }, [])

  const handleTemplatePress = (template: MealTemplate) => {
    onSelectTemplate(template)
  }

  const formatLastUsed = (lastUsedAt: string | null): string => {
    if (!lastUsedAt) return 'Never used'

    const now = new Date()
    const lastUsed = new Date(lastUsedAt)
    const diffMs = now.getTime() - lastUsed.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return `${Math.floor(diffDays / 30)}mo ago`
  }

  const renderTemplateCard = ({ item }: { item: MealTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleTemplatePress(item)}
      accessibilityLabel={`Use template ${item.name}`}
      accessibilityHint="Tap to log this meal quickly"
    >
      <View style={styles.cardHeader}>
        <Text style={styles.templateName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.usageBadge}>
          <Text style={styles.usageCount}>{item.usageCount}</Text>
        </View>
      </View>

      <View style={styles.nutritionRow}>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{Math.round(item.nutritionTotals.calories)}</Text>
          <Text style={styles.nutritionLabel}>kcal</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{Math.round(item.nutritionTotals.carbs)}g</Text>
          <Text style={styles.nutritionLabel}>carbs</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{Math.round(item.nutritionTotals.protein)}g</Text>
          <Text style={styles.nutritionLabel}>protein</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{Math.round(item.nutritionTotals.fat)}g</Text>
          <Text style={styles.nutritionLabel}>fat</Text>
        </View>
      </View>

      <Text style={styles.lastUsed}>{formatLastUsed(item.lastUsedAt)}</Text>
    </TouchableOpacity>
  )

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTemplates}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (templates.length === 0) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyText}>No templates yet</Text>
        <Text style={styles.emptySubtext}>Log meals to create templates!</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quick Templates</Text>
        <Text style={styles.headerSubtitle}>{templates.length} saved</Text>
      </View>

      <FlatList
        horizontal
        data={templates}
        renderItem={renderTemplateCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  usageBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  usageCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  nutritionLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  lastUsed: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
})
