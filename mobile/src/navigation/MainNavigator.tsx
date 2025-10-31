// Main Navigator
// Bottom tab navigator for authenticated users

import React from 'react'
import { View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DashboardScreen } from '../screens/dashboard/DashboardScreen'
import { FoodListScreen } from '../screens/food/FoodListScreen'
import { FoodDetailScreen } from '../screens/food/FoodDetailScreen'
import { EditIngredientScreen } from '../screens/food/EditIngredientScreen'
import { CameraScreen } from '../screens/food/CameraScreen'
import GlucoseListScreen from '../screens/glucose/GlucoseListScreen'
import ManualEntryScreen from '../screens/glucose/ManualEntryScreen'
import { ProfileScreen } from '../screens/profile/ProfileScreen'
import { OnboardingScreen } from '../screens/auth/OnboardingScreen'
import { FloatingActionButton } from '../components/FloatingActionButton'

const Tab = createBottomTabNavigator()
const FoodStack = createNativeStackNavigator()
const GlucoseStack = createNativeStackNavigator()
const RootStack = createNativeStackNavigator()

// Food Stack Navigator (includes camera, list, detail, edit)
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
      <FoodStack.Screen
        name="EditIngredient"
        component={EditIngredientScreen}
        options={{ headerShown: false }}
      />
    </FoodStack.Navigator>
  )
}

// Glucose Stack Navigator (includes list and manual entry)
function GlucoseStackNavigator() {
  return (
    <GlucoseStack.Navigator>
      <GlucoseStack.Screen
        name="GlucoseList"
        component={GlucoseListScreen}
        options={{ headerShown: false }}
      />
      <GlucoseStack.Screen
        name="ManualEntry"
        component={ManualEntryScreen}
        options={{ headerShown: false }}
      />
    </GlucoseStack.Navigator>
  )
}

// Tab Navigator (main app tabs)
function TabNavigator() {
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          },
          headerTintColor: '#111827',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingBottom: insets.bottom, // Respect iOS safe area
            paddingTop: 8,
            height: 60 + insets.bottom, // Add safe area height
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 4,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Timeline',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="timeline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Food"
          component={FoodStackNavigator}
          options={{
            headerShown: false,
            title: 'Food',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="restaurant" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Glucose"
          component={GlucoseStackNavigator}
          options={{
            headerShown: false,
            title: 'Glucose',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="show-chart" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      {/* Global Floating Action Button */}
      <FloatingActionButton />
    </View>
  )
}

// Main Navigator with modal screens
export function MainNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={TabNavigator} />
      <RootStack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Complete Setup',
        }}
      />
    </RootStack.Navigator>
  )
}

