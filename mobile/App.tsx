// ABSOLUTE MINIMAL TEST - NO DEPENDENCIES
// Testing with just core React Native

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

console.log('=== ABSOLUTE MINIMAL APP ===')
console.log('No Sentry, No StatusBar, Just React Native core')

export default function App() {
  console.log('=== APP RENDERING ===')

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 IT WORKS!</Text>
      <Text style={styles.text}>Hello from Carbly</Text>
      <Text style={styles.text}>Minimal React Native app</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 5,
  },
  buttonContainer: {
    marginTop: 30,
    width: '80%',
  },
})
