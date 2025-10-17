# Carbly App Icons & Favicons

**Created:** October 17, 2025
**Build Version:** 1.0.11+

## Design Concept

The Carbly icon features:
- **Stylized "C" letterform** representing the brand name
- **Glucose curve overlay** with data points showing metabolic tracking
- **Primary blue gradient** (#2563eb to #1d4ed8) from the design system
- **Professional, medical-appropriate** aesthetic - trustworthy but approachable
- **iOS-style rounded corners** (226px radius for 1024px icon)

## Asset Locations

### Web App (`/apps/web/public/`)
- `icon-master.svg` - Master SVG source (1024x1024)
- `icon-1024.png` - Full resolution (1024x1024)
- `icon-512.png` - Large icon (512x512)
- `icon-192.png` - Medium icon (192x192)
- `icon.png` - Default icon (512x512)
- `favicon.ico` - Browser favicon (32x32)
- `favicon-32.png` - Favicon source (32x32)
- `favicon-16.png` - Smallest favicon (16x16)

### Mobile App (`/carbly-mobile-standalone/assets/`)
- `icon.png` - iOS/Android app icon (1024x1024)
- `adaptive-icon.png` - Android adaptive icon (1024x1024)
- `splash-icon.png` - Splash screen icon (1024x1024)
- `favicon.png` - Web favicon for Expo (48x48)

## Configuration Files Updated

### Web App
- `/apps/web/src/app/layout.tsx`
  - Updated metadata title: "Carbly - Glucose & Carb Tracking"
  - Updated applicationName: "Carbly"
  - Added proper icon references (favicon.ico, icon.png, icon-512.png, icon-192.png)
  - Updated Apple Web App title

- `/apps/web/public/manifest.json`
  - Added icon entries for 192x192 and 512x512
  - Icons configured with "any maskable" purpose for PWA

### Mobile App
- `/carbly-mobile-standalone/app.config.js`
  - Already configured correctly:
  - icon: './assets/icon.png' (1024x1024)
  - adaptiveIcon.foregroundImage: './assets/adaptive-icon.png' (1024x1024)
  - splash.image: './assets/splash-icon.png' (1024x1024)
  - web.favicon: './assets/favicon.png' (48x48)

## Design Specifications

### Colors
- **Background Gradient:**
  - Start: #2563eb (blue-600)
  - End: #1d4ed8 (blue-700)
- **"C" Letterform:** White (#ffffff) at 95% opacity
- **Glucose Curve:** Light blue gradient (#60a5fa to #93c5fd) at 80-90% opacity
- **Data Points:** #93c5fd (blue-300) at 90% opacity

### Sizing Requirements Met
- ✅ iOS App Icon: 1024x1024px
- ✅ Android Adaptive Icon: 1024x1024px
- ✅ PWA Large Icon: 512x512px
- ✅ PWA Medium Icon: 192x192px
- ✅ Browser Favicon: 32x32px (ICO format)
- ✅ Small Favicon: 16x16px

## Next Steps

1. **For next build (1.0.12+):**
   - Icons are ready for EAS build
   - No additional configuration needed
   - Build will automatically include new icons

2. **Testing:**
   - Test PWA install on iOS Safari (check home screen icon)
   - Test PWA install on Android Chrome (check adaptive icon)
   - Verify favicon appears in browser tabs
   - Test App Store listing (once submitted)

3. **Future Enhancements:**
   - Consider seasonal/holiday variants
   - A/B test icon designs for app store optimization
   - Create animated splash screen version
   - Design Apple Watch complication icons (if Watch app is built)

## Regenerating Icons

If you need to regenerate the icons:

1. Edit the master SVG:
   ```bash
   # Edit /apps/web/public/icon-master.svg
   ```

2. Convert SVG to 1024px PNG:
   ```bash
   cd /Users/Tom/Arbeiten/Arbeiten/2025_Carbly/apps/web/public
   qlmanage -t -s 1024 -o . icon-master.svg
   mv icon-master.svg.png icon-1024.png
   ```

3. Generate all sizes:
   ```bash
   sips -z 512 512 icon-1024.png --out icon-512.png
   sips -z 192 192 icon-1024.png --out icon-192.png
   sips -z 512 512 icon-1024.png --out icon.png
   sips -z 32 32 icon-1024.png --out favicon-32.png
   sips -z 16 16 icon-1024.png --out favicon-16.png
   cp favicon-32.png favicon.ico
   ```

4. Copy to mobile:
   ```bash
   cp icon-1024.png /Users/Tom/Arbeiten/Arbeiten/carbly-mobile-standalone/assets/icon.png
   cp icon-1024.png /Users/Tom/Arbeiten/Arbeiten/carbly-mobile-standalone/assets/adaptive-icon.png
   cp icon-1024.png /Users/Tom/Arbeiten/Arbeiten/carbly-mobile-standalone/assets/splash-icon.png
   sips -z 48 48 icon-1024.png --out /Users/Tom/Arbeiten/Arbeiten/carbly-mobile-standalone/assets/favicon.png
   ```

## Design Rationale

**Why "C" with glucose curve?**
- Instantly recognizable brand mark
- Communicates both "Carbly" (name) and "glucose tracking" (purpose)
- Works at all sizes (60px to 1024px)
- Differentiates from generic health/food apps

**Why blue gradient?**
- Matches design system primary color (#2563eb)
- Blue conveys trust, reliability, medical professionalism
- Gradient adds depth and modern feel
- Avoids healthcare clichés (red crosses, hearts)

**Why rounded corners?**
- iOS standard (matches native apps)
- Softer, more approachable than sharp corners
- Professional but not clinical

**Why data points on curve?**
- Reinforces "data-driven insights" positioning
- Adds visual interest without clutter
- Readable even at small sizes
