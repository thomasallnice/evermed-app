// Food Screen
// Food tracking and meal logging

import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'

export function FoodScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Food Tracking</Text>
        <Text style={styles.subtitle}>Log your meals and nutrition</Text>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📸 Camera Coming Soon</Text>
        <Text style={styles.placeholderSubtext}>
          Week 5-7: Photo capture and AI analysis
        </Text>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>🍽️ Meal List Coming Soon</Text>
        <Text style={styles.placeholderSubtext}>
          Week 5-7: View today's meals
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  placeholder: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
})
