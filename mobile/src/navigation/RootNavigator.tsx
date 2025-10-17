// Root Navigator
// Switches between auth and main navigation based on session

import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'

export function RootNavigator() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {session ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
})
