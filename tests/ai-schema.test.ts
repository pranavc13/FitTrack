import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { toGeminiSchema } from "@/lib/ai/client";
import { LabelSchema, MealScanSchema, RecipeParseSchema } from "@/lib/ai/vision";

function walk(node: unknown, visit: (n: Record<string, unknown>) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === "object") {
    visit(node as Record<string, unknown>);
    Object.values(node).forEach((v) => walk(v, visit));
  }
}

describe("Gemini schema conversion", () => {
  for (const [name, schema] of [["meal", MealScanSchema], ["label", LabelSchema], ["recipe", RecipeParseSchema]] as const) {
    it(`produces a clean JSON schema for ${name}`, () => {
      const out = toGeminiSchema(schema) as Record<string, unknown>;
      expect(out.type).toBe("object");
      walk(out, (n) => {
        expect(n).not.toHaveProperty("$schema");
        if (Array.isArray(n.anyOf)) expect((n.anyOf as { type?: string }[]).some((s) => s.type === "null")).toBe(false);
      });
    });
  }

  it("encodes nullable fields as type arrays", () => {
    const out = toGeminiSchema(z.object({ a: z.number().nullable(), b: z.string() })) as { properties: Record<string, { type: unknown }> };
    expect(out.properties.a!.type).toEqual(["number", "null"]);
    expect(out.properties.b!.type).toBe("string");
  });

  it("round-trips label nulls through Zod validation", () => {
    const sample = {
      is_label: true, product_name: "Test", brand: null, barcode: null, serving_size_g: 30, serving_label: null, is_liquid: false,
      per_100: { energy_kcal: 450, protein_g: 8, carbohydrate_g: 60, total_sugars_g: 20, added_sugars_g: null, total_fat_g: 20, saturated_fat_g: 9, trans_fat_g: null, fibre_g: 3, sodium_mg: 400 },
      per_serving: { energy_kcal: null, protein_g: null, carbohydrate_g: null, total_sugars_g: null, added_sugars_g: null, total_fat_g: null, saturated_fat_g: null, trans_fat_g: null, fibre_g: null, sodium_mg: null },
      ingredients_text: null, allergens: [], unreadable_fields: [], read_confidence: 0.9,
    };
    expect(LabelSchema.safeParse(sample).success).toBe(true);
  });
});
