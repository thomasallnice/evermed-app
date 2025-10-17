# EverMed Mobile App Setup

## Issue: App Stuck on Splash Screen

If the app is stuck on the splash screen, it's likely because the Supabase credentials are not configured.

## Setup Steps

### 1. Configure Supabase Credentials

Edit `apps/mobile/.env` and replace the placeholder values with your actual Supabase credentials:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_API_URL=https://getclarimed.com
```

**Where to find these values:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your EverMed project
3. Go to Settings → API
4. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 2. Restart Metro Bundler

After updating the `.env` file:

```bash
cd apps/mobile
npm start -- --clear
```

### 3. Reload the App

In the iOS Simulator:
- Press **Cmd+R** to reload
- Or shake the device (Cmd+Ctrl+Z) and tap "Reload"

### 4. Verify It's Working

You should now see:
- ✅ Login screen (not the splash screen)
- ✅ Console log: "App.tsx is running!"
- ✅ No errors in Metro bundler

## Troubleshooting

### Still seeing splash screen?

1. **Kill Metro completely:**
   ```bash
   lsof -ti:8081 | xargs kill -9
   npm start -- --clear
   ```

2. **Reset iOS Simulator:**
   - Device → Erase All Content and Settings
   - Restart Metro and app

3. **Check Metro console for errors:**
   - Look for red error messages
   - Check if "App.tsx is running!" appears

### Environment variable not loading?

Expo environment variables must start with `EXPO_PUBLIC_` to be accessible in the app.

### Supabase connection errors?

Verify your credentials are correct:
- URL should end with `.supabase.co`
- Anon key should be a long JWT string (starts with `eyJ`)

## Current Status

- ✅ Authentication system implemented (Week 3-4)
- ✅ Food tracking & camera implemented (Week 5-7)
- ✅ Multi-photo upload support (1-5 photos per meal)
- ✅ Error logging and diagnostics added
- ⚠️ Requires Supabase credentials to run

## Next Steps After Setup

Once the app loads successfully:

1. Test login/signup flow
2. Navigate to Food tab
3. Take a photo and log a meal
4. View meal list and details
5. Test glucose tracking (Week 8-10 - coming soon)
