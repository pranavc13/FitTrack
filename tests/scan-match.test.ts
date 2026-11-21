import { describe, expect, it } from "vitest";
import { aiPer100, kcalFits, offPer100, rankScanCandidates, scoreScanCandidates } from "@/lib/services/scans";

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

  it("ranks the detected dish over a generic alternative term (dal tadka vs 'lentil soup')", () => {
    const scored = scoreScanCandidates([food("Soup, lentil", 78, "dish"), food("Dal tadka (home style)", 88, "dish")], { terms: ["dal tadka", "lentil soup", "dal fry"], isComposite: true, expectedKcal100: 100 });
    expect(scored[0]!.c.name).toBe("Dal tadka (home style)");
    expect(scored[0]!.confident).toBe(true);
  });

  it("refuses a confidently wrong match when the catalogue lacks the dish (kala chana curry)", () => {
    const scored = scoreScanCandidates(
      [food("Masala chai (with sugar)", 51, "dish"), food("Chickpea flour (besan)", 387, "ingredient", "not_applicable"), food("Spices, curry powder", 325, "ingredient", "not_applicable")],
      { terms: ["kala chana curry", "kala chana", "black chickpea curry"], isComposite: true, expectedKcal100: 150 },
    );
    expect(scored.some((x) => x.confident)).toBe(false);
  });

  it("accepts close matches with plural/qualifier differences", () => {
    const onion = scoreScanCandidates([food("Onions, raw", 40, "ingredient", "raw")], { terms: ["onion slices", "onion"], isComposite: false, expectedKcal100: 40 });
    expect(onion[0]!.confident).toBe(true);
    const roti = scoreScanCandidates([food("Roti / Phulka (no fat)", 283, "dish")], { terms: ["phulka roti", "chapati"], isComposite: false, expectedKcal100: 290 });
    expect(roti[0]!.confident).toBe(true);
  });

  it("uses catalogue aliases: Indian 'curd' is dahi (yogurt), not soybean curd", () => {
    const scored = scoreScanCandidates(
      [{ ...food("Soybean curd", 61, "ingredient", "not_applicable"), matchedSynonym: null }, { ...food("Yogurt, plain, whole milk", 61, "ingredient", "not_applicable"), matchedSynonym: "curd" }],
      { terms: ["Curd", "dahi", "plain yogurt"], isComposite: false, expectedKcal100: 65 },
    );
    expect(scored[0]!.c.name).toBe("Yogurt, plain, whole milk");
    expect(scored[0]!.confident).toBe(true);
  });

  it("never matches meat the photo didn't show, and ignores generic words like 'sabzi'", () => {
    const pickle = scoreScanCandidates([food("Pickle and pimiento loaf, pork", 230, "ingredient", "prepared")], { terms: ["pickle and onion", "achar", "pickle"], isComposite: false, expectedKcal100: 200 });
    expect(pickle[0]!.confident).toBe(false);
    const sabzi = scoreScanCandidates([food("Gatte ki sabzi", 132, "dish")], { terms: ["potato sabzi", "aloo ki sabzi", "aloo curry"], isComposite: true, expectedKcal100: 120 });
    expect(sabzi[0]!.confident).toBe(false);
    const egg = scoreScanCandidates([food("Egg, whole, cooked, hard-boiled", 155, "ingredient", "cooked")], { terms: ["boiled egg", "egg"], isComposite: false, expectedKcal100: 155 });
    expect(egg[0]!.confident).toBe(true);
  });

  it("keeps AI per-100 g estimates physically possible", () => {
    const v = aiPer100({ expected_kcal_per_100g: 20, expected_protein_per_100g: 8, expected_carbs_per_100g: 20, expected_fat_per_100g: 5, expected_fibre_per_100g: 40 });
    expect(v.kcal).toBeGreaterThanOrEqual(Math.round((8 * 4 + 20 * 4 + 5 * 9) * 0.75)); // not below what the macros imply
    expect(v.fibreG).toBeLessThanOrEqual(v.carbsG);
    expect(aiPer100({ expected_kcal_per_100g: -5, expected_protein_per_100g: -1, expected_carbs_per_100g: 0, expected_fat_per_100g: 0, expected_fibre_per_100g: 0 }).kcal).toBe(0);
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
