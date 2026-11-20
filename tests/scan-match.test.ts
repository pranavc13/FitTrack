import { describe, expect, it } from "vitest";
import { kcalFits, offPer100, rankScanCandidates } from "@/lib/services/scans";

describe("Open Food Facts nutrition", () => {
  it("converts kJ to kcal when kcal is missing", () => {
    const r = offPer100({ "energy-kj_100g": 1674, proteins_100g: 8, salt_100g: 1 });
    expect(r.values.kcal).toBe(400);
    expect(r.values.sodiumMg).toBe(400);
    expect(r.notes[0]).toMatch(/kJ/);
  });

  it("uses 'as prepared' values when that's all the pack lists (e.g. instant noodles)", () => {
    const r = offPer100({ "energy-kcal_prepared_100g": 384, "proteins_prepared_100g": 8.6 });
    expect(r.values.kcal).toBe(384);
    expect(r.values.proteinG).toBe(8.6);
    expect(r.notes.some((n) => n.includes("prepared"))).toBe(true);
  });

  it("keeps a real 0 kcal (diet drinks)", () => {
    expect(offPer100({ "energy-kcal_100g": 0, "energy-kj_100g": 0.9 }).values.kcal).toBe(0);
  });
});

const food = (name: string, kcal: number, foodType = "beverage", state = "prepared") => ({ name, kcal, foodType, state });

describe("scan match ranking", () => {
  it("picks diet cola over 'rum and diet cola' for a Diet Coke", () => {
    const candidates = [food("Rum and diet cola", 60), food("Vodka and diet cola", 60), food("Soft drink, cola, diet", 2), food("Soft drink, cola", 42)];
    const ranked = rankScanCandidates(candidates, { terms: ["Diet Coke", "diet cola"], isComposite: false, expectedKcal100: 1 });
    expect(ranked[0]!.name).toBe("Soft drink, cola, diet");
  });

  it("prefers the record whose name matches over one that only has the right calories", () => {
    const diet = rankScanCandidates([food("Beverages, OCEAN SPRAY, Diet Cran Cherry", 4), food("Soft drink, cola, diet", 2)], { terms: ["Diet Coke", "diet cola", "soft drink, cola, diet"], isComposite: false, expectedKcal100: 1 });
    expect(diet[0]!.name).toBe("Soft drink, cola, diet");
    const regular = rankScanCandidates([food("Beverages, The COCA-COLA company, Minute Maid, Lemonade", 46), food("Soft drink, cola", 42)], { terms: ["Coca-Cola", "cola", "soft drink, cola"], isComposite: false, expectedKcal100: 42 });
    expect(regular[0]!.name).toBe("Soft drink, cola");
  });

  it("still drops alcoholic mixes when the model gives no energy hint", () => {
    const ranked = rankScanCandidates([food("Rum and cola", 89), food("Soft drink, cola", 42)], { terms: ["cola"], isComposite: false });
    expect(ranked[0]!.name).toBe("Soft drink, cola");
  });

  it("keeps alcohol when it was actually detected", () => {
    const ranked = rankScanCandidates([food("Rum and cola", 89), food("Soft drink, cola", 42)], { terms: ["rum and coke"], isComposite: false, expectedKcal100: 85 });
    expect(ranked[0]!.name).toBe("Rum and cola");
  });

  it("tolerates normal variation in energy density", () => {
    expect(kcalFits(116, 110)).toBe(true); // dal
    expect(kcalFits(2, 1)).toBe(true);
    expect(kcalFits(60, 1)).toBe(false);
    expect(kcalFits(42, null)).toBe(true);
  });
});
