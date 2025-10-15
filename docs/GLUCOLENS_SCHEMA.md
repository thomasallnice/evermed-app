# **GlucoLens - New Simplified Schema**

This document describes the new database schema after the pivot from EverMed to GlucoLens.

## **Core Philosophy**
- **Simplicity**: Only tables that directly support glucose/food tracking
- **Performance**: Optimized indexes for common queries
- **Privacy**: RLS policies on all user data
- **Scalability**: Designed for millions of daily entries

## **Tables Overview**

### 1. **User** (from Supabase Auth)
```sql
auth.users
├── id (UUID, PK)
├── email
├── created_at
└── metadata (JSONB)
```

### 2. **Person** (User Profile)
```sql
Person
├── id (UUID, PK)
├── ownerId (UUID, FK → auth.users)
├── givenName
├── familyName
├── birthYear
├── diabetesType (type1|type2|prediabetes|gestational|none)
├── diagnosisDate
├── targetGlucoseLow (default: 70)
├── targetGlucoseHigh (default: 140)
├── glucoseUnits (mg/dL|mmol/L)
├── insulinType
├── cgmType (dexcom|libre|medtronic)
├── timezone
└── createdAt/updatedAt
```

### 3. **food_entries** (Meal Tracking)
```sql
food_entries
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── person_id (UUID, FK → Person)
├── timestamp
├── meal_type (breakfast|lunch|dinner|snack)
├── name
├── calories
├── carbs_g ⭐ (most important)
├── protein_g
├── fat_g
├── fiber_g
├── sugar_g
├── user_notes
├── is_verified
├── predicted_glucose_peak
├── predicted_peak_time
├── actual_glucose_peak
├── actual_peak_time
└── created_at/updated_at

Indexes:
- (user_id, timestamp DESC)
- (person_id, timestamp DESC)
- (meal_type)
```

### 4. **glucose_readings** (Blood Sugar Data)
```sql
glucose_readings
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── person_id (UUID, FK → Person)
├── timestamp ⭐
├── value ⭐ (20-600 mg/dL)
├── source (manual|cgm_dexcom|cgm_libre|fingerstick|lab)
├── device_id
├── food_entry_id (FK → food_entries, nullable)
├── meal_impact (calculated rise from baseline)
├── baseline_value
└── created_at

Indexes:
- (person_id, timestamp DESC)
- (food_entry_id) WHERE NOT NULL
- (source)
- (value) WHERE > 180 OR < 70
```

### 5. **predictions** (ML Predictions)
```sql
predictions
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── person_id (UUID, FK → Person)
├── food_entry_id (UUID, FK → food_entries)
├── predicted_peak ⭐
├── predicted_time_to_peak ⭐
├── confidence (0.0-1.0)
├── model_version
├── actual_peak (updated later)
├── actual_time_to_peak
├── error_magnitude
└── created_at/updated_at

Indexes:
- (person_id, created_at DESC)
- (food_entry_id)
- (error_magnitude) WHERE NOT NULL
```

### 6. **insights** (Generated Insights)
```sql
insights
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── person_id (UUID, FK → Person)
├── type (pattern|warning|achievement|recommendation|correlation)
├── title
├── message
├── data (JSONB - charts, details)
├── is_read
├── priority (0-10)
└── created_at

Indexes:
- (person_id, created_at DESC) WHERE is_read = false
- (type, priority DESC)
```

## **Views for Analytics**

### **daily_glucose_summary**
Aggregates glucose data by day:
- Average, min, max glucose
- Time in range (70-140)
- Count of lows (<70) and highs (>180)

### **meal_glucose_impact**
Correlates meals with glucose response:
- Glucose before meal
- Peak glucose after meal
- Total rise
- Time to peak

## **Deleted Tables (from EverMed)**
❌ Document
❌ DocChunk
❌ DocumentShare
❌ SharePack
❌ SharePackDocument
❌ SharePackAccess
❌ Observation
❌ Medication
❌ Allergy
❌ Encounter
❌ Immunization
❌ Procedure
❌ Condition

## **Storage Buckets**
✅ **food-photos** (PUBLIC - required for AI analysis)
❌ ~~documents~~ (DELETED)
❌ ~~medical-records~~ (DELETED)
❌ ~~share-packs~~ (DELETED)

## **Row Level Security**
All tables have RLS enabled:
```sql
-- Users can only see/edit their own data
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

## **Common Queries**

### Get today's glucose and meals
```sql
SELECT 
  'glucose' as type,
  timestamp,
  value as data
FROM glucose_readings
WHERE person_id = $1 
  AND DATE(timestamp) = CURRENT_DATE

UNION ALL

SELECT 
  'meal' as type,
  timestamp,
  carbs_g as data
FROM food_entries
WHERE person_id = $1
  AND DATE(timestamp) = CURRENT_DATE

ORDER BY timestamp DESC;
```

### Calculate time in range
```sql
SELECT 
  COUNT(*) FILTER (WHERE value BETWEEN 70 AND 140) * 100.0 / COUNT(*) as percent_in_range
FROM glucose_readings
WHERE person_id = $1
  AND timestamp >= NOW() - INTERVAL '24 hours';
```

### Find meal patterns
```sql
SELECT 
  name as meal,
  AVG(actual_glucose_peak - baseline_value) as avg_spike,
  COUNT(*) as times_eaten
FROM food_entries f
JOIN glucose_readings g ON g.food_entry_id = f.id
WHERE f.person_id = $1
GROUP BY name
HAVING COUNT(*) >= 3
ORDER BY avg_spike DESC;
```

## **Migration Safety**
The migration script (`20251015_glucolens_pivot.sql`):
1. Uses transactions (BEGIN/COMMIT)
2. Preserves existing food/glucose data
3. Uses IF EXISTS/IF NOT EXISTS
4. Is idempotent (can run multiple times safely)
5. Includes verification queries

## **Next Steps for Claude Code**
1. Run the migration: `psql $DATABASE_URL < migrations/20251015_glucolens_pivot.sql`
2. Update Prisma schema to match
3. Regenerate Prisma client
4. Remove old API routes
5. Build new simplified UI
