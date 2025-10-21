// Floating Action Button
// Global FAB for adding food photos, visible on all screens

import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'

export function FloatingActionButton() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const handlePress = () => {
    // Navigate to Camera screen
    // @ts-ignore - navigation types
    navigation.navigate('Food', { screen: 'Camera' })
  }

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          bottom: insets.bottom + 80, // Above tab bar
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <MaterialIcons name="camera-alt" size={28} color="#fff" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999, // Highest layer
  },
})
