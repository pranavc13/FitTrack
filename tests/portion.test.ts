import { describe, expect, it } from "vitest";
import { blendPortion, describeGeometry, geometricPortion, type PortionGeometry } from "@/lib/nutrition/portion";

const katori = (over: Partial<PortionGeometry> = {}): PortionGeometry => ({ container_kind: "katori", container_diameter_cm: 8.5, container_depth_cm: 4, fill_fraction: 1, density_g_per_ml: 1, ...over });

describe("portion geometry", () => {
  it("a full standard steel katori holds ~150–190 ml", () => {
    const r = geometricPortion(katori())!;
    expect(r.ml).toBeGreaterThanOrEqual(150);
    expect(r.ml).toBeLessThanOrEqual(190);
  });

  it("three-quarters full holds less than ¾ of the volume (narrower at the bottom)", () => {
    const full = geometricPortion(katori())!.ml;
    const tq = geometricPortion(katori({ fill_fraction: 0.75 }))!.ml;
    expect(tq).toBeLessThan(full * 0.75);
    expect(tq).toBeGreaterThan(full * 0.6);
  });

  it("applies density (loose rice weighs less than dal for the same volume)", () => {
    expect(geometricPortion(katori({ density_g_per_ml: 0.75 }))!.grams).toBeLessThan(geometricPortion(katori())!.grams);
  });

  it("ignores items that aren't in a vessel or have implausible sizes", () => {
    expect(geometricPortion(katori({ container_kind: "plate" }))).toBeNull();
    expect(geometricPortion(katori({ container_diameter_cm: 0 }))).toBeNull();
    expect(geometricPortion(katori({ container_depth_cm: 60 }))).toBeNull();
    expect(geometricPortion(katori({ fill_fraction: 0 }))).toBeNull();
  });

  it("blends with the model's estimate and widens the range when they disagree", () => {
    const b = blendPortion({ grams: 200, low: 170, high: 230 }, { grams: 120 });
    expect(b.grams).toBe(160);
    expect(b.low).toBeLessThanOrEqual(120);
    expect(b.high).toBeGreaterThanOrEqual(200);
    expect(blendPortion({ grams: 90, low: 70, high: 110 }, null)).toMatchObject({ grams: 90, low: 70, high: 110, basis: "model" });
  });

  it("describes the measurement for the user", () => {
    expect(describeGeometry(katori({ fill_fraction: 0.75 }), 125)).toBe("katori ~8.5 cm × 4 cm, ¾ full ≈ 125 ml");
    expect(describeGeometry(katori({ fill_fraction: 1 }), 170)).toBe("katori ~8.5 cm × 4 cm, full ≈ 170 ml");
  });
});
