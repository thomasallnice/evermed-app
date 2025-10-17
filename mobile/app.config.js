// Dynamic Expo configuration
// Allows accessing environment variables from eas.json during build

module.exports = ({ config }) => {
  return {
    ...config,
    expo: {
      name: 'Carbly',
      slug: 'carbio',
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      newArchEnabled: false,  // DISABLED - Expo Go forces New Arch, but let's try disabling in config
      splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#2563eb',
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.carbio.mobile',
        buildNumber: '1.0.11',
        infoPlist: {
          NSCameraUsageDescription:
            'Carbly needs access to your camera to photograph your meals for food tracking',
          NSPhotoLibraryUsageDescription:
            'Carbly needs access to your photo library to select meal photos',
          NSFaceIDUsageDescription:
            'Carbly uses Face ID to securely unlock the app',
          ITSAppUsesNonExemptEncryption: false,
        },
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#2563eb',
        },
        package: 'com.carbio.mobile',
        versionCode: 1,
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        permissions: [
          'CAMERA',
          'READ_EXTERNAL_STORAGE',
          'WRITE_EXTERNAL_STORAGE',
          'USE_BIOMETRIC',
          'USE_FINGERPRINT',
        ],
      },
      web: {
        favicon: './assets/favicon.png',
      },
      extra: {
        eas: {
          projectId: 'e6780cd6-eb5a-48a6-a295-7483658c5072',
        },
        // Production configuration
        supabaseUrl: 'https://wukrnqifpgjwbqxpockm.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1a3JucWlmcGdqd2JxeHBvY2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzE0OTIsImV4cCI6MjA3MDY0NzQ5Mn0.fQvTlVO4xqcPXjKM1D-lTbmEpmeO1fv5S2rLBLoPgdI',
        apiUrl: 'https://app.getcarbly.app',
      },
    },
  }
}
