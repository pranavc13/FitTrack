/**
 * Energy & macro target calculations. All outputs are *estimates* and are labelled as such in the UI.
 *
 * Energy model (avoids double counting):
 *   baseline = BMR × lifestyle factor  (non-exercise movement only: job, chores, typical walking)
 *   daily expenditure = baseline + Σ net exercise kcal from explicitly logged activities
 * The lifestyle factors below are deliberately lower than the classic "TDEE incl. exercise" factors,
 * because exercise is added from the activity log instead. Step counts are tracked but not converted to
 * extra kcal (typical step volume is already part of the lifestyle factor).
 */

export type Sex = "male" | "female" | "unspecified";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType =
  | "weight_loss"
  | "fat_loss"
  | "belly_fat_reduction"
  | "muscle_gain"
  | "recomposition"
  | "visible_abs"
  | "strength"
  | "endurance"
  | "general_fitness"
  | "maintenance";

/** Non-exercise lifestyle multipliers (on BMR). */
export const LIFESTYLE_FACTORS: Record<ActivityLevel, { factor: number; label: string }> = {
  sedentary: { factor: 1.2, label: "Desk job, little walking" },
  light: { factor: 1.3, label: "Mostly seated, some walking/chores" },
  moderate: { factor: 1.4, label: "On feet part of the day" },
  active: { factor: 1.5, label: "On feet most of the day" },
  very_active: { factor: 1.7, label: "Physical labour job" },
};

export function ageFromDob(dob: string | Date, at: Date = new Date()): number {
  const d = typeof dob === "string" ? new Date(dob + (dob.length === 10 ? "T00:00:00Z" : "")) : dob;
  let age = at.getUTCFullYear() - d.getUTCFullYear();
  const m = at.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** WHO categories plus the lower Asian-Indian cut-offs (overweight ≥23, obese ≥25) used by ICMR/MoHFW. */
export function bmiCategory(value: number): { who: string; asian: string } {
  const who = value < 18.5 ? "Underweight" : value < 25 ? "Normal" : value < 30 ? "Overweight" : "Obese";
  const asian = value < 18.5 ? "Underweight" : value < 23 ? "Normal" : value < 25 ? "Overweight" : "Obese";
  return { who, asian };
}

/**
 * Mifflin–St Jeor BMR (kcal/day). When sex is not provided we use the midpoint of the male (+5) and
 * female (−161) constants (−78) and widen the stated uncertainty.
 */
export function bmrMifflin(weightKg: number, heightCm: number, ageYears: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const constant = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  return base + constant;
}

export interface TargetInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: GoalType;
  targetWeightKg?: number | null;
  /** Average planned workout kcal/day (net), used only to give a realistic total. */
  plannedExerciseKcalPerDay?: number;
}

export interface Targets {
  bmi: number;
  bmiCategory: { who: string; asian: string };
  bmr: number;
  baseline: number;
  /** Estimated maintenance including planned exercise. */
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  waterMl: number;
  energyAdjustment: number;
  rationale: string[];
  method: string;
}

export const GOAL_ENERGY: Record<GoalType, { pct: number; capKcal: number; note: string }> = {
  weight_loss: { pct: -0.2, capKcal: -750, note: "≈20% deficit (capped at 750 kcal) for ~0.5–0.75 kg/week" },
  fat_loss: { pct: -0.18, capKcal: -650, note: "≈18% deficit to preserve muscle while losing fat" },
  belly_fat_reduction: { pct: -0.18, capKcal: -650, note: "Belly fat reduces with overall fat loss (spot reduction isn't possible)" },
  visible_abs: { pct: -0.15, capKcal: -550, note: "Moderate deficit; visible abs depend on overall body-fat level and genetics" },
  recomposition: { pct: -0.08, capKcal: -300, note: "Small deficit with high protein and progressive strength training" },
  muscle_gain: { pct: 0.1, capKcal: 350, note: "≈10% surplus (lean bulk) to limit fat gain" },
  strength: { pct: 0.05, capKcal: 200, note: "Slight surplus to support strength progress" },
  endurance: { pct: 0, capKcal: 0, note: "Maintenance; fuel training sessions with carbohydrate" },
  general_fitness: { pct: 0, capKcal: 0, note: "Maintenance" },
  maintenance: { pct: 0, capKcal: 0, note: "Maintenance" },
};

/** Protein g per kg (reference weight). Evidence base: ISSN position stand (1.4–2.0 g/kg for active people; up to 2.2 in a deficit). */
export const PROTEIN_PER_KG: Record<GoalType, number> = {
  weight_loss: 1.6,
  fat_loss: 1.8,
  belly_fat_reduction: 1.8,
  visible_abs: 2.0,
  recomposition: 2.0,
  muscle_gain: 1.8,
  strength: 1.8,
  endurance: 1.4,
  general_fitness: 1.2,
  maintenance: 1.2,
};

export function calculateTargets(input: TargetInput): Targets {
  const { weightKg, heightCm, ageYears, sex, activityLevel, goal } = input;
  if (!(weightKg > 20 && weightKg < 400)) throw new RangeError("Weight must be between 20 and 400 kg");
  if (!(heightCm > 100 && heightCm < 250)) throw new RangeError("Height must be between 100 and 250 cm");
  if (!(ageYears >= 13 && ageYears <= 100)) throw new RangeError("Age must be between 13 and 100");

  const rationale: string[] = [];
  const bmiValue = bmi(weightKg, heightCm);
  const bmr = bmrMifflin(weightKg, heightCm, ageYears, sex);
  const baseline = bmr * LIFESTYLE_FACTORS[activityLevel].factor;
  const exercise = Math.max(0, input.plannedExerciseKcalPerDay ?? 0);
  const tdee = baseline + exercise;
  rationale.push(`BMR ${Math.round(bmr)} kcal (Mifflin–St Jeor${sex === "unspecified" ? ", sex-neutral midpoint" : ""})`);
  rationale.push(`× ${LIFESTYLE_FACTORS[activityLevel].factor} lifestyle factor = ${Math.round(baseline)} kcal baseline`);
  if (exercise) rationale.push(`+ ${Math.round(exercise)} kcal/day average planned exercise`);

  const g = GOAL_ENERGY[goal];
  let adjustment = tdee * g.pct;
  adjustment = g.capKcal < 0 ? Math.max(adjustment, g.capKcal) : Math.min(adjustment, g.capKcal);
  // Lean users shouldn't run aggressive deficits.
  if (adjustment < 0 && bmiValue < 20) {
    adjustment = Math.max(adjustment, -250);
    rationale.push("BMI below 20: deficit limited to 250 kcal");
  }
  let calories = tdee + adjustment;
  const floor = Math.max(bmr, sex === "male" ? 1500 : 1200);
  if (calories < floor) {
    rationale.push(`Raised to safety floor of ${Math.round(floor)} kcal (not below BMR / minimum intake)`);
    calories = floor;
  }
  rationale.push(g.note);

  // Protein reference weight: for BMI ≥ 30 use the weight at BMI 25 (avoids excessive targets).
  const refWeight = bmiValue >= 30 ? 25 * (heightCm / 100) ** 2 : weightKg;
  const proteinG = Math.round(PROTEIN_PER_KG[goal] * refWeight);
  rationale.push(`Protein ${PROTEIN_PER_KG[goal]} g/kg × ${Math.round(refWeight)} kg${bmiValue >= 30 ? " (adjusted weight)" : ""}`);

  const fatG = Math.round(Math.max((calories * 0.27) / 9, 0.6 * weightKg));
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  const fibreG = Math.round(Math.min(Math.max((calories / 1000) * 14, 25), 40));
  const waterMl = Math.round((weightKg * 35) / 50) * 50;
  rationale.push(`Fat ≈27% of energy (≥0.6 g/kg), carbs fill the remainder; fibre 14 g/1000 kcal (25–40 g)`);
  rationale.push(`Water ≈35 ml/kg from all fluids — more in heat or with heavy sweating`);

  return {
    bmi: bmiValue,
    bmiCategory: bmiCategory(bmiValue),
    bmr,
    baseline,
    tdee,
    calories: Math.round(calories / 10) * 10,
    proteinG,
    carbsG,
    fatG,
    fibreG,
    waterMl,
    energyAdjustment: Math.round(calories - tdee),
    rationale,
    method: "mifflin-st-jeor + lifestyle factor (exercise logged separately)",
  };
}
