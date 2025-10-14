# HealthKit Import Guide

## Overview

EverMed supports importing blood glucose readings from Apple HealthKit exports. This allows you to bulk-import historical glucose data from your iPhone.

## How It Works

1. **Export your HealthKit data** from your iPhone
2. **Upload the export.xml file** to EverMed
3. **Blood glucose readings are automatically extracted and imported** into your dashboard

## Step-by-Step Instructions

### Step 1: Export HealthKit Data from iPhone

1. Open the **Health** app on your iPhone
2. Tap your **profile photo** in the top right corner
3. Scroll down and tap **"Export All Health Data"**
4. Tap **"Export"** to confirm
5. Wait for the export to complete (this may take several minutes for large datasets)
6. Choose **"Save to Files"** and save the `export.zip` file to iCloud Drive or your device

### Step 2: Extract the Export File

1. Open the **Files** app on your iPhone (or download the file to your computer)
2. Navigate to where you saved `export.zip`
3. Tap the file to extract it
4. Inside, you'll find a file called **`export.xml`** - this is what you need

### Step 3: Import to EverMed

1. Open **EverMed** in your browser at [https://evermed.ai](https://evermed.ai) or [https://staging.evermed.ai](https://staging.evermed.ai)
2. Navigate to **Metabolic Insights → Dashboard**
3. Click the **"Import HealthKit"** button (purple button with 📱 icon)
4. Select your `export.xml` file
5. Wait for the import to complete
6. You'll see a summary of how many glucose readings were imported

### Step 4: View Your Data

After importing, your glucose readings will appear on the:
- **Glucose Timeline** chart
- **Dashboard stats** (average glucose, time in range, spikes)
- **Daily summary** view

## What Gets Imported

- **Blood glucose readings** (HKQuantityTypeIdentifierBloodGlucose)
- **Timestamp** of each reading
- **Source** (e.g., "Dexcom", "FreeStyle Libre", "Apple Health")
- **Unit** (automatically converts mmol/L to mg/dL if needed)

## Duplicate Prevention

The import feature automatically prevents duplicate readings:
- If a reading with the **same timestamp** already exists, it will be skipped
- You can safely re-import your HealthKit data multiple times without creating duplicates

## Data Privacy

- Your HealthKit data is processed **server-side** and never leaves EverMed's secure infrastructure
- Only **blood glucose readings** are extracted from the export file
- The original XML file is **not stored** - only the extracted glucose readings are saved to your account
- All data is protected by **row-level security** - only you can access your readings

## Supported Glucose Sources

The import feature recognizes glucose readings from:
- **Dexcom CGM** (labeled as source: `cgm`)
- **FreeStyle Libre** (labeled as source: `cgm`)
- **Manual fingerstick tests** (labeled as source: `fingerstick`)
- **Lab tests** (labeled as source: `lab`)

## Limitations

- Only **blood glucose data** is imported (other health data types are ignored)
- Readings outside the valid range (**20-600 mg/dL**) are skipped
- Maximum file size: **50 MB** (typical HealthKit exports are 1-10 MB)
- Import may take **30-60 seconds** for large datasets (10,000+ readings)

## Troubleshooting

### "No blood glucose readings found in export file"

**Cause:** Your HealthKit export doesn't contain any blood glucose data.

**Solution:**
1. Check that you've logged glucose readings in the Apple Health app
2. Ensure you exported **"All Health Data"** (not just a specific category)
3. Try exporting again from the Health app

### "Invalid XML format"

**Cause:** The uploaded file is not a valid HealthKit export.

**Solution:**
1. Make sure you're uploading `export.xml` (not `export.zip`)
2. Extract the zip file first if you haven't already
3. Don't edit the XML file manually (this can corrupt it)

### "Invalid file type. Please upload a HealthKit export.xml file"

**Cause:** You uploaded a file that's not an XML file.

**Solution:**
1. Ensure you're selecting the `export.xml` file (not the zip file)
2. The file must have a `.xml` extension

### Import takes a long time

**Cause:** Large datasets with thousands of readings can take time to process.

**Solution:**
- Wait patiently - imports with 10,000+ readings can take up to 60 seconds
- Don't refresh the page or click the button again
- You'll see a success message when it's complete

## Technical Details

### HealthKit Export XML Format

HealthKit exports follow this XML structure:

```xml
<HealthData>
  <Record type="HKQuantityTypeIdentifierBloodGlucose"
          unit="mg/dL"
          value="120"
          sourceName="Dexcom"
          startDate="2025-10-13 08:30:00 +0000"
          endDate="2025-10-13 08:30:00 +0000" />
  <!-- More records... -->
</HealthData>
```

### Unit Conversion

If your HealthKit export uses **mmol/L** (common outside the US), the import automatically converts to **mg/dL**:
- **Conversion formula:** `mg/dL = mmol/L × 18.0182`
- Example: `5.5 mmol/L → 99.1 mg/dL`

### Source Detection

The import uses the `sourceName` attribute to determine the glucose source:
- Contains "dexcom", "libre", or "cgm" → labeled as `cgm`
- Contains "lab" or "laboratory" → labeled as `lab`
- Default → labeled as `fingerstick`

## Future Enhancements

We're working on:
- **Native iOS app** with real-time HealthKit sync (see [BACKLOG.md](./BACKLOG.md))
- **Automatic background sync** (no need to manually export)
- **Support for other health metrics** (exercise, sleep, nutrition)

## Need Help?

If you encounter issues not covered in this guide:
1. Check the browser console for error messages
2. Report issues on [GitHub](https://github.com/your-repo/issues)
3. Contact support at [support@evermed.ai](mailto:support@evermed.ai)

---

**Last Updated:** October 14, 2025
