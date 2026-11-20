import { describe, expect, it } from "vitest";
import { analyzeFitDay, estimateMaintenance, goalCalories, minutesToBurn, type FitDayInput, type FitPerson } from "@/lib/nutrition/fit-journal";
import { bmrMifflin } from "@/lib/nutrition/targets";

// 28-year-old man, 175 cm, 80 kg → BMR = 800 + 1093.75 − 140 + 5 = 1758.75
const person: FitPerson = { weightKg: 80, heightCm: 175, bmr: bmrMifflin(80, 175, 28, "male"), sex: "male", dietPreference: "vegetarian", stepGoal: 8000, proteinTargetG: 144, fibreTargetG: 30 };
const day = (over: Partial<FitDayInput> = {}): FitDayInput => ({ steps: 6000, heartPoints: 10, moveMinutes: 40, distanceKm: 4.2, caloriesBurned: 1900, avgHeartRate: null, goal: "belly_fat_reduction", dayFraction: 1, ...over });
const intake = { kcal: 2400, proteinG: 70, carbsG: 300, fatG: 80, fibreG: 15, sugarG: 30, entries: 5 };

describe("fit journal", () => {
  it("treats Google Fit calories as BMR-inclusive and projects resting burn for the rest of the day", () => {
    expect(person.bmr).toBeCloseTo(1758.75, 2);
    expect(estimateMaintenance(day(), person).kcal).toBe(1900);
    // At 18:00, a quarter of the day's resting burn is still to come.
    const m = estimateMaintenance(day({ dayFraction: 0.75, caloriesBurned: 1500 }), person);
    expect(m.kcal).toBe(Math.round(1500 + 1758.75 * 0.25));
    expect(m.source).toBe("google_fit");
  });

  it("falls back to BMR × 1.2 + net walking kcal when no Fit calories are entered", () => {
    const m = estimateMaintenance(day({ caloriesBurned: null, distanceKm: 4.8 }), person);
    // 4.8 km at 4.8 km/h = 60 min; walking MET at 4.8 km/h interpolates to 3.6 → net 2.6 × 3.5 × 80 / 200 × 60
    expect(m.kcal).toBe(Math.round(1758.75 * 1.2 + 2.6 * 1.4 * 60));
    expect(m.source).toBe("estimate");
  });

  it("applies the goal deficit to today's maintenance, never below the safety floor", () => {
    expect(goalCalories(2600, "belly_fat_reduction", person).kcal).toBe(Math.round((2600 - 468) / 10) * 10);
    expect(goalCalories(2100, "weight_loss", person).kcal).toBe(Math.round(person.bmr)); // floor = BMR
    expect(goalCalories(1700, "weight_loss", person).kcal).toBe(1700); // a deficit goal never turns into a surplus
    expect(goalCalories(2600, "muscle_gain", person).adjustment).toBeGreaterThan(0);
  });

  it("converts an excess into brisk-walk minutes using net kcal", () => {
    // Brisk 5.6 km/h → MET 4.4 → net 3.4 × 3.5 × 80 / 200 = 4.76 kcal/min; 300 / 4.76 = 63 → rounded up to 65
    expect(minutesToBurn(300, 5.6, "walk", 80)).toBe(65);
  });

  it("tells a belly-fat user who overate to walk, and suggests vegetarian protein and fibre", () => {
    const a = analyzeFitDay(day(), person, intake);
    expect(a.maintenance.kcal).toBe(1900);
    expect(a.overTarget).toBeGreaterThan(0);
    expect(a.actions[0]!.kind).toBe("move");
    expect(a.actions[0]!.title).toMatch(/brisk walk/);
    const protein = a.actions.find((x) => x.title.startsWith("Add") && x.title.includes("protein"))!;
    expect(protein.title).toBe("Add 74 g protein");
    expect(protein.detail).not.toMatch(/chicken|egg|fish/i);
    expect(a.actions.some((x) => x.title === "Add 15 g fibre")).toBe(true);
    expect(a.actions.some((x) => x.title.includes("Heart Points"))).toBe(true);
  });

  it("mid-day under target: shows remaining budget instead of a workout", () => {
    const a = analyzeFitDay(day({ dayFraction: 0.5, caloriesBurned: 1100, steps: 9000, heartPoints: 30 }), person, { ...intake, kcal: 900, proteinG: 150, fibreG: 32 });
    expect(a.partial).toBe(true);
    expect(a.actions[0]!.kind).toBe("hold");
    expect(a.actions.filter((x) => x.kind === "move")).toHaveLength(0);
  });
});
