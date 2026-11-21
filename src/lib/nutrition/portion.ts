/**
 * Portion weight from container geometry. Vision models describe what they see ("steel katori ~8.5 cm across,
 * ~4 cm deep, three-quarters full") far more reliably than they guess grams, so the app computes the volume
 * itself and blends it with the model's own estimate.
 */
export type ContainerKind = "katori" | "bowl" | "glass" | "cup" | "plate" | "pieces" | "packaged" | "other";

export interface PortionGeometry {
  container_kind: ContainerKind;
  container_diameter_cm: number;
  container_depth_cm: number;
  fill_fraction: number;
  density_g_per_ml: number;
}

// Share of the bounding cylinder (π r² h) a vessel actually holds: steel katoris have steep sides, serving
// bowls are rounder, glasses and cups are nearly cylindrical.
const SHAPE: Partial<Record<ContainerKind, number>> = { katori: 0.8, bowl: 0.6, glass: 0.9, cup: 0.85 };
// Wide-topped vessels hold more in their upper part, so volume grows faster than fill height.
const FILL_EXPONENT: Partial<Record<ContainerKind, number>> = { katori: 1.25, bowl: 1.5, glass: 1, cup: 1.1 };

const finite = (n: number) => (Number.isFinite(n) ? n : 0);

/** Millilitres and grams held, or null when the item isn't in a measurable vessel or the numbers are implausible. */
export function geometricPortion(g: PortionGeometry): { ml: number; grams: number } | null {
  const shape = SHAPE[g.container_kind];
  const d = finite(g.container_diameter_cm);
  const h = finite(g.container_depth_cm);
  const fill = finite(g.fill_fraction);
  if (!shape || d < 4 || d > 30 || h < 1.5 || h > 20 || fill <= 0) return null;
  const full = Math.PI * (d / 2) ** 2 * h * shape;
  // Heaped above the rim (rice, sabzi) adds roughly linearly; capped at 1.5× the rim volume.
  const capped = Math.min(fill, 1.5);
  const fraction = capped <= 1 ? capped ** (FILL_EXPONENT[g.container_kind] ?? 1) : 1 + (capped - 1);
  const ml = full * fraction;
  const density = Math.min(1.4, Math.max(0.3, finite(g.density_g_per_ml) || 1));
  return { ml: Math.round(ml), grams: Math.round(ml * density) };
}

/**
 * Combines the geometric estimate with the model's direct guess (each has independent errors, so the average
 * is steadier than either), widening the range when they disagree.
 */
export function blendPortion(model: { grams: number; low: number; high: number }, geo: { grams: number } | null) {
  const m = Math.max(1, Math.round(finite(model.grams)));
  if (!geo) return { grams: m, low: Math.round(finite(model.low)) || Math.round(m * 0.75), high: Math.round(finite(model.high)) || Math.round(m * 1.25), basis: "model" as const };
  const grams = Math.round((m + geo.grams) / 2);
  return {
    grams,
    low: Math.round(Math.min(finite(model.low) || m, Math.min(m, geo.grams) * 0.9, grams * 0.8)),
    high: Math.round(Math.max(finite(model.high) || m, Math.max(m, geo.grams) * 1.1, grams * 1.2)),
    basis: "geometry" as const,
  };
}

const FRACTIONS: [number, string][] = [[0.25, "¼"], [0.33, "⅓"], [0.5, "½"], [0.66, "⅔"], [0.75, "¾"], [1, "full"]];

/** e.g. "katori ~8.5 cm × 4 cm, ¾ full ≈ 125 ml" */
export function describeGeometry(g: PortionGeometry, ml: number) {
  const f = g.fill_fraction > 1.05 ? "heaped" : (FRACTIONS.reduce((a, b) => (Math.abs(b[0] - g.fill_fraction) < Math.abs(a[0] - g.fill_fraction) ? b : a))[1] + (g.fill_fraction < 0.95 ? " full" : ""));
  return `${g.container_kind} ~${Math.round(g.container_diameter_cm * 2) / 2} cm × ${Math.round(g.container_depth_cm * 2) / 2} cm, ${f.replace("full full", "full")} ≈ ${ml} ml`;
}
