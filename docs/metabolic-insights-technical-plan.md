# **Metabolic Insights — Technical Implementation Plan (Continued)**

## **9. Monitoring & Analytics (Continued)**

### 9.1 Key Metrics to Track (Continued)

```sql
-- Engagement Metrics
SELECT 
  user_id,
  COUNT(*) as meals_logged,
  COUNT(DISTINCT DATE(timestamp)) as days_active,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_time_to_complete_entry
FROM food_entries
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id;

-- Feature Adoption
SELECT 
  COUNT(DISTINCT user_id) FILTER (WHERE source = 'cgm') as cgm_users,
  COUNT(DISTINCT user_id) FILTER (WHERE source = 'manual') as manual_users,
  COUNT(DISTINCT user_id) as total_users,
  COUNT(*) FILTER (WHERE confidence_score > 0.8) as high_confidence_foods,
  COUNT(*) as total_foods_identified
FROM glucose_readings gr
JOIN food_ingredients fi ON true
WHERE gr.created_at >= CURRENT_DATE - INTERVAL '7 days';
```

### 9.2 Real-time Monitoring Dashboard

```typescript
// lib/monitoring/metabolic-metrics.ts
import { createMetricsClient } from '@/lib/monitoring/metrics';

export class MetabolicMetrics {
  private metrics = createMetricsClient('metabolic');

  // Track food recognition performance
  async trackFoodRecognition(result: FoodAnalysis) {
    await this.metrics.record({
      metric: 'food_recognition',
      dimensions: {
        confidence_bucket: this.getConfidenceBucket(result.confidence),
        item_count: result.items.length,
        has_nutrition: result.totals.calories > 0
      },
      value: 1,
      unit: 'Count'
    });

    // Track processing time
    await this.metrics.record({
      metric: 'food_recognition_latency',
      value: result.metadata.processingTime,
      unit: 'Milliseconds'
    });
  }

  // Track prediction accuracy
  async trackPredictionAccuracy(
    predicted: number, 
    actual: number, 
    personId: string
  ) {
    const error = Math.abs(predicted - actual);
    const percentError = (error / actual) * 100;

    await this.metrics.record({
      metric: 'glucose_prediction_error',
      dimensions: {
        error_range: this.getErrorRange(error),
        user_segment: await this.getUserSegment(personId)
      },
      value: error,
      unit: 'mg/dL'
    });

    // Alert if error is too high
    if (error > 50) {
      await this.metrics.alert({
        severity: 'warning',
        message: `High prediction error: ${error} mg/dL`,
        context: { personId, predicted, actual }
      });
    }
  }

  // Track user engagement
  async trackEngagement(userId: string, action: string) {
    await this.metrics.record({
      metric: 'user_engagement',
      dimensions: {
        action,
        hour_of_day: new Date().getHours(),
        day_of_week: new Date().getDay()
      },
      value: 1,
      unit: 'Count'
    });
  }

  private getConfidenceBucket(confidence: number): string {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.7) return 'medium';
    if (confidence >= 0.5) return 'low';
    return 'very_low';
  }

  private getErrorRange(error: number): string {
    if (error <= 15) return 'excellent';
    if (error <= 30) return 'good';
    if (error <= 50) return 'acceptable';
    return 'poor';
  }
}
```

---

## **10. Security & Privacy Implementation**

### 10.1 Data Encryption

```typescript
// lib/security/metabolic-encryption.ts
import crypto from 'crypto';

export class MetabolicDataEncryption {
  private algorithm = 'aes-256-gcm';
  
  // Encrypt sensitive health data before storage
  async encryptHealthData(data: any, userId: string): Promise<EncryptedData> {
    const key = await this.getUserKey(userId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Decrypt health data for display
  async decryptHealthData(
    encrypted: EncryptedData, 
    userId: string
  ): Promise<any> {
    const key = await this.getUserKey(userId);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(encrypted.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  // Generate user-specific encryption key
  private async getUserKey(userId: string): Promise<Buffer> {
    // Derive key from user ID and master key
    const masterKey = process.env.MASTER_ENCRYPTION_KEY!;
    return crypto.pbkdf2Sync(userId, masterKey, 100000, 32, 'sha256');
  }

  // Anonymize data for analytics
  async anonymizeForAnalytics(data: any): Promise<any> {
    return {
      ...data,
      userId: crypto.createHash('sha256').update(data.userId).digest('hex'),
      personId: crypto.createHash('sha256').update(data.personId).digest('hex'),
      // Remove or hash any identifiable information
      notes: undefined,
      photos: undefined
    };
  }
}
```

### 10.2 HIPAA Compliance Checklist

```typescript
// lib/compliance/hipaa-metabolic.ts
export const metabolicHIPAARequirements = {
  encryption: {
    atRest: true,
    inTransit: true,
    algorithm: 'AES-256-GCM'
  },
  
  accessControl: {
    authentication: 'Multi-factor required for metabolic data',
    authorization: 'Role-based access control',
    auditLogging: 'All access logged with timestamp and user'
  },
  
  dataRetention: {
    activeData: '7 years',
    deletedData: '30 days soft delete, then permanent',
    auditLogs: '7 years minimum'
  },
  
  patientRights: {
    access: 'Export all data in machine-readable format',
    correction: 'Allow editing with audit trail',
    deletion: 'Right to be forgotten implementation'
  },
  
  breachProtocol: {
    detection: 'Real-time anomaly detection',
    notification: 'Within 60 days to affected users',
    documentation: 'Detailed breach assessment required'
  }
};

// Audit logging for all metabolic data access
export async function logMetabolicDataAccess(
  userId: string,
  action: string,
  resourceId: string,
  metadata?: any
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource_type: 'metabolic_data',
    resource_id: resourceId,
    metadata,
    ip_address: getClientIP(),
    user_agent: getUserAgent(),
    timestamp: new Date().toISOString()
  });
}
```

---

## **11. Performance Optimization**

### 11.1 Caching Strategy

```typescript
// lib/cache/metabolic-cache.ts
import { Redis } from '@upstash/redis';

export class MetabolicCache {
  private redis: Redis;
  private ttls = {
    prediction: 300,        // 5 minutes
    foodAnalysis: 86400,    // 24 hours
    personalModel: 3600,    // 1 hour
    glucoseData: 60         // 1 minute
  };

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });
  }

  // Cache food analysis results
  async cacheFoodAnalysis(
    imageHash: string, 
    analysis: FoodAnalysis
  ): Promise<void> {
    const key = `food:${imageHash}`;
    await this.redis.setex(
      key, 
      this.ttls.foodAnalysis, 
      JSON.stringify(analysis)
    );
  }

  async getCachedFoodAnalysis(imageHash: string): Promise<FoodAnalysis | null> {
    const key = `food:${imageHash}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached as string) : null;
  }

  // Cache glucose predictions
  async cachePrediction(
    mealFingerprint: string,
    personId: string,
    prediction: PredictionOutput
  ): Promise<void> {
    const key = `prediction:${personId}:${mealFingerprint}`;
    await this.redis.setex(
      key,
      this.ttls.prediction,
      JSON.stringify(prediction)
    );
  }

  // Cache personal models
  async cachePersonalModel(
    personId: string,
    model: PersonalModel
  ): Promise<void> {
    const key = `model:${personId}`;
    await this.redis.setex(
      key,
      this.ttls.personalModel,
      JSON.stringify(model)
    );
  }

  // Batch fetch for timeline
  async batchFetchGlucoseReadings(
    personId: string,
    timestamps: string[]
  ): Promise<GlucoseReading[]> {
    const pipeline = this.redis.pipeline();
    
    timestamps.forEach(ts => {
      pipeline.get(`glucose:${personId}:${ts}`);
    });
    
    const results = await pipeline.exec();
    return results
      .filter(r => r !== null)
      .map(r => JSON.parse(r as string));
  }

  // Invalidate caches when data changes
  async invalidatePersonCache(personId: string): Promise<void> {
    const pattern = `*:${personId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### 11.2 Database Query Optimization

```sql
-- Optimized query for daily timeline
CREATE OR REPLACE FUNCTION get_daily_timeline(
  p_person_id UUID,
  p_date DATE
) RETURNS TABLE (
  entry_id UUID,
  entry_type TEXT,
  timestamp TIMESTAMPTZ,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH meals AS (
    SELECT 
      fe.id,
      'meal'::TEXT as type,
      fe.timestamp,
      jsonb_build_object(
        'meal_type', fe.meal_type,
        'predicted_peak', fe.predicted_glucose_peak,
        'actual_peak', fe.actual_glucose_peak,
        'photos', array_agg(
          DISTINCT jsonb_build_object(
            'thumbnail', fp.thumbnail_path,
            'status', fp.analysis_status
          )
        ) FILTER (WHERE fp.id IS NOT NULL),
        'ingredients', array_agg(
          DISTINCT jsonb_build_object(
            'name', fi.name,
            'carbs', fi.carbs_g,
            'confidence', fi.confidence_score
          )
        ) FILTER (WHERE fi.id IS NOT NULL)
      ) as data
    FROM food_entries fe
    LEFT JOIN food_photos fp ON fp.food_entry_id = fe.id
    LEFT JOIN food_ingredients fi ON fi.food_entry_id = fe.id
    WHERE fe.person_id = p_person_id
      AND DATE(fe.timestamp) = p_date
    GROUP BY fe.id
  ),
  glucose AS (
    SELECT 
      gr.id,
      'glucose'::TEXT as type,
      gr.timestamp,
      jsonb_build_object(
        'value', gr.value,
        'source', gr.source,
        'correlated_meal', gr.food_entry_id
      ) as data
    FROM glucose_readings gr
    WHERE gr.person_id = p_person_id
      AND DATE(gr.timestamp) = p_date
  )
  SELECT * FROM meals
  UNION ALL
  SELECT * FROM glucose
  ORDER BY timestamp;
END;
$$ LANGUAGE plpgsql;

-- Index for efficient pattern detection
CREATE INDEX idx_glucose_patterns 
ON glucose_readings (person_id, timestamp)
INCLUDE (value, food_entry_id)
WHERE value IS NOT NULL;
```

### 11.3 Image Optimization

```typescript
// lib/images/food-image-processor.ts
import sharp from 'sharp';

export class FoodImageProcessor {
  // Optimize images before storage and analysis
  async processForStorage(imageBuffer: Buffer): Promise<ProcessedImages> {
    const [thumbnail, analysisImage, storageImage] = await Promise.all([
      // Thumbnail for UI display
      sharp(imageBuffer)
        .resize(150, 150, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer(),
      
      // Optimized for ML analysis
      sharp(imageBuffer)
        .resize(640, 640, { fit: 'inside' })
        .normalize() // Improve contrast for recognition
        .jpeg({ quality: 95 })
        .toBuffer(),
      
      // Storage version
      sharp(imageBuffer)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer()
    ]);

    return {
      thumbnail,
      analysisImage,
      storageImage,
      metadata: await sharp(imageBuffer).metadata()
    };
  }

  // Generate image hash for deduplication
  async generateImageHash(buffer: Buffer): Promise<string> {
    const { data } = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Simple perceptual hash
    const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
    const hash = data.map(val => val > avg ? '1' : '0').join('');
    
    return parseInt(hash, 2).toString(16);
  }
}
```

---

## **12. Mobile App Considerations**

### 12.1 React Native Components

```typescript
// components/metabolic/native/CameraCapture.tsx
import React, { useRef, useState } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet,
  Platform 
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export function NativeFoodCamera({ 
  onCapture 
}: { 
  onCapture: (imageUri: string) => void 
}) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false
      });
      
      // Optimize image before upload
      const optimized = await optimizeImage(photo.uri);
      onCapture(optimized);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.cancelled) {
      onCapture(result.uri);
    }
  };

  const optimizeImage = async (uri: string): Promise<string> => {
    // Resize and compress for faster upload
    const info = await FileSystem.getInfoAsync(uri);
    
    if (info.size > 1000000) { // If > 1MB
      // Use image manipulation to resize
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return resized.uri;
    }
    
    return uri;
  };

  if (hasPermission === null) {
    return <View />;
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <TouchableOpacity onPress={pickImage} style={styles.button}>
          <Text>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={type} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
            <Text style={styles.text}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    padding: 3,
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#000',
  },
  galleryButton: {
    position: 'absolute',
    right: 30,
    bottom: 45,
  },
  text: {
    fontSize: 18,
    color: 'white',
  },
});
```

### 12.2 Offline Support

```typescript
// lib/offline/metabolic-sync.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export class MetabolicOfflineSync {
  private queue: OfflineEntry[] = [];
  private syncing = false;

  async init() {
    // Load pending entries from storage
    const stored = await AsyncStorage.getItem('metabolic_queue');
    if (stored) {
      this.queue = JSON.parse(stored);
    }

    // Listen for connectivity changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.syncing) {
        this.syncQueue();
      }
    });
  }

  async addFoodEntry(entry: FoodEntryOffline) {
    // Store locally first
    const offlineId = `offline_${Date.now()}_${Math.random()}`;
    
    const offlineEntry = {
      id: offlineId,
      type: 'food_entry',
      data: entry,
      timestamp: new Date().toISOString(),
      syncStatus: 'pending'
    };

    this.queue.push(offlineEntry);
    await this.persistQueue();

    // Store image locally
    if (entry.imageUri) {
      await AsyncStorage.setItem(
        `image_${offlineId}`,
        entry.imageUri
      );
    }

    // Try to sync immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.syncQueue();
    }

    return offlineId;
  }

  private async syncQueue() {
    if (this.syncing || this.queue.length === 0) return;
    
    this.syncing = true;

    try {
      for (const entry of this.queue) {
        if (entry.syncStatus === 'pending') {
          await this.syncEntry(entry);
        }
      }

      // Clean up synced entries
      this.queue = this.queue.filter(e => e.syncStatus === 'pending');
      await this.persistQueue();
    } finally {
      this.syncing = false;
    }
  }

  private async syncEntry(entry: OfflineEntry) {
    try {
      switch (entry.type) {
        case 'food_entry':
          await this.syncFoodEntry(entry);
          break;
        case 'glucose_reading':
          await this.syncGlucoseReading(entry);
          break;
      }
      
      entry.syncStatus = 'completed';
    } catch (error) {
      entry.syncStatus = 'failed';
      entry.error = error.message;
      
      // Retry logic
      entry.retryCount = (entry.retryCount || 0) + 1;
      if (entry.retryCount > 3) {
        entry.syncStatus = 'abandoned';
      }
    }
  }

  private async syncFoodEntry(entry: OfflineEntry) {
    const data = entry.data as FoodEntryOffline;
    
    // Get stored image
    const imageUri = await AsyncStorage.getItem(`image_${entry.id}`);
    
    if (imageUri) {
      // Upload image first
      const formData = new FormData();
      formData.append('photo', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'food.jpg'
      } as any);
      formData.append('personId', data.personId);
      formData.append('mealType', data.mealType);
      formData.append('timestamp', data.timestamp);
      
      const response = await fetch(`${API_URL}/api/metabolic/food`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to sync food entry');
      
      // Clean up local image
      await AsyncStorage.removeItem(`image_${entry.id}`);
    }
  }

  private async persistQueue() {
    await AsyncStorage.setItem(
      'metabolic_queue',
      JSON.stringify(this.queue)
    );
  }
}
```

---

## **13. Error Handling & Edge Cases**

### 13.1 Comprehensive Error Handling

```typescript
// lib/errors/metabolic-errors.ts
export class MetabolicError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MetabolicError';
  }
}

export const MetabolicErrorCodes = {
  FOOD_RECOGNITION_FAILED: 'MET001',
  GLUCOSE_PREDICTION_FAILED: 'MET002',
  CGM_SYNC_FAILED: 'MET003',
  INVALID_GLUCOSE_VALUE: 'MET004',
  MODEL_TRAINING_FAILED: 'MET005',
  INSUFFICIENT_DATA: 'MET006',
  RATE_LIMIT_EXCEEDED: 'MET007'
} as const;

// Error handler middleware
export async function handleMetabolicError(
  error: unknown,
  context: {
    userId?: string;
    action: string;
    metadata?: any;
  }
): Promise<Response> {
  console.error('Metabolic error:', error, context);

  // Log to monitoring
  await logError(error, context);

  if (error instanceof MetabolicError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.statusCode }
    );
  }

  // Handle specific error types
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return Response.json(
      {
        error: 'External service unavailable',
        code: 'MET_SERVICE_DOWN',
        retry: true
      },
      { status: 503 }
    );
  }

  // Default error
  return Response.json(
    {
      error: 'An unexpected error occurred',
      code: 'MET_UNKNOWN',
      requestId: context.requestId
    },
    { status: 500 }
  );
}

// Retry logic for external services
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2
  } = options;

  let delay = initialDelay;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelay);
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### 13.2 Edge Case Handlers

```typescript
// lib/metabolic/edge-cases.ts

// Handle unusual glucose values
export function validateGlucoseReading(value: number): {
  valid: boolean;
  warning?: string;
  corrected?: number;
} {
  // Physiologically impossible values
  if (value < 20) {
    return {
      valid: false,
      warning: 'Value below 20 mg/dL is life-threatening and likely an error'
    };
  }
  
  if (value > 600) {
    return {
      valid: false,
      warning: 'Value above 600 mg/dL is extremely dangerous and likely an error'
    };
  }
  
  // Warnings for extreme but possible values
  if (value < 54) {
    return {
      valid: true,
      warning: 'Severe hypoglycemia detected. Seek immediate treatment.'
    };
  }
  
  if (value > 400) {
    return {
      valid: true,
      warning: 'Dangerously high glucose. Seek medical attention immediately.'
    };
  }
  
  // Normal range
  return { valid: true };
}

// Handle incomplete food entries
export async function handleIncompleteFoodEntry(
  entry: Partial<FoodEntry>
): Promise<FoodEntry> {
  const completed: FoodEntry = {
    ...entry,
    // Set defaults for missing fields
    timestamp: entry.timestamp || new Date(),
    meal_type: entry.meal_type || detectMealType(entry.timestamp),
    ingredients: entry.ingredients || [],
    photos: entry.photos || []
  };

  // If no photo but has text description
  if (!completed.photos.length && entry.description) {
    const estimated = await estimateFromDescription(entry.description);
    completed.ingredients = estimated.ingredients;
    completed.totalCarbs = estimated.carbs;
  }

  // If photo but analysis failed
  if (completed.photos.length && !completed.ingredients.length) {
    completed.analysisStatus = 'manual_required';
    await notifyUserForManualEntry(entry.userId, entry.id);
  }

  return completed;
}

// Handle CGM data gaps
export function interpolateGlucoseGaps(
  readings: GlucoseReading[]
): GlucoseReading[] {
  const interpolated: GlucoseReading[] = [...readings];
  
  // Sort by timestamp
  interpolated.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Find and fill gaps
  for (let i = 1; i < interpolated.length; i++) {
    const prev = interpolated[i - 1];
    const curr = interpolated[i];
    
    const timeDiff = 
      (new Date(curr.timestamp).getTime() - 
       new Date(prev.timestamp).getTime()) / 60000; // minutes
    
    // If gap > 15 minutes, interpolate
    if (timeDiff > 15) {
      const pointsToAdd = Math.floor(timeDiff / 5) - 1;
      const valueDiff = curr.value - prev.value;
      
      for (let j = 1; j <= pointsToAdd; j++) {
        const ratio = j / (pointsToAdd + 1);
        const timestamp = new Date(
          new Date(prev.timestamp).getTime() + 
          ratio * (new Date(curr.timestamp).getTime() - 
                  new Date(prev.timestamp).getTime())
        );
        
        interpolated.push({
          ...prev,
          id: `interpolated_${timestamp.getTime()}`,
          timestamp,
          value: prev.value + valueDiff * ratio,
          source: 'interpolated',
          confidence: 0.7
        });
      }
    }
  }
  
  return interpolated.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
```

---

## **14. Documentation & Training**

### 14.1 API Documentation

```yaml
# openapi.yaml for Metabolic Insights API
openapi: 3.0.0
info:
  title: EverMed Metabolic Insights API
  version: 1.0.0
  description: API for food tracking and glucose prediction

paths:
  /api/metabolic/food:
    post:
      summary: Create food entry with photo
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                photo:
                  type: string
                  format: binary
                personId:
                  type: string
                  format: uuid
                mealType:
                  type: string
                  enum: [breakfast, lunch, dinner, snack]
                timestamp:
                  type: string
                  format: date-time
      responses:
        '200':
          description: Food entry created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FoodEntry'
                
    get:
      summary: List food entries
      parameters:
        - name: personId
          in: query
          required: true
          schema:
            type: string
        - name: date
          in: query
          schema:
            type: string
            format: date
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: List of food entries
          content:
            application/json:
              schema:
                type: object
                properties:
                  entries:
                    type: array
                    items:
                      $ref: '#/components/schemas/FoodEntry'

  /api/metabolic/predict:
    post:
      summary: Predict glucose response
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                foodEntryId:
                  type: string
                ingredients:
                  type: array
                  items:
                    $ref: '#/components/schemas/Ingredient'
                personId:
                  type: string
      responses:
        '200':
          description: Glucose prediction
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GlucosePrediction'

components:
  schemas:
    FoodEntry:
      type: object
      properties:
        id:
          type: string
        timestamp:
          type: string
        mealType:
          type: string
        ingredients:
          type: array
          items:
            $ref: '#/components/schemas/Ingredient'
        predictedGlucosePeak:
          type: number
        actualGlucosePeak:
          type: number
          
    Ingredient:
      type: object
      properties:
        name:
          type: string
        quantity:
          type: number
        unit:
          type: string
        calories:
          type: number
        carbsG:
          type: number
        proteinG:
          type: number
        fatG:
          type: number
          
    GlucosePrediction:
      type: object
      properties:
        currentGlucose:
          type: number
        predictedPeak:
          type: number
        timeToHeak:
          type: integer
        confidence:
          type: number
        recommendations:
          type: array
          items:
            type: string
```

### 14.2 User Guide

```markdown
# Metabolic Insights User Guide

## Getting Started

### 1. Enable Metabolic Tracking
- Go to Settings > Features
- Toggle "Metabolic Insights" ON
- Complete the setup wizard

### 2. Connect Your CGM (Optional)
- Supported devices: Dexcom G7, FreeStyle Libre
- iOS: Enable HealthKit sharing
- Android: Connect via Google Fit

### 3. Log Your First Meal
- Tap the camera icon
- Take a photo of your meal
- Wait 10-15 seconds for analysis
- Review and confirm ingredients

## Understanding Predictions

### Glucose Curve
- **Green Zone** (70-140 mg/dL): Target range
- **Yellow Zone** (140-180 mg/dL): Elevated
- **Red Zone** (>180 mg/dL or <70 mg/dL): Action needed

### Confidence Levels
- **High (>80%)**: Based on your personal data
- **Medium (50-80%)**: Some personal data available
- **Low (<50%)**: Using population averages

## Tips for Better Predictions

1. **Log consistently** for at least 7 days
2. **Include all foods** even small snacks
3. **Note context** (exercise, stress, illness)
4. **Verify ingredients** for accuracy
5. **Track glucose** at least 4x daily

## Privacy & Security

- Photos encrypted at rest
- Option to auto-delete after processing
- No data sharing without consent
- Export your data anytime
- Delete everything with one tap
```

---

## **15. Launch Checklist**

### Pre-Launch Requirements

- [ ] **Database**
  - [ ] All tables created and indexed
  - [ ] RLS policies configured
  - [ ] Backup strategy implemented
  
- [ ] **APIs**
  - [ ] All endpoints tested
  - [ ] Rate limiting configured
  - [ ] Error handling complete
  
- [ ] **ML Models**
  - [ ] Base model trained
  - [ ] Prediction accuracy >85%
  - [ ] Personalization pipeline ready
  
- [ ] **Integrations**
  - [ ] Google Vision API connected
  - [ ] Nutritionix API configured
  - [ ] HealthKit integration tested
  
- [ ] **Security**
  - [ ] Encryption implemented
  - [ ] HIPAA compliance verified
  - [ ] Penetration testing complete
  
- [ ] **Performance**
  - [ ] <2s photo analysis time
  - [ ] <500ms prediction time
  - [ ] Offline mode functional
  
- [ ] **Documentation**
  - [ ] API docs complete
  - [ ] User guide written
  - [ ] Privacy policy updated

### Launch Day

1. **Enable feature flag** for beta users
2. **Monitor metrics** dashboard
3. **Check error rates** every hour
4. **Gather feedback** via in-app survey
5. **Daily standup** for first week

### Success Metrics (Week 1)

- [ ] 100+ beta users activated
- [ ] >80% complete Day 1 onboarding
- [ ] >70% log at least 3 meals
- [ ] <5% error rate
- [ ] >4.0 app store rating maintained

---

**END OF TECHNICAL IMPLEMENTATION PLAN**

This comprehensive plan provides everything needed for Claude Code to implement the Metabolic Insights feature. The modular architecture allows for incremental development and testing while maintaining integration with the existing EverMed platform.