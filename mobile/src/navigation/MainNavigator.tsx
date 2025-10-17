// Main Navigator
// Bottom tab navigator for authenticated users

import React from 'react'
import { Text } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { DashboardScreen } from '../screens/dashboard/DashboardScreen'
import { FoodListScreen } from '../screens/food/FoodListScreen'
import { FoodDetailScreen } from '../screens/food/FoodDetailScreen'
import { CameraScreen } from '../screens/food/CameraScreen'
import { GlucoseScreen } from '../screens/glucose/GlucoseScreen'
import { ProfileScreen } from '../screens/profile/ProfileScreen'

const Tab = createBottomTabNavigator()
const FoodStack = createNativeStackNavigator()

// Food Stack Navigator (includes camera, list, detail)
function FoodStackNavigator() {
  return (
    <FoodStack.Navigator>
      <FoodStack.Screen
        name="FoodList"
        component={FoodListScreen}
        options={{ title: 'Food Tracking' }}
      />
      <FoodStack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ headerShown: false }}
      />
      <FoodStack.Screen
        name="FoodDetail"
        component={FoodDetailScreen}
        options={{ title: 'Meal Details' }}
      />
    </FoodStack.Navigator>
  )
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tab.Screen
        name="Food"
        component={FoodStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="food" color={color} />,
        }}
      />
      <Tab.Screen
        name="Glucose"
        component={GlucoseScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="glucose" color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}

// Simple tab icon component (will be replaced with proper icons later)
function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    home: '🏠',
    food: '🍽️',
    glucose: '📊',
    profile: '👤',
  }

  return (
    <Text style={{ fontSize: 24, color }}>{icons[name] || '•'}</Text>
  )
}
