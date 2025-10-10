// Tests for timeline visualization queries
// Privacy validation: Ensures no PHI exposure in analytics outputs
// Performance validation: Query efficiency with database-level aggregations

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  getDailyTimeline,
  getWeeklyTimeline,
  getGlucoseStats,
  getMealStats,
} from "../../../apps/web/src/lib/analytics/timeline-queries";

const prisma = new PrismaClient();

const testPersonId = "test-person-timeline-001";

describe("Timeline Visualization Queries", () => {
  beforeAll(async () => {
    await prisma.person.create({
      data: {
        id: testPersonId,
        ownerId: "test-owner-timeline-001",
        givenName: "Test",
        familyName: "Timeline",
      },
    });
  });

  afterAll(async () => {
    await prisma.person.delete({ where: { id: testPersonId } });
    await prisma.$disconnect();
  });

  describe("getDailyTimeline", () => {
    it("should return hourly timeline with all 24 hours", async () => {
      const testDate = new Date("2025-10-10T00:00:00Z");

      // Create glucose readings at different hours
      await prisma.glucoseReading.createMany({
        data: [
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T08:30:00Z"),
            value: 95,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T08:45:00Z"),
            value: 100,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T12:30:00Z"),
            value: 150,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T18:00:00Z"),
            value: 120,
            source: "cgm",
          },
        ],
      });

      // Create meals at different hours
      const meal1 = await prisma.foodEntry.create({
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

      const meal2 = await prisma.foodEntry.create({
        data: {
          personId: testPersonId,
          timestamp: new Date("2025-10-10T12:00:00Z"),
          mealType: "lunch",
          totalCalories: 600,
          totalCarbsG: 70,
          totalProteinG: 25,
          totalFatG: 20,
          totalFiberG: 8,
          ingredients: {
            create: {
              name: "Chicken Salad",
              quantity: 200,
              unit: "g",
              confidenceScore: 0.9,
              calories: 600,
              carbsG: 70,
              proteinG: 25,
              fatG: 20,
              fiberG: 8,
              source: "manual_entry",
            },
          },
        },
      });

      const result = await getDailyTimeline(testPersonId, testDate);

      // Should have 24 hours
      expect(result.hourlyData).toHaveLength(24);
      expect(result.date).toBe("2025-10-10");

      // Hour 8 should have glucose readings and breakfast
      const hour8 = result.hourlyData[8];
      expect(hour8.hour).toBe(8);
      expect(hour8.avgGlucose).toBeCloseTo(97.5, 1); // (95 + 100) / 2
      expect(hour8.minGlucose).toBe(95);
      expect(hour8.maxGlucose).toBe(100);
      expect(hour8.mealCount).toBe(1);
      expect(hour8.meals[0].name).toBe("Oatmeal");
      expect(hour8.meals[0].mealType).toBe("breakfast");

      // Hour 12 should have glucose reading and lunch
      const hour12 = result.hourlyData[12];
      expect(hour12.hour).toBe(12);
      expect(hour12.avgGlucose).toBe(150);
      expect(hour12.mealCount).toBe(1);
      expect(hour12.meals[0].name).toBe("Chicken Salad");

      // Hour 0 should have no data
      const hour0 = result.hourlyData[0];
      expect(hour0.hour).toBe(0);
      expect(hour0.avgGlucose).toBe(0);
      expect(hour0.mealCount).toBe(0);
      expect(hour0.meals).toHaveLength(0);

      // Privacy validation
      expect(result).not.toHaveProperty("personId");
      expect(result).not.toHaveProperty("ownerId");

      // Cleanup
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.foodEntry.deleteMany({
        where: { personId: testPersonId },
      });
    });

    it("should handle empty day gracefully", async () => {
      const result = await getDailyTimeline(
        testPersonId,
        new Date("2025-10-15T00:00:00Z")
      );

      expect(result.hourlyData).toHaveLength(24);
      result.hourlyData.forEach((hour, index) => {
        expect(hour.hour).toBe(index);
        expect(hour.avgGlucose).toBe(0);
        expect(hour.mealCount).toBe(0);
      });
    });
  });

  describe("getWeeklyTimeline", () => {
    it("should return daily aggregations for 7 days", async () => {
      const startDate = new Date("2025-10-07T00:00:00Z");

      // Create data for 3 days of the week
      for (let day = 0; day < 3; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);

        // Create glucose readings
        await prisma.glucoseReading.createMany({
          data: [
            {
              personId: testPersonId,
              timestamp: new Date(
                currentDate.getTime() + 8 * 60 * 60 * 1000
              ),
              value: 100 + day * 10, // Vary by day
              source: "cgm",
            },
            {
              personId: testPersonId,
              timestamp: new Date(
                currentDate.getTime() + 12 * 60 * 60 * 1000
              ),
              value: 150 + day * 20,
              source: "cgm",
            },
            {
              personId: testPersonId,
              timestamp: new Date(
                currentDate.getTime() + 18 * 60 * 60 * 1000
              ),
              value: 120 + day * 15,
              source: "cgm",
            },
          ],
        });

        // Create meals
        await prisma.foodEntry.createMany({
          data: [
            {
              personId: testPersonId,
              timestamp: new Date(
                currentDate.getTime() + 8 * 60 * 60 * 1000
              ),
              mealType: "breakfast",
              totalCalories: 400,
              totalCarbsG: 50,
              totalProteinG: 15,
              totalFatG: 10,
              totalFiberG: 5,
            },
            {
              personId: testPersonId,
              timestamp: new Date(
                currentDate.getTime() + 12 * 60 * 60 * 1000
              ),
              mealType: "lunch",
              totalCalories: 600,
              totalCarbsG: 70,
              totalProteinG: 25,
              totalFatG: 20,
              totalFiberG: 8,
            },
          ],
        });
      }

      const result = await getWeeklyTimeline(testPersonId, startDate);

      // Should have 7 days
      expect(result.dailyData).toHaveLength(7);
      expect(result.startDate).toBe("2025-10-07");
      expect(result.endDate).toBe("2025-10-13");

      // First day should have data
      const day0 = result.dailyData[0];
      expect(day0.date).toBe("2025-10-07");
      expect(day0.avgGlucose).toBeCloseTo(123.3, 1); // (100 + 150 + 120) / 3
      expect(day0.minGlucose).toBe(100);
      expect(day0.maxGlucose).toBe(150);
      expect(day0.mealCount).toBe(2);
      expect(day0.spikeCount).toBe(0); // No readings >180

      // Second day should have higher values
      const day1 = result.dailyData[1];
      expect(day1.avgGlucose).toBeGreaterThan(day0.avgGlucose);
      expect(day1.mealCount).toBe(2);

      // Days 4-6 should have no data
      const day4 = result.dailyData[4];
      expect(day4.avgGlucose).toBe(0);
      expect(day4.mealCount).toBe(0);

      // Privacy validation
      expect(result).not.toHaveProperty("personId");

      // Cleanup
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.foodEntry.deleteMany({
        where: { personId: testPersonId },
      });
    });
  });

  describe("getGlucoseStats", () => {
    it("should calculate aggregated glucose statistics", async () => {
      const startDate = new Date("2025-10-10T00:00:00Z");
      const endDate = new Date("2025-10-10T23:59:59Z");

      // Create glucose readings with variety
      await prisma.glucoseReading.createMany({
        data: [
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T08:00:00Z"),
            value: 90,
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
            value: 100,
            source: "cgm",
          },
        ],
      });

      const result = await getGlucoseStats(testPersonId, startDate, endDate);

      expect(result.readingCount).toBe(5);
      expect(result.avgGlucose).toBeCloseTo(129, 1); // (90+120+185+150+100)/5
      expect(result.minGlucose).toBe(90);
      expect(result.maxGlucose).toBe(185);
      expect(result.spikeCount).toBe(1); // Only 185 is >180
      expect(result.timeInRange).toBeCloseTo(80, 1); // 4/5 in range (70-180)

      // Privacy validation
      expect(result).not.toHaveProperty("personId");

      // Cleanup
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
    });

    it("should handle no data gracefully", async () => {
      const result = await getGlucoseStats(
        testPersonId,
        new Date("2025-10-20T00:00:00Z"),
        new Date("2025-10-20T23:59:59Z")
      );

      expect(result.readingCount).toBe(0);
      expect(result.avgGlucose).toBe(0);
      expect(result.spikeCount).toBe(0);
      expect(result.timeInRange).toBe(0);
    });
  });

  describe("getMealStats", () => {
    it("should aggregate meal statistics by type", async () => {
      const startDate = new Date("2025-10-10T00:00:00Z");
      const endDate = new Date("2025-10-11T23:59:59Z");

      // Create meals across 2 days
      await prisma.foodEntry.createMany({
        data: [
          // Day 1
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T08:00:00Z"),
            mealType: "breakfast",
            totalCalories: 400,
            totalCarbsG: 50,
            totalProteinG: 15,
            totalFatG: 10,
            totalFiberG: 5,
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T12:00:00Z"),
            mealType: "lunch",
            totalCalories: 600,
            totalCarbsG: 70,
            totalProteinG: 25,
            totalFatG: 20,
            totalFiberG: 8,
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T18:00:00Z"),
            mealType: "dinner",
            totalCalories: 700,
            totalCarbsG: 80,
            totalProteinG: 30,
            totalFatG: 25,
            totalFiberG: 10,
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-10T15:00:00Z"),
            mealType: "snack",
            totalCalories: 200,
            totalCarbsG: 30,
            totalProteinG: 5,
            totalFatG: 8,
            totalFiberG: 3,
          },
          // Day 2
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-11T08:00:00Z"),
            mealType: "breakfast",
            totalCalories: 450,
            totalCarbsG: 55,
            totalProteinG: 18,
            totalFatG: 12,
            totalFiberG: 6,
          },
          {
            personId: testPersonId,
            timestamp: new Date("2025-10-11T12:00:00Z"),
            mealType: "lunch",
            totalCalories: 650,
            totalCarbsG: 75,
            totalProteinG: 28,
            totalFatG: 22,
            totalFiberG: 9,
          },
        ],
      });

      const result = await getMealStats(testPersonId, startDate, endDate);

      expect(result.totalMeals).toBe(6);
      expect(result.mealsByType.breakfast).toBe(2);
      expect(result.mealsByType.lunch).toBe(2);
      expect(result.mealsByType.dinner).toBe(1);
      expect(result.mealsByType.snack).toBe(1);

      expect(result.totalCalories).toBe(3000); // Sum of all calories
      expect(result.avgCaloriesPerMeal).toBeCloseTo(500, 1); // 3000 / 6

      // Privacy validation
      expect(result).not.toHaveProperty("personId");

      // Cleanup
      await prisma.foodEntry.deleteMany({
        where: { personId: testPersonId },
      });
    });

    it("should handle no meals gracefully", async () => {
      const result = await getMealStats(
        testPersonId,
        new Date("2025-10-20T00:00:00Z"),
        new Date("2025-10-20T23:59:59Z")
      );

      expect(result.totalMeals).toBe(0);
      expect(result.mealsByType.breakfast).toBe(0);
      expect(result.totalCalories).toBe(0);
      expect(result.avgCaloriesPerMeal).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should complete getDailyTimeline in < 2s", async () => {
      const start = Date.now();
      await getDailyTimeline(testPersonId, new Date("2025-10-10T00:00:00Z"));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000); // p95 < 2s target
    });

    it("should complete getWeeklyTimeline in < 2s", async () => {
      const start = Date.now();
      await getWeeklyTimeline(testPersonId, new Date("2025-10-07T00:00:00Z"));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    it("should complete getGlucoseStats in < 2s", async () => {
      const start = Date.now();
      await getGlucoseStats(
        testPersonId,
        new Date("2025-10-01T00:00:00Z"),
        new Date("2025-10-31T23:59:59Z")
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });
});
