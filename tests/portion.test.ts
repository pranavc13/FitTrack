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
    expect(describeGeometry(katori({ fill_fraction: 0.75 }), { ml: 125, diameterCm: 8.5, method: "vessel" })).toBe("katori ~8.5 cm × 4 cm, ¾ full ≈ 125 ml");
    expect(describeGeometry(katori({ fill_fraction: 1 }), { ml: 170, diameterCm: 8.5, method: "vessel" })).toBe("katori ~8.5 cm × 4 cm, full ≈ 170 ml");
    expect(describeGeometry(katori({ container_kind: "plate", plate_area_fraction: 0.25, mound_height_cm: 3 }), { ml: 170, diameterCm: 25, method: "plate" })).toBe("on plate: ¼ of a 25 cm plate, ~3 cm high ≈ 170 ml");
  });

  it("measures a vessel against the plate the user picked", () => {
    // The model thinks the katori is 11 cm, but side by side it is a third of a 25 cm plate (≈ 8.3 cm).
    const g = katori({ container_diameter_cm: 11, width_vs_plate: 1 / 3 });
    expect(geometricPortion(g, { diameterCm: 25, known: true })!.diameterCm).toBeCloseTo(8.33, 1);
    // Without a confirmed plate the two readings are averaged.
    expect(geometricPortion(g, { diameterCm: 25, known: false })!.diameterCm).toBeCloseTo(9.67, 1);
    // Implausible ratios fall back to the absolute reading.
    expect(geometricPortion(katori({ width_vs_plate: 0.95 }), { diameterCm: 25, known: true })!.diameterCm).toBe(8.5);
  });

  it("measures food spread on the plate (rice heap)", () => {
    const rice = katori({ container_kind: "plate", container_diameter_cm: 0, container_depth_cm: 0, fill_fraction: 0, plate_area_fraction: 0.3, mound_height_cm: 3.5, density_g_per_ml: 0.75 });
    const r = geometricPortion(rice, { diameterCm: 26, known: true })!;
    expect(r.method).toBe("plate");
    // A heap covering ~a third of a dinner plate, ~3.5 cm tall, is a normal 120–220 g serving of cooked rice.
    expect(r.grams).toBeGreaterThan(120);
    expect(r.grams).toBeLessThan(220);
    expect(geometricPortion(rice)).toBeNull();
    expect(geometricPortion({ ...rice, mound_height_cm: 0 }, { diameterCm: 26, known: true })).toBeNull();
  });

  it("trusts geometry more when the plate size is confirmed", () => {
    expect(blendPortion({ grams: 200, low: 170, high: 230 }, { grams: 100 }, { trustGeometry: true }).grams).toBe(135);
  });
});
