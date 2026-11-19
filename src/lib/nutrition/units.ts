/**
 * Portion → gram conversion. Food-specific household measures (from USDA portions or recipe yields)
 * always win; generic fallbacks are explicit estimates and flagged as such.
 */

export interface ServingOption {
  label: string;
  unit: string;
  amount: number;
  grams: number;
}

export const MASS_UNITS: Record<string, number> = { g: 1, kg: 1000, mg: 0.001, oz: 28.3495, lb: 453.592 };
export const VOLUME_UNITS_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 240,
  glass: 250,
  katori: 150,
  bowl: 250,
  "fl oz": 29.5735,
};

/** Units shown in the logging UI. */
export const UNIT_CHOICES = ["g", "ml", "piece", "serving", "bowl", "katori", "cup", "glass", "tbsp", "tsp", "slice", "kg", "oz"] as const;

export interface GramResolution {
  grams: number;
  /** True when we used a generic conversion rather than a food-specific measure. */
  isEstimate: boolean;
  basis: string;
}

function normalizeUnit(u: string): string {
  const s = u.trim().toLowerCase();
  const aliases: Record<string, string> = {
    gram: "g", grams: "g", gm: "g", gms: "g",
    millilitre: "ml", milliliter: "ml", millilitres: "ml", milliliters: "ml",
    litre: "l", liter: "l",
    teaspoon: "tsp", teaspoons: "tsp", tablespoon: "tbsp", tablespoons: "tbsp",
    cups: "cup", glasses: "glass", bowls: "bowl", katoris: "katori",
    pieces: "piece", pc: "piece", pcs: "piece", nos: "piece", no: "piece",
    slices: "slice", servings: "serving",
  };
  return aliases[s] ?? s;
}

/**
 * Resolve `quantity unit` of a food into grams.
 * Priority: mass units → food-specific measure matching the unit → volume × density → generic estimate.
 */
export function resolveGrams(
  quantity: number,
  unitRaw: string,
  servings: ServingOption[] = [],
  densityGPerMl: number | null = null,
): GramResolution {
  if (!(quantity > 0) || !Number.isFinite(quantity)) throw new RangeError("Quantity must be a positive number");
  const unit = normalizeUnit(unitRaw);

  if (unit in MASS_UNITS) return { grams: quantity * MASS_UNITS[unit]!, isEstimate: false, basis: `${unit}` };

  // Exact food-specific measure (e.g. unit "piece" matching "1 medium roti").
  const specific =
    servings.find((s) => normalizeUnit(s.unit) === unit) ??
    (unit === "serving" ? servings[0] : undefined) ??
    servings.find((s) => s.label.toLowerCase().includes(unit));
  if (specific) {
    return { grams: (quantity / (specific.amount || 1)) * specific.grams, isEstimate: false, basis: specific.label };
  }

  if (unit in VOLUME_UNITS_ML) {
    const ml = quantity * VOLUME_UNITS_ML[unit]!;
    if (densityGPerMl) return { grams: ml * densityGPerMl, isEstimate: false, basis: `${ml} ml × ${densityGPerMl} g/ml` };
    // Water-like density assumption.
    return { grams: ml, isEstimate: unit !== "ml" && unit !== "l", basis: `${ml} ml ≈ ${ml} g (density ≈ 1 assumed)` };
  }

  throw new RangeError(`No conversion available for unit "${unitRaw}" on this food — choose grams or a listed serving`);
}

/** Generic Indian household measure fallbacks (shown as estimates in the UI). */
export const GENERIC_MEASURES: ServingOption[] = [
  { label: "1 katori (≈150 ml)", unit: "katori", amount: 1, grams: 150 },
  { label: "1 bowl (≈250 ml)", unit: "bowl", amount: 1, grams: 250 },
  { label: "1 glass (≈250 ml)", unit: "glass", amount: 1, grams: 250 },
];
