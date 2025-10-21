# HealthKit Testing Guide

## Quick Start Testing Checklist

### Prerequisites
- ✅ Physical iOS device (iPhone or iPad)
- ✅ iOS 13.0 or later
- ✅ Apple Health app installed
- ✅ Test glucose readings added to Apple Health

### Step 1: Add Test Data to Apple Health

1. Open **Apple Health** app on iPhone
2. Tap **Browse** tab
3. Search for **"Blood Glucose"**
4. Tap **"Add Data"**
5. Add multiple glucose readings:
   - Example 1: 95 mg/dL, Today 8:00 AM
   - Example 2: 120 mg/dL, Today 12:00 PM
   - Example 3: 105 mg/dL, Today 4:00 PM
   - Example 4: 6.5 mmol/L (will convert to ~117 mg/dL)
6. Tap **"Add"** for each reading

### Step 2: Build and Run Carbly on Device

#### Option A: Expo Go (Quick Test)
```bash
cd /Users/Tom/Arbeiten/Arbeiten/2025_Carbly/mobile
npm start
# Scan QR code with Camera app
# Open in Expo Go
```

**⚠️ Limitation**: Expo Go may not support HealthKit. If you see "HealthKit Not Available", use Option B.

#### Option B: EAS Development Build (Recommended)
```bash
cd /Users/Tom/Arbeiten/Arbeiten/2025_Carbly/mobile
npx eas-cli build --platform ios --profile development
# Install .ipa on device via TestFlight or direct install
```

#### Option C: Xcode Build (Local)
```bash
cd /Users/Tom/Arbeiten/Arbeiten/2025_Carbly/mobile
npx expo run:ios --device
# Select your connected iPhone
```

### Step 3: Test Connection Flow

1. **Launch Carbly** on your iPhone
2. **Sign in** with your test account (thomas.gnahm@gmail.com)
3. **Navigate to Profile tab** (bottom navigation)
4. **Check for HealthKit card**:
   - ✅ Should show "Apple Health" card
   - ✅ Status: "⭕ Not Connected"
5. **Tap "Connect Apple Health"** button
6. **iOS Permission Dialog appears**:
   - Should show: "Carbly needs access to your glucose data from Apple Health..."
   - **Tap "Allow"**
7. **Wait for sync** (spinner appears)
8. **Success alert** should appear:
   - "Connected to Apple Health"
   - "Successfully synced X glucose readings"
9. **Verify connection status**:
   - ✅ Status changed to "✓ Connected"
   - ✅ Last synced: "Just now"

### Step 4: Verify Synced Data

1. **Navigate to Glucose tab** (bottom navigation)
2. **Check for green banner**:
   - ✅ "Apple Health Connected" with ✓ badge
   - ✅ "Last synced: Just now"
3. **Scroll down to Recent Readings**
4. **Verify glucose readings from Apple Health appear**:
   - ✅ Correct values (95, 120, 105 mg/dL)
   - ✅ Blue "CGM" badge (not gray "Fingerstick")
   - ✅ Correct timestamps
5. **Check medical disclaimer** at bottom:
   - ✅ Yellow card visible
   - ✅ Text: "This glucose data is for informational purposes only..."

### Step 5: Test Manual Sync

1. **Add new reading to Apple Health**:
   - Open Apple Health app
   - Add Blood Glucose: 110 mg/dL, Now
2. **Return to Carbly**
3. **Navigate to Profile tab**
4. **Tap "Sync Now"** button
5. **Wait for sync** (spinner appears on button)
6. **Success alert** should appear:
   - "Sync Complete"
   - "Synced 1 new glucose reading"
7. **Navigate to Glucose tab**
8. **Pull down to refresh**
9. **Verify new reading** (110 mg/dL) appears in list

### Step 6: Test Pull-to-Refresh

1. **Add another reading to Apple Health**:
   - 100 mg/dL, Now
2. **Navigate to Glucose tab**
3. **Pull down from top of screen** (pull-to-refresh gesture)
4. **Spinner appears**
5. **Wait for refresh to complete**
6. **Verify new reading** (100 mg/dL) appears in list

### Step 7: Test Disconnect

1. **Navigate to Profile tab**
2. **Tap "Disconnect"** button
3. **Confirmation alert** appears:
   - "Are you sure you want to disconnect from Apple Health?"
4. **Tap "Disconnect"** (red destructive button)
5. **Success alert**: "Disconnected"
6. **Verify status**:
   - ✅ Status changed to "⭕ Not Connected"
   - ✅ "Connect Apple Health" button reappears
7. **Navigate to Glucose tab**
8. **Verify**:
   - ✅ Blue prompt card appears: "Connect Apple Health"
   - ✅ Green banner is gone
   - ✅ **Existing readings remain** (not deleted)

---

## Edge Case Testing

### Test 1: Permission Denied

1. Go to iOS **Settings** > **Privacy** > **Health** > **Carbly**
2. Toggle **"Blood Glucose"** to **OFF**
3. Return to Carbly
4. Tap **"Connect Apple Health"**
5. **Expected**:
   - Error alert: "Permission Required"
   - Link to iOS Settings
   - Tap "Open Settings" → Goes to Settings app
6. Re-enable permission in Settings
7. Return to Carbly and retry

### Test 2: Duplicate Readings

1. Add reading to Apple Health: **100 mg/dL, Today 10:00 AM**
2. Sync in Carbly (should succeed)
3. Add **same reading again** in Apple Health: **100 mg/dL, Today 10:00 AM** (exact same timestamp)
4. Sync again in Carbly
5. **Expected**:
   - Success alert: "Synced 0 new glucose readings"
   - "1 readings were skipped (duplicates or invalid)"
   - No duplicate entry in Carbly

### Test 3: Invalid Data

1. Add invalid reading to Apple Health: **1000 mg/dL** (above 600 limit)
2. Sync in Carbly
3. **Expected**:
   - Reading is skipped with warning log
   - Alert: "X readings were skipped (duplicates or invalid)"
   - Invalid reading does NOT appear in Carbly

### Test 4: Unit Conversion

1. Add reading in **mmol/L**: **6.5 mmol/L** (European unit)
2. Sync in Carbly
3. **Expected**:
   - Converted to mg/dL: **~117 mg/dL** (6.5 × 18.0182)
   - Appears in Carbly with correct value

### Test 5: Network Error

1. Turn on **Airplane Mode**
2. Tap "Sync Now" in Carbly
3. **Expected**:
   - Error alert: "Failed to sync glucose data. Please try again."
   - Connection status remains "Connected"
   - Last sync timestamp unchanged
4. Turn off Airplane Mode
5. Retry sync → Should succeed

### Test 6: Large Dataset

1. Add **50+ readings** to Apple Health (various dates)
2. Disconnect from HealthKit in Carbly (if connected)
3. Reconnect and perform initial sync
4. **Expected**:
   - All readings synced (up to 1000 limit)
   - Success alert: "Successfully synced 50+ glucose readings"
   - Sync takes ~10-30 seconds (normal)

### Test 7: Background Sync

1. Connect to HealthKit and sync
2. Add new reading to Apple Health
3. **Close Carbly** (swipe up in App Switcher)
4. Wait 1 minute
5. **Reopen Carbly**
6. Navigate to Glucose tab
7. **Expected**:
   - Background sync runs automatically on app open
   - New reading appears in list (no manual sync needed)

### Test 8: Timezone Handling

1. Add reading to Apple Health: **100 mg/dL, Today 10:00 AM**
2. Sync in Carbly
3. Change iOS timezone: Settings > General > Date & Time > Set manually
4. Navigate to Glucose tab in Carbly
5. **Expected**:
   - Timestamp displayed in new timezone
   - Value unchanged (100 mg/dL)

---

## Debugging

### Check Logs

**Expo Dev Tools Console**:
```
[HEALTHKIT] Syncing glucose readings from 2025-09-21 to 2025-10-21
[HEALTHKIT] Found 5 glucose readings in HealthKit
[HEALTHKIT] Synced reading: 95 mg/dL at 2025-10-21T08:00:00.000Z
[GLUCOSE CREATE] Created reading abc123 for person xyz789: 95 mg/dL (cgm)
[HEALTHKIT] Sync complete: { synced: 5, skipped: 0, errors: [] }
```

**Look for**:
- `[HEALTHKIT]` prefix → HealthKit API calls
- `[GLUCOSE CREATE]` prefix → Backend API calls
- Error messages with detailed diagnostics

### Common Issues

**Issue**: "HealthKit Not Available"
**Fix**: Use physical iOS device, not simulator

**Issue**: No readings appear after sync
**Fix**:
- Check Apple Health app has Blood Glucose data
- Verify date range (default: last 30 days)
- Check Expo console for sync errors

**Issue**: Sync button does nothing
**Fix**:
- Check network connection
- Verify backend API is running (`https://app.getcarbly.app`)
- Check Expo console for errors

**Issue**: Readings show wrong timestamps
**Fix**:
- Check iOS device timezone settings
- Verify Apple Health readings have correct timestamps

---

## Performance Benchmarks

**Expected Sync Times**:
- 10 readings: ~2-5 seconds
- 50 readings: ~10-20 seconds
- 100 readings: ~20-40 seconds
- 500 readings: ~60-120 seconds

**Network Usage**:
- ~500 bytes per reading (JSON payload)
- 100 readings = ~50 KB network transfer

**Battery Impact**:
- Minimal (sync is on-demand, not background)
- ~1-2% battery for 100-reading sync

---

## Success Criteria

**Feature is ready for beta if**:
- ✅ Connection flow works on physical iOS device
- ✅ Permissions request shows correct message
- ✅ Sync successfully imports HealthKit readings
- ✅ Readings display in Glucose tab with correct values
- ✅ Medical disclaimers visible
- ✅ Manual sync works
- ✅ Pull-to-refresh triggers sync
- ✅ Disconnect flow works
- ✅ No crashes or unhandled errors
- ✅ Error messages are user-friendly

**Ready for App Store submission if**:
- ✅ All success criteria above met
- ✅ Tested with 100+ readings (performance acceptable)
- ✅ Edge cases handled gracefully (permission denied, network errors, duplicates)
- ✅ Privacy statement visible
- ✅ HealthKit usage descriptions approved by team

---

**Next Steps After Testing**:
1. Document any bugs found in GitHub Issues
2. Collect performance metrics (sync times for various dataset sizes)
3. User feedback: Is sync frequency acceptable? Should we add background sync?
4. Proceed with beta TestFlight distribution
5. Monitor HealthKit sync success rates in production

**Testing Completed**: ☐ (Check when all tests pass)
**Ready for Beta**: ☐ (Check when success criteria met)
**Ready for Production**: ☐ (Check when edge cases verified)
