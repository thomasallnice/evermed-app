// Tests for daily insights generation
// Privacy validation: Ensures no PHI exposure in stored insights
// Medical compliance: Validates disclaimers and non-diagnostic language

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  generateDailyInsights,
  getDailyInsights,
  batchGenerateDailyInsights,
  detectGlucosePatterns,
} from "../../../apps/web/src/lib/analytics/daily-insights";
import { METABOLIC_INSIGHTS_DISCLAIMER } from "../../../apps/web/src/lib/copy";

const prisma = new PrismaClient();

const testPersonId = "test-person-insights-001";

describe("Daily Insights Generation", () => {
  beforeAll(async () => {
    await prisma.person.create({
      data: {
        id: testPersonId,
        ownerId: "test-owner-insights-001",
        givenName: "Test",
        familyName: "Insights",
      },
    });
  });

  afterAll(async () => {
    // Cleanup all test data
    await prisma.metabolicInsight.deleteMany({
      where: { personId: testPersonId },
    });
    await prisma.glucoseReading.deleteMany({
      where: { personId: testPersonId },
    });
    await prisma.foodEntry.deleteMany({
      where: { personId: testPersonId },
    });
    await prisma.person.delete({ where: { id: testPersonId } });
    await prisma.$disconnect();
  });

  describe("generateDailyInsights", () => {
    it("should generate insights for a day with data", async () => {
      const testDate = new Date("2025-10-10T00:00:00Z");

      // Create glucose readings
      await prisma.glucoseReading.createMany({
        data: [
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T08:00:00Z"),
            value: 95,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T10:00:00Z"),
            value: 120,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T12:00:00Z"),
            value: 185, // Spike
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T14:00:00Z"),
            value: 150,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T18:00:00Z"),
            value: 110,
            source: "cgm",
          },
        ],
      });

      // Create meals with correlation data
      const breakfast = await prisma.foodEntry.create({
        data: {
          personId: testPersonId,
          timestamp: new Date("2025-10-10T08:00:00Z"),
          mealType: "breakfast",
          totalCalories: 400,
          totalCarbsG: 50,
          totalProteinG: 15,
          totalFatG: 10,
          totalFiberG: 5,
          ingredients: {
            create: {
              name: "Oatmeal",
              quantity: 100,
              unit: "g",
              confidenceScore: 0.95,
              calories: 400,
              carbsG: 50,
              proteinG: 15,
              fatG: 10,
              fiberG: 5,
              source: "manual_entry",
            },
          },
        },
      });

      const lunch = await prisma.foodEntry.create({
        data: {
          personId: testPersonId,
          timestamp: new Date("2025-10-10T12:00:00Z"),
          mealType: "lunch",
          totalCalories: 700,
          totalCarbsG: 90,
          totalProteinG: 25,
          totalFatG: 25,
          totalFiberG: 8,
          ingredients: {
            create: {
              name: "Pasta",
              quantity: 200,
              unit: "g",
              confidenceScore: 0.9,
              calories: 700,
              carbsG: 90,
              proteinG: 25,
              fatG: 25,
              fiberG: 8,
              source: "manual_entry",
            },
          },
        },
      });

      const result = await generateDailyInsights(testPersonId, testDate);

      // Validate insights structure
      expect(result.avgGlucose).toBeCloseTo(132, 1); // (95+120+185+150+110)/5
      expect(result.timeInRange).toBeCloseTo(80, 1); // 4/5 in range
      expect(result.spikeCount).toBe(1); // Only 185 >180
      expect(result.mealCount.breakfast).toBe(1);
      expect(result.mealCount.lunch).toBe(1);
      expect(result.mealCount.dinner).toBe(0);
      expect(result.mealCount.snack).toBe(0);

      expect(result.bestMeal).not.toBeNull();
      expect(result.worstMeal).not.toBeNull();
      expect(result.bestMeal?.name).toBe("Oatmeal");
      expect(result.worstMeal?.name).toBe("Pasta");

      // Verify stored in database
      const storedInsight = await prisma.metabolicInsight.findFirst({
        where: {
          personId: testPersonId,
          date: new Date("2025-10-10T00:00:00Z"),
          insightType: "daily_summary",
        },
      });

      expect(storedInsight).not.toBeNull();
      expect(storedInsight?.insightData).toBeTruthy();

      // Privacy validation: No PHI in stored data
      const insightData = storedInsight?.insightData as any;
      expect(insightData).not.toHaveProperty("personId");
      expect(insightData).not.toHaveProperty("ownerId");

      // Cleanup
      await prisma.metabolicInsight.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.foodEntry.deleteMany({
        where: { personId: testPersonId },
      });
    });

    it("should update existing insight if regenerated", async () => {
      const testDate = new Date("2025-10-11T00:00:00Z");

      // Create initial data and generate insights
      await prisma.glucoseReading.create({
        data: {
          personId: testPersonId,
          timestamp: new Date("2025-10-11T10:00:00Z"),
          value: 120,
          source: "cgm",
        },
      });

      const firstGeneration = await generateDailyInsights(
        testPersonId,
        testDate
      );
      expect(firstGeneration.avgGlucose).toBe(120);

      // Add more data and regenerate
      await prisma.glucoseReading.create({
        data: {
          personId: testPersonId,
          timestamp: new Date("2025-10-11T14:00:00Z"),
          value: 140,
          source: "cgm",
        },
      });

      const secondGeneration = await generateDailyInsights(
        testPersonId,
        testDate
      );
      expect(secondGeneration.avgGlucose).toBe(130); // (120 + 140) / 2

      // Verify only one record in database
      const insightCount = await prisma.metabolicInsight.count({
        where: {
          personId: testPersonId,
          date: new Date("2025-10-11T00:00:00Z"),
          insightType: "daily_summary",
        },
      });
      expect(insightCount).toBe(1);

      // Cleanup
      await prisma.metabolicInsight.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
    });
  });

  describe("getDailyInsights", () => {
    it("should retrieve stored insights with disclaimer", async () => {
      const testDate = new Date("2025-10-12T00:00:00Z");

      // Generate insights first
      await prisma.glucoseReading.create({
        data: {
          personId: testPersonId,
          timestamp: new Date("2025-10-12T10:00:00Z"),
          value: 115,
          source: "cgm",
        },
      });

      await generateDailyInsights(testPersonId, testDate);

      // Retrieve insights
      const result = await getDailyInsights(testPersonId, testDate);

      expect(result).not.toBeNull();
      expect(result?.avgGlucose).toBe(115);
      expect(result?.generatedAt).toBeInstanceOf(Date);
      expect(result?.disclaimer).toBe(METABOLIC_INSIGHTS_DISCLAIMER);

      // Privacy validation
      expect(result).not.toHaveProperty("personId");

      // Cleanup
      await prisma.metabolicInsight.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
    });

    it("should return null for non-existent insights", async () => {
      const result = await getDailyInsights(
        testPersonId,
        new Date("2025-12-25T00:00:00Z")
      );
      expect(result).toBeNull();
    });
  });

  describe("batchGenerateDailyInsights", () => {
    it("should generate insights for multiple days", async () => {
      const startDate = new Date("2025-10-13T00:00:00Z");
      const endDate = new Date("2025-10-15T00:00:00Z");

      // Create data for 3 days
      for (let i = 0; i < 3; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        await prisma.glucoseReading.create({
          data: {
            personId: testPersonId,
            timestamp: new Date(date.getTime() + 10 * 60 * 60 * 1000),
            value: 100 + i * 10,
            source: "cgm",
          },
        });
      }

      const count = await batchGenerateDailyInsights(
        testPersonId,
        startDate,
        endDate
      );

      expect(count).toBe(3);

      // Verify all insights created
      const insights = await prisma.metabolicInsight.findMany({
        where: {
          personId: testPersonId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          insightType: "daily_summary",
        },
      });

      expect(insights).toHaveLength(3);

      // Cleanup
      await prisma.metabolicInsight.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
    });
  });

  describe("detectGlucosePatterns", () => {
    it("should detect insufficient data pattern", async () => {
      const result = await detectGlucosePatterns(
        testPersonId,
        new Date("2025-10-01T00:00:00Z"),
        new Date("2025-10-05T00:00:00Z")
      );

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].type).toBe("insufficient_data");
      expect(result.patterns[0].confidence).toBe("low");
      expect(result.disclaimer).toBe(METABOLIC_INSIGHTS_DISCLAIMER);
    });

    it("should detect high glucose trend pattern", async () => {
      const startDate = new Date("2025-10-16T00:00:00Z");

      // Create 7 days of data with high glucose
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        // Create glucose readings (avg 190 mg/dL)
        await prisma.glucoseReading.createMany({
          data: [
            {
              personId: testPersonId,
              timestamp: new Date(date.getTime() + 8 * 60 * 60 * 1000),
              value: 185,
              source: "cgm",
            },
            {
              personId: testPersonId,
              timestamp: new Date(date.getTime() + 12 * 60 * 60 * 1000),
              value: 195,
              source: "cgm",
            },
          ],
        });

        // Generate daily insight
        await generateDailyInsights(testPersonId, date);
      }

      const result = await detectGlucosePatterns(
        testPersonId,
        startDate,
        new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)
      );

      expect(result.patterns.length).toBeGreaterThan(0);
      const highGlucosePattern = result.patterns.find(
        (p) => p.type === "high_glucose_trend"
      );
      expect(highGlucosePattern).toBeTruthy();
      expect(highGlucosePattern?.confidence).toBe("high");

      // Medical compliance: No diagnosis language
      expect(highGlucosePattern?.description).not.toContain("You have diabetes");
      expect(highGlucosePattern?.description).not.toContain("diagnosis");

      // Cleanup
      await prisma.metabolicInsight.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
    });

    it("should detect low time in range pattern", async () => {
      const startDate = new Date("2025-10-23T00:00:00Z");

      // Create 7 days with low time in range (mostly >180 or <70)
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        await prisma.glucoseReading.createMany({
          data: [
            {
              personId: testPersonId,
              timestamp: new Date(date.getTime() + 8 * 60 * 60 * 1000),
              value: 65, // Low
              source: "cgm",
            },
            {
              personId: testPersonId,
              timestamp: new Date(date.getTime() + 12 * 60 * 60 * 1000),
              value: 190, // High
              source: "cgm",
            },
            {
              personId: testPersonId,
              timestamp: new Date(date.getTime() + 18 * 60 * 60 * 1000),
              value: 120, // In range
              source: "cgm",
            },
          ],
        });

        await generateDailyInsights(testPersonId, date);
      }

      const result = await detectGlucosePatterns(
        testPersonId,
        startDate,
        new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)
      );

      const lowTimeInRangePattern = result.patterns.find(
        (p) => p.type === "low_time_in_range"
      );
      expect(lowTimeInRangePattern).toBeTruthy();
      expect(lowTimeInRangePattern?.confidence).toBe("high");

      // Cleanup
      await prisma.metabolicInsight.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
    });

    it("should detect improving trend pattern", async () => {
      const startDate = new Date("2025-10-30T00:00:00Z");

      // Create 6 days: first 3 days high glucose, last 3 days improved
      for (let i = 0; i < 6; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        const avgValue = i < 3 ? 180 : 150; // Improvement in last 3 days

        await prisma.glucoseReading.createMany({
          data: [
            {
              personId: testPersonId,
              timestamp: new Date(date.getTime() + 10 * 60 * 60 * 1000),
              value: avgValue,
              source: "cgm",
            },
          ],
        });

        await generateDailyInsights(testPersonId, date);
      }

      const result = await detectGlucosePatterns(
        testPersonId,
        startDate,
        new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000)
      );

      const improvingPattern = result.patterns.find(
        (p) => p.type === "improving_trend"
      );
      expect(improvingPattern).toBeTruthy();
      expect(improvingPattern?.confidence).toBe("medium");

      // Medical compliance: Positive but not diagnostic
      expect(improvingPattern?.description).toContain("progress");
      expect(improvingPattern?.description).not.toContain("cured");

      // Cleanup
      await prisma.metabolicInsight.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
    });
  });

  describe("Privacy Compliance", () => {
    it("should never expose PHI in any insights", async () => {
      const testDate = new Date("2025-11-01T00:00:00Z");

      await prisma.glucoseReading.create({
        data: {
          personId: testPersonId,
          timestamp: new Date("2025-11-01T10:00:00Z"),
          value: 125,
          source: "cgm",
        },
      });

      const insights = await generateDailyInsights(testPersonId, testDate);

      // Convert to JSON to check all nested properties
      const json = JSON.stringify(insights);

      // Should NOT contain PHI
      expect(json).not.toContain(testPersonId);
      expect(json).not.toContain("test-owner-insights-001");
      expect(json).not.toContain("Test Insights"); // User name

      // Should contain only aggregated metrics
      expect(insights).toHaveProperty("avgGlucose");
      expect(insights).toHaveProperty("timeInRange");
      expect(insights).toHaveProperty("spikeCount");

      // Cleanup
      await prisma.metabolicInsight.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
    });
  });
});
