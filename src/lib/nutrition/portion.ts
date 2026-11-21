/**
 * Portion weight from container geometry. Vision models describe what they see ("steel katori about a third
 * of the plate's width, ~4 cm deep, three-quarters full") far more reliably than they guess grams, so the app
 * computes the volume itself and blends it with the model's own estimate.
 */
export type ContainerKind = "katori" | "bowl" | "glass" | "cup" | "plate" | "pieces" | "packaged" | "other";

export interface PortionGeometry {
  container_kind: ContainerKind;
  container_diameter_cm: number;
  container_depth_cm: number;
  fill_fraction: number;
  density_g_per_ml: number;
  /** Vessel rim width as a share of the plate's diameter (0 when not measured against a plate). */
  width_vs_plate?: number;
  /** Food spread on the plate: share of the plate surface it covers, and the height of the mound. */
  plate_area_fraction?: number;
  mound_height_cm?: number;
}

/** The plate everything is measured against; `known` when the user told us its size. */
export interface PlateScale {
  diameterCm: number | null;
  known: boolean;
}

// Share of the bounding cylinder (π r² h) a vessel actually holds: steel katoris have steep sides, serving
// bowls are rounder, glasses and cups are nearly cylindrical.
const SHAPE: Partial<Record<ContainerKind, number>> = { katori: 0.8, bowl: 0.6, glass: 0.9, cup: 0.85 };
// Wide-topped vessels hold more in their upper part, so volume grows faster than fill height.
const FILL_EXPONENT: Partial<Record<ContainerKind, number>> = { katori: 1.25, bowl: 1.5, glass: 1, cup: 1.1 };
// A mound of rice/sabzi on a plate is roughly a spherical cap: about half the cylinder of its footprint.
const MOUND_SHAPE = 0.5;

const finite = (n: number | undefined) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
const validPlate = (p: PlateScale | undefined) => (p && p.diameterCm && p.diameterCm >= 15 && p.diameterCm <= 40 ? p.diameterCm : null);

/** Rim diameter, preferring a measurement relative to the plate (exact when the user gave the plate size). */
export function vesselDiameter(g: PortionGeometry, plate?: PlateScale): number {
  const abs = finite(g.container_diameter_cm);
  const ratio = finite(g.width_vs_plate);
  const plateCm = validPlate(plate);
  if (!plateCm || ratio < 0.12 || ratio > 0.75) return abs;
  const rel = ratio * plateCm;
  if (plate!.known || abs < 4) return rel;
  return (abs + rel) / 2;
}

export interface GeometricPortion {
  ml: number;
  grams: number;
  diameterCm: number;
  method: "vessel" | "plate";
}

/** Millilitres and grams held, or null when the item isn't measurable or the numbers are implausible. */
export function geometricPortion(g: PortionGeometry, plate?: PlateScale): GeometricPortion | null {
  const density = Math.min(1.4, Math.max(0.3, finite(g.density_g_per_ml) || 1));
  if (g.container_kind === "plate") {
    const plateCm = validPlate(plate);
    const area = finite(g.plate_area_fraction);
    const h = finite(g.mound_height_cm);
    if (!plateCm || area <= 0.02 || area > 0.8 || h < 0.5 || h > 8) return null;
    // Food sits on the flat well inside the rim (~85 % of the full diameter).
    const well = Math.PI * ((plateCm * 0.85) / 2) ** 2;
    const ml = well * area * h * MOUND_SHAPE;
    return { ml: Math.round(ml), grams: Math.round(ml * density), diameterCm: plateCm, method: "plate" };
  }
  const shape = SHAPE[g.container_kind];
  const d = vesselDiameter(g, plate);
  const h = finite(g.container_depth_cm);
  const fill = finite(g.fill_fraction);
  if (!shape || d < 4 || d > 30 || h < 1.5 || h > 20 || fill <= 0) return null;
  const full = Math.PI * (d / 2) ** 2 * h * shape;
  // Heaped above the rim (rice, sabzi) adds roughly linearly; capped at 1.5× the rim volume.
  const capped = Math.min(fill, 1.5);
  const fraction = capped <= 1 ? capped ** (FILL_EXPONENT[g.container_kind] ?? 1) : capped;
  const ml = full * fraction;
  return { ml: Math.round(ml), grams: Math.round(ml * density), diameterCm: d, method: "vessel" };
}

/**
 * Combines the geometric estimate with the model's direct guess (each has independent errors, so the average
 * is steadier than either), widening the range when they disagree. A plate size the user confirmed makes the
 * geometry more trustworthy, so it gets more weight.
 */
export function blendPortion(model: { grams: number; low: number; high: number }, geo: { grams: number } | null, opts: { trustGeometry?: boolean } = {}) {
  const m = Math.max(1, Math.round(finite(model.grams)));
  if (!geo) return { grams: m, low: Math.round(finite(model.low)) || Math.round(m * 0.75), high: Math.round(finite(model.high)) || Math.round(m * 1.25), basis: "model" as const };
  const w = opts.trustGeometry ? 0.65 : 0.5;
  const grams = Math.max(1, Math.round(m * (1 - w) + geo.grams * w));
  return {
    grams,
    low: Math.round(Math.min(finite(model.low) || m, Math.min(m, geo.grams) * 0.9, grams * 0.8)),
    high: Math.round(Math.max(finite(model.high) || m, Math.max(m, geo.grams) * 1.1, grams * 1.2)),
    basis: "geometry" as const,
  };
}

const FRACTIONS: [number, string][] = [[0.1, "a little"], [0.25, "¼"], [0.33, "⅓"], [0.5, "½"], [0.66, "⅔"], [0.75, "¾"], [1, "full"]];
const nearest = (x: number) => FRACTIONS.reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a))[1];
const half = (n: number) => Math.round(n * 2) / 2;

/** e.g. "katori ~8.5 cm × 4 cm, ¾ full ≈ 125 ml" or "on plate: ¼ of a 25 cm plate, ~3 cm high ≈ 170 ml" */
export function describeGeometry(g: PortionGeometry, geo: Pick<GeometricPortion, "ml" | "diameterCm" | "method">) {
  if (geo.method === "plate") {
    const share = nearest(finite(g.plate_area_fraction));
    return `on plate: ${share === "full" ? "the whole" : share + " of a"} ${half(geo.diameterCm)} cm plate, ~${half(finite(g.mound_height_cm))} cm high ≈ ${geo.ml} ml`;
  }
  const f = g.fill_fraction > 1.05 ? "heaped" : nearest(g.fill_fraction) === "full" ? "full" : `${nearest(g.fill_fraction)} full`;
  return `${g.container_kind} ~${half(geo.diameterCm)} cm × ${half(g.container_depth_cm)} cm, ${f} ≈ ${geo.ml} ml`;
}
