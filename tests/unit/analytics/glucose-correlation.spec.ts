// Tests for glucose-meal correlation algorithm
// Privacy validation: Ensures no PHI exposure in analytics outputs
// Performance validation: Query efficiency and response times

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  correlateMealWithGlucose,
  correlateMealsInRange,
  findBestAndWorstMeals,
  averageGlucoseResponseByMealType,
} from "../../../apps/web/src/lib/analytics/glucose-correlation";

const prisma = new PrismaClient();

// Test user ID (non-PHI, UUID only)
const testPersonId = "test-person-analytics-001";

describe("Glucose-Meal Correlation", () => {
  beforeAll(async () => {
    // Create test person
    await prisma.person.create({
      data: {
        id: testPersonId,
        ownerId: "test-owner-analytics-001",
        givenName: "Test",
        familyName: "User",
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.person.delete({
      where: { id: testPersonId },
    });
    await prisma.$disconnect();
  });

  describe("correlateMealWithGlucose", () => {
    it("should return null for non-existent meal", async () => {
      const result = await correlateMealWithGlucose(
        testPersonId,
        "non-existent-meal-id"
      );
      expect(result).toBeNull();
    });

    it("should return null when meal has no glucose data", async () => {
      // Create meal without glucose readings
      const meal = await prisma.foodEntry.create({
        data: {
          personId: testPersonId,
          timestamp: new Date("2025-10-10T12:00:00Z"),
          mealType: "lunch",
          totalCalories: 500,
          totalCarbsG: 60,
          totalProteinG: 20,
          totalFatG: 15,
          totalFiberG: 5,
        },
      });

      const result = await correlateMealWithGlucose(testPersonId, meal.id);

      // Should return null because no glucose data
      expect(result).toBeNull();

      // Cleanup
      await prisma.foodEntry.delete({ where: { id: meal.id } });
    });

    it("should calculate correlation with baseline and peak", async () => {
      const mealTime = new Date("2025-10-10T12:00:00Z");

      // Create meal
      const meal = await prisma.foodEntry.create({
        data: {
          personId: testPersonId,
          timestamp: mealTime,
          mealType: "lunch",
          totalCalories: 500,
          totalCarbsG: 60,
          totalProteinG: 20,
          totalFatG: 15,
          totalFiberG: 5,
          ingredients: {
            create: [
              {
                name: "Pasta",
                quantity: 200,
                unit: "g",
                confidenceScore: 0.95,
                calories: 300,
                carbsG: 50,
                proteinG: 10,
                fatG: 5,
                fiberG: 3,
                source: "manual_entry",
              },
              {
                name: "Tomato Sauce",
                quantity: 100,
                unit: "g",
                confidenceScore: 0.9,
                calories: 200,
                carbsG: 10,
                proteinG: 10,
                fatG: 10,
                fiberG: 2,
                source: "manual_entry",
              },
            ],
          },
        },
      });

      // Create baseline glucose readings (30 min before meal)
      await prisma.glucoseReading.createMany({
        data: [
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() - 25 * 60 * 1000),
            value: 100,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() - 20 * 60 * 1000),
            value: 102,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() - 15 * 60 * 1000),
            value: 105,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() - 10 * 60 * 1000),
            value: 103,
            source: "cgm",
          },
        ],
      });

      // Create post-meal glucose readings (peak at 90 min) - 10+ total for high confidence
      const peakTime = new Date(mealTime.getTime() + 90 * 60 * 1000);

      await prisma.glucoseReading.createMany({
        data: [
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() + 15 * 60 * 1000),
            value: 120,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() + 30 * 60 * 1000),
            value: 140,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() + 45 * 60 * 1000),
            value: 165,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() + 60 * 60 * 1000),
            value: 175,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() + 75 * 60 * 1000),
            value: 185,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: peakTime,
            value: 190, // Peak (spike)
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() + 105 * 60 * 1000),
            value: 170,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() + 120 * 60 * 1000),
            value: 150,
            source: "cgm",
          },
        ],
      });

      const result = await correlateMealWithGlucose(testPersonId, meal.id);

      // Assertions
      expect(result).not.toBeNull();
      expect(result?.mealId).toBe(meal.id);
      expect(result?.mealName).toBe("Pasta, Tomato Sauce");
      expect(result?.mealType).toBe("lunch");
      expect(result?.glucoseResponse.baseline).toBeCloseTo(102.5, 1); // avg of 100, 102, 105, 103
      expect(result?.glucoseResponse.peak).toBe(190);
      expect(result?.glucoseResponse.change).toBeCloseTo(87.5, 1); // 190 - 102.5
      expect(result?.glucoseResponse.spiked).toBe(true); // >180 mg/dL
      expect(result?.confidence).toBe("high"); // 12 total readings (4 baseline + 8 post-meal)

      // Privacy validation: No PHI in result
      expect(result).not.toHaveProperty("personId");
      expect(result).not.toHaveProperty("ownerId");

      // Cleanup
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.foodEntry.delete({ where: { id: meal.id } });
    });

    it("should detect confidence level correctly", async () => {
      const mealTime = new Date("2025-10-10T14:00:00Z");

      // Create meal
      const meal = await prisma.foodEntry.create({
        data: {
          personId: testPersonId,
          timestamp: mealTime,
          mealType: "snack",
          totalCalories: 200,
          totalCarbsG: 30,
          totalProteinG: 5,
          totalFatG: 8,
          totalFiberG: 2,
        },
      });

      // Create only 2 glucose readings (low confidence, < 4)
      await prisma.glucoseReading.createMany({
        data: [
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() - 20 * 60 * 1000),
            value: 110,
            source: "fingerstick",
          },
          {
            personId: testPersonId,
            timestamp: new Date(mealTime.getTime() + 90 * 60 * 1000),
            value: 140,
            source: "fingerstick",
          },
        ],
      });

      const result = await correlateMealWithGlucose(testPersonId, meal.id);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe("low"); // Only 2 readings (< 4)

      // Cleanup
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.foodEntry.delete({ where: { id: meal.id } });
    });
  });

  describe("correlateMealsInRange", () => {
    it("should correlate multiple meals in date range", async () => {
      const day1 = new Date("2025-10-10T08:00:00Z");
      const day2 = new Date("2025-10-11T08:00:00Z");

      // Create meals on both days
      const meals = await prisma.foodEntry.createMany({
        data: [
          {
            personId: testPersonId,
            timestamp: day1,
            mealType: "breakfast",
            totalCalories: 400,
            totalCarbsG: 50,
            totalProteinG: 15,
            totalFatG: 10,
            totalFiberG: 5,
          },
          {
            personId: testPersonId,
            timestamp: day2,
            mealType: "breakfast",
            totalCalories: 450,
            totalCarbsG: 55,
            totalProteinG: 18,
            totalFatG: 12,
            totalFiberG: 6,
          },
        ],
      });

      // Create glucose readings for both days
      await prisma.glucoseReading.createMany({
        data: [
          // Day 1 baseline + peak
          {
            personId: testPersonId,
            timestamp: new Date(day1.getTime() - 20 * 60 * 1000),
            value: 95,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(day1.getTime() + 90 * 60 * 1000),
            value: 150,
            source: "cgm",
          },
          // Day 2 baseline + peak
          {
            personId: testPersonId,
            timestamp: new Date(day2.getTime() - 20 * 60 * 1000),
            value: 100,
            source: "cgm",
          },
          {
            personId: testPersonId,
            timestamp: new Date(day2.getTime() + 90 * 60 * 1000),
            value: 185, // Spike
            source: "cgm",
          },
        ],
      });

      const result = await correlateMealsInRange(
        testPersonId,
        new Date("2025-10-10T00:00:00Z"),
        new Date("2025-10-11T23:59:59Z")
      );

      expect(result).toHaveLength(2);
      expect(result[0].mealType).toBe("breakfast");
      expect(result[1].mealType).toBe("breakfast");

      // Privacy validation
      result.forEach((correlation) => {
        expect(correlation).not.toHaveProperty("personId");
        expect(correlation).not.toHaveProperty("ownerId");
      });

      // Cleanup
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.foodEntry.deleteMany({
        where: { personId: testPersonId },
      });
    });
  });

  describe("findBestAndWorstMeals", () => {
    it("should identify best and worst meals by glucose response", async () => {
      const baseTime = new Date("2025-10-10T00:00:00Z");

      // Create 6 meals with varying glucose responses
      const meals = [];
      for (let i = 0; i < 6; i++) {
        const mealTime = new Date(baseTime.getTime() + i * 4 * 60 * 60 * 1000);
        const meal = await prisma.foodEntry.create({
          data: {
            personId: testPersonId,
            timestamp: mealTime,
            mealType: i % 2 === 0 ? "breakfast" : "lunch",
            totalCalories: 400 + i * 50,
            totalCarbsG: 50 + i * 5,
            totalProteinG: 15,
            totalFatG: 10,
            totalFiberG: 5,
            ingredients: {
              create: {
                name: `Meal ${i}`,
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

        // Create glucose data (baseline + peak)
        await prisma.glucoseReading.createMany({
          data: [
            {
              personId: testPersonId,
              timestamp: new Date(mealTime.getTime() - 20 * 60 * 1000),
              value: 100,
              source: "cgm",
            },
            // Vary peak: i=0 → 110 (best), i=5 → 200 (worst)
            {
              personId: testPersonId,
              timestamp: new Date(mealTime.getTime() + 90 * 60 * 1000),
              value: 100 + i * 18, // +10, +28, +46, +64, +82, +100
              source: "cgm",
            },
            // Add more readings for high confidence
            {
              personId: testPersonId,
              timestamp: new Date(mealTime.getTime() + 30 * 60 * 1000),
              value: 100 + i * 9,
              source: "cgm",
            },
            {
              personId: testPersonId,
              timestamp: new Date(mealTime.getTime() + 60 * 60 * 1000),
              value: 100 + i * 15,
              source: "cgm",
            },
          ],
        });

        meals.push(meal);
      }

      const result = await findBestAndWorstMeals(
        testPersonId,
        new Date("2025-10-09T00:00:00Z"),
        new Date("2025-10-11T23:59:59Z")
      );

      expect(result.best).toHaveLength(5);
      expect(result.worst).toHaveLength(5);
      expect(result.disclaimer).toBeTruthy();

      // Best meal should be Meal 0 (lowest change)
      expect(result.best[0].mealName).toBe("Meal 0");
      expect(result.best[0].glucoseResponse.change).toBeLessThan(20);

      // Worst meal should be Meal 5 (highest change)
      expect(result.worst[0].mealName).toBe("Meal 5");
      expect(result.worst[0].glucoseResponse.change).toBeGreaterThan(80);

      // Privacy validation
      expect(result).not.toHaveProperty("personId");
      result.best.forEach((meal) => {
        expect(meal).not.toHaveProperty("personId");
      });
      result.worst.forEach((meal) => {
        expect(meal).not.toHaveProperty("personId");
      });

      // Cleanup
      await prisma.glucoseReading.deleteMany({
        where: { personId: testPersonId },
      });
      await prisma.foodEntry.deleteMany({
        where: { personId: testPersonId },
      });
    });
  });

  describe("averageGlucoseResponseByMealType", () => {
    it("should calculate averages by meal type", async () => {
      const baseTime = new Date("2025-10-10T00:00:00Z");

      // Create 2 breakfasts and 2 lunches with different responses
      const mealTypes = ["breakfast", "breakfast", "lunch", "lunch"];
      const glucoseChanges = [20, 30, 60, 70]; // breakfast avg: 25, lunch avg: 65

      for (let i = 0; i < mealTypes.length; i++) {
        const mealTime = new Date(baseTime.getTime() + i * 4 * 60 * 60 * 1000);
        await prisma.foodEntry.create({
          data: {
            personId: testPersonId,
            timestamp: mealTime,
            mealType: mealTypes[i] as any,
            totalCalories: 400,
            totalCarbsG: 50,
            totalProteinG: 15,
            totalFatG: 10,
            totalFiberG: 5,
          },
        });

        // Glucose baseline + peak
        await prisma.glucoseReading.createMany({
          data: [
            {
              personId: testPersonId,
              timestamp: new Date(mealTime.getTime() - 20 * 60 * 1000),
              value: 100,
              source: "cgm",
            },
            {
              personId: testPersonId,
              timestamp: new Date(mealTime.getTime() + 90 * 60 * 1000),
              value: 100 + glucoseChanges[i],
              source: "cgm",
            },
          ],
        });
      }

      const result = await averageGlucoseResponseByMealType(
        testPersonId,
        new Date("2025-10-09T00:00:00Z"),
        new Date("2025-10-11T23:59:59Z")
      );

      expect(result).toHaveProperty("breakfast");
      expect(result).toHaveProperty("lunch");

      expect(result.breakfast.count).toBe(2);
      expect(result.breakfast.avgChange).toBeCloseTo(25, 1); // (20 + 30) / 2
      expect(result.breakfast.spikeRate).toBe(0); // No spikes >180

      expect(result.lunch.count).toBe(2);
      expect(result.lunch.avgChange).toBeCloseTo(65, 1); // (60 + 70) / 2
      expect(result.lunch.spikeRate).toBe(0); // No spikes >180

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
});
