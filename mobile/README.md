# Carbly Mobile App

**Location:** `2025_Carbly/mobile`
**Platform:** iOS/Android (Expo React Native)
**Primary Focus:** Mobile-first glucose tracking ⭐

## Quick Start

This is the **primary development focus** for Carbly. The web app is secondary.

### Prerequisites

- Node.js 20.19.4 or later
- npm (with `--legacy-peer-deps` for Expo compatibility)
- EAS CLI: `npm install -g eas-cli`
- iOS: Xcode 15+ (for iOS development)
- Android: Android Studio (for Android development)

### Installation

```bash
cd /Users/Tom/Arbeiten/Arbeiten/2025_Carbly/mobile
npm install --legacy-peer-deps
```

### Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required variables:
- `EXPO_PUBLIC_SUPABASE_URL`: `https://wukrnqifpgjwbqxpockm.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `EXPO_PUBLIC_API_URL`: `https://app.getcarbly.app`

⚠️ See `ENV_BEST_PRACTICES.md` for security guidelines.

## Development

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Building for Production

This app uses **EAS Build** for cloud builds (builds in the cloud, not locally).

### iOS Build

```bash
# Production build (for App Store)
npx eas-cli build --platform ios --profile production

# Preview build (for TestFlight internal testing)
npx eas-cli build --platform ios --profile preview
```

### Submitting to TestFlight

```bash
# Submit latest build to TestFlight
npx eas-cli submit --platform ios --latest
```

## Project Structure

```
2025_Carbly/
├── docs/              # Single Source of Truth (PM, product specs)
├── mobile/            # PRIMARY: iOS/Android Expo app ⭐
│   ├── src/
│   │   ├── api/           # API client (calls backend)
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (auth, etc.)
│   │   ├── navigation/    # React Navigation setup
│   │   ├── screens/       # App screens
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── assets/            # Icons, splash screens
│   ├── app.config.js      # Expo app configuration
│   ├── eas.json          # EAS Build profiles
│   └── package.json
├── web/               # SECONDARY: Web companion (later)
└── db/                # Shared database schema (Supabase)
```

## Configuration Files

- `app.config.js`: Expo app configuration (includes API URLs)
- `eas.json`: EAS Build profiles (dev, preview, production)
- `.env`: Environment variables (local only, not committed)
- `package.json`: Dependencies and scripts

## Current Status

- **Latest Build:** 1.0.11 (✅ Submitted to TestFlight Oct 17, 2025)
- **Bundle ID:** `com.carbio.mobile`
- **App Store Connect ID:** 6754119933
- **Apple Team ID:** YY2MH7J868

## Troubleshooting

### "Module not found" errors

```bash
rm -rf node_modules
npm install --legacy-peer-deps
```

### Expo cache issues

```bash
npx expo start -c
```

### EAS Build fails

Check build logs at: https://expo.dev/accounts/thomasgnahm/projects/carbio/builds

### Dependency conflicts

Always use `--legacy-peer-deps` when installing:
```bash
npm install --legacy-peer-deps
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [React Native Documentation](https://reactnative.dev/)
- [Carbly Docs](../docs/project-description.md)

## Mobile-First Strategy

**Why mobile is primary:**
- Glucose tracking requires real-time mobile access
- Photo-first food logging (camera is mobile)
- CGM integration (Apple Health, Google Fit)
- Push notifications for glucose alerts
- On-the-go meal logging

**Web app role:**
- Admin panel for data analysis
- Desktop data export (PDF reports)
- Optional companion for viewing trends

This structure allows independent mobile development without web app dependency conflicts.
