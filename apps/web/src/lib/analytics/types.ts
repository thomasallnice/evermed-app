// Analytics types for Metabolic Insights
// Non-PHI compliant - no patient identifiers or raw medical values exposed

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface GlucoseResponse {
  baseline: number; // mg/dL, average before meal
  peak: number; // mg/dL, highest within 2h after
  peakTime: string; // ISO timestamp when peak occurred
  change: number; // peak - baseline
  spiked: boolean; // >180 or >50 increase
}

export interface GlucoseMealCorrelation {
  mealId: string;
  mealName: string;
  mealType: MealType;
  eatenAt: string; // ISO timestamp
  glucoseResponse: GlucoseResponse;
  confidence: ConfidenceLevel;
}

export interface HourlyTimelineData {
  hour: number; // 0-23
  avgGlucose: number;
  minGlucose: number;
  maxGlucose: number;
  mealCount: number;
  meals: Array<{
    name: string;
    mealType: MealType;
    calories: number;
  }>;
}

export interface DailyTimeline {
  date: string; // YYYY-MM-DD
  hourlyData: HourlyTimelineData[];
}

export interface DailyAverageData {
  date: string; // YYYY-MM-DD
  avgGlucose: number;
  minGlucose: number;
  maxGlucose: number;
  mealCount: number;
  spikeCount: number;
}

export interface WeeklyTimeline {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dailyData: DailyAverageData[];
}

export interface MealSummary {
  name: string;
  glucoseChange: number; // average change in mg/dL
  mealType: MealType;
}

export interface DailyInsightsData {
  avgGlucose: number;
  timeInRange: number; // percentage 70-180 mg/dL
  spikeCount: number;
  mealCount: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
  bestMeal: MealSummary | null;
  worstMeal: MealSummary | null;
}
