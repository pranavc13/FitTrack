/**
 * Daily Google Fit journal: compares what the tracker says you burned with what you ate, against
 * the energy/protein/fibre a chosen goal needs, and turns the gap into concrete next steps.
 *
 * Energy model:
 *   Google Fit "Calories burned" is the day's TOTAL so far — it already includes resting energy (BMR),
 *   not just exercise. Entered mid-day, the rest of today's resting burn is still to come, so
 *   today's maintenance ≈ Fit calories + BMR × (fraction of the day remaining).
 *   Without a Fit calorie figure we estimate: BMR × 1.2 (resting + daily living) + net walking kcal
 *   from the distance (or steps × stride).
 * Walking/jogging suggestions use net kcal ((MET − 1) × 3.5 × kg ÷ 200 per minute), so resting energy
 * isn't counted twice. All figures are estimates (trackers and MET values are typically ±10–25%).
 */
import { metFromSpeed, netKcal } from "@/lib/activity/met";
import { GOAL_ENERGY, type GoalType, type Sex } from "./targets";

export interface FitDayInput {
  steps: number | null;
  heartPoints: number | null;
  moveMinutes: number | null;
  distanceKm: number | null;
  caloriesBurned: number | null;
  avgHeartRate: number | null;
  goal: GoalType;
  /** 0–1 share of the local day that had passed when the numbers were read (1 = full day). */
  dayFraction: number;
}

export interface FitPerson {
  weightKg: number;
  heightCm: number;
  bmr: number;
  sex: Sex;
  dietPreference: string;
  stepGoal: number;
  /** The user's saved daily targets (personal, possibly custom). */
  proteinTargetG: number;
  fibreTargetG: number;
}

export interface FitIntake {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  sugarG: number;
  entries: number;
}

export type Status = "good" | "close" | "low" | "high";

export interface FitAction {
  kind: "move" | "eat" | "hold" | "info";
  title: string;
  detail: string;
}

/** Google Fit's Heart Points goal follows the WHO/AHA 150 moderate minutes per week ≈ 22 a day. */
export const HEART_POINTS_DAILY = 22;
/** Brisk walking pace used for suggestions (km/h) and an easy jog. */
const BRISK_KMH = 5.6;
const JOG_KMH = 8;

const FAT_LOSS_GOALS = new Set<GoalType>(["weight_loss", "fat_loss", "belly_fat_reduction", "visible_abs", "recomposition"]);
const GAIN_GOALS = new Set<GoalType>(["muscle_gain", "strength"]);

export const GOAL_LABEL: Record<GoalType, string> = {
  belly_fat_reduction: "Lose belly fat",
  visible_abs: "Get visible abs",
  fat_loss: "Fat loss",
  weight_loss: "Weight loss",
  recomposition: "Recomposition",
  muscle_gain: "Muscle gain",
  strength: "Strength",
  endurance: "Endurance",
  general_fitness: "General fitness",
  maintenance: "Maintain weight",
};

/** Stride ≈ 0.415 × height (walking); used only when no distance was entered. */
export function distanceFromSteps(steps: number, heightCm: number) {
  return (steps * heightCm * 0.415) / 100_000;
}

export function estimateMaintenance(input: FitDayInput, p: FitPerson) {
  const frac = Math.min(1, Math.max(0, input.dayFraction));
  const remainingResting = p.bmr * (1 - frac);
  if (input.caloriesBurned && input.caloriesBurned > 0) {
    const kcal = Math.round(input.caloriesBurned + remainingResting);
    const low = frac >= 0.5 && kcal < p.bmr * 1.05;
    return {
      kcal,
      soFar: input.caloriesBurned,
      remainingResting: Math.round(remainingResting),
      source: "google_fit" as const,
      explanation:
        (frac >= 1
          ? `Google Fit total for the day (${input.caloriesBurned} kcal, includes your resting burn).`
          : `Google Fit so far (${input.caloriesBurned} kcal, includes resting burn) + ~${Math.round(remainingResting)} kcal resting burn still to come today.`) +
        (low ? ` ⚠ This is about your resting burn alone (BMR ~${Math.round(p.bmr)} kcal) — check Google Fit → Profile has your correct height and weight.` : ""),
    };
  }
  const km = input.distanceKm ?? (input.steps ? distanceFromSteps(input.steps, p.heightCm) : 0);
  const walkMin = (km / 4.8) * 60;
  const walking = walkMin > 0 ? netKcal(metFromSpeed("walk", 4.8), p.weightKg, Math.min(walkMin, 1440)) : 0;
  const kcal = Math.round(p.bmr * 1.2 + walking);
  return {
    kcal,
    soFar: Math.round(p.bmr * 1.2 * frac + walking),
    remainingResting: Math.round(p.bmr * 1.2 * (1 - frac)),
    source: "estimate" as const,
    explanation: `Estimated: BMR ${Math.round(p.bmr)} × 1.2 for daily living + ~${Math.round(walking)} kcal from ${km.toFixed(1)} km walking. Enter Google Fit's calories for a better number.`,
  };
}

/** Goal calories for today = today's maintenance ± the goal's deficit/surplus (same rules as your targets). */
export function goalCalories(maintenance: number, goal: GoalType, p: FitPerson) {
  const g = GOAL_ENERGY[goal];
  let adj = maintenance * g.pct;
  adj = g.capKcal < 0 ? Math.max(adj, g.capKcal) : Math.min(adj, g.capKcal);
  const bmi = p.weightKg / (p.heightCm / 100) ** 2;
  if (adj < 0 && bmi < 20) adj = Math.max(adj, -250);
  const floor = Math.max(p.bmr, p.sex === "male" ? 1500 : 1200);
  let kcal = Math.max(Math.round((maintenance + adj) / 10) * 10, Math.round(floor));
  // A deficit goal never becomes a surplus just because the floor sits above a low maintenance figure.
  if (adj < 0) kcal = Math.min(kcal, Math.round(maintenance));
  return { kcal, adjustment: kcal - maintenance, note: g.note };
}

/** Minutes of an activity needed to burn `kcal` net. */
export function minutesToBurn(kcal: number, kmh: number, kind: "walk" | "run", weightKg: number) {
  const perMin = netKcal(metFromSpeed(kind, kmh), weightKg, 1);
  return Math.ceil(kcal / perMin / 5) * 5;
}

interface FoodIdea {
  name: string;
  serving: string;
  proteinG: number;
  fibreG: number;
  kcal: number;
  diets: string[];
}

const VEG = ["vegetarian", "eggetarian", "non_vegetarian", "pescatarian", "jain"];
const ALL = [...VEG, "vegan"];
const EGG = ["eggetarian", "non_vegetarian", "pescatarian"];
/** Typical servings, nutrient values from USDA FoodData Central (rounded). */
const FOODS: FoodIdea[] = [
  { name: "Paneer bhurji / tikka", serving: "100 g paneer", proteinG: 18, fibreG: 0, kcal: 290, diets: VEG },
  { name: "Hung curd / Greek yogurt", serving: "200 g", proteinG: 20, fibreG: 0, kcal: 120, diets: VEG },
  { name: "Whey protein", serving: "1 scoop (30 g)", proteinG: 24, fibreG: 0, kcal: 120, diets: VEG },
  { name: "Soya chunks curry", serving: "30 g dry", proteinG: 16, fibreG: 4, kcal: 105, diets: ALL },
  { name: "Moong dal chilla", serving: "2 (60 g dal)", proteinG: 14, fibreG: 5, kcal: 260, diets: ALL },
  { name: "Tofu stir-fry", serving: "100 g", proteinG: 15, fibreG: 1, kcal: 145, diets: ALL },
  { name: "Chana / rajma", serving: "1 katori cooked (150 g)", proteinG: 13, fibreG: 10, kcal: 220, diets: ALL },
  { name: "Roasted chana", serving: "40 g", proteinG: 8, fibreG: 6, kcal: 150, diets: ALL },
  { name: "Boiled eggs", serving: "2 large", proteinG: 13, fibreG: 0, kcal: 145, diets: EGG },
  { name: "Egg whites", serving: "4 whites", proteinG: 14, fibreG: 0, kcal: 70, diets: EGG },
  { name: "Grilled chicken breast", serving: "100 g cooked", proteinG: 31, fibreG: 0, kcal: 165, diets: ["non_vegetarian"] },
  { name: "Fish curry (rohu / surmai)", serving: "100 g fish", proteinG: 21, fibreG: 0, kcal: 130, diets: ["non_vegetarian", "pescatarian"] },
  { name: "Guava", serving: "1 medium", proteinG: 2.5, fibreG: 5.4, kcal: 70, diets: ALL },
  { name: "Pear", serving: "1 medium", proteinG: 0.6, fibreG: 5.5, kcal: 100, diets: ALL },
  { name: "Isabgol (psyllium) in water", serving: "1 tbsp (5 g)", proteinG: 0, fibreG: 3.5, kcal: 18, diets: ALL },
  { name: "Oats", serving: "40 g dry", proteinG: 5, fibreG: 4, kcal: 155, diets: ALL },
  { name: "Flaxseed (alsi)", serving: "1 tbsp (10 g)", proteinG: 1.8, fibreG: 2.7, kcal: 55, diets: ALL },
  { name: "Big salad (cucumber, carrot, tomato, sprouts)", serving: "1 bowl", proteinG: 4, fibreG: 4, kcal: 80, diets: ALL },
];

function pickFoods(diet: string, by: "proteinG" | "fibreG", gap: number, kcalRoom: number) {
  const ok = FOODS.filter((f) => f.diets.includes(diet) && f[by] >= (by === "proteinG" ? 8 : 2.5));
  // Prefer the most of the nutrient per kcal when calories are tight.
  ok.sort((a, b) => (kcalRoom < 300 ? b[by] / b.kcal - a[by] / a.kcal : b[by] - a[by]));
  const out: FoodIdea[] = [];
  let covered = 0;
  for (const f of ok) {
    if (covered >= gap || out.length >= 3) break;
    out.push(f);
    covered += f[by];
  }
  return out;
}

const status = (value: number, target: number, higherIsBetter = true, tol = 0.1): Status => {
  if (!target) return "good";
  const r = value / target;
  if (higherIsBetter) return r >= 1 ? "good" : r >= 1 - tol ? "close" : "low";
  return r <= 1 ? "good" : r <= 1 + tol ? "close" : "high";
};

export function analyzeFitDay(input: FitDayInput, p: FitPerson, intake: FitIntake) {
  const goal = input.goal;
  const cutting = FAT_LOSS_GOALS.has(goal);
  const gaining = GAIN_GOALS.has(goal);
  const partial = input.dayFraction < 0.97;
  const m = estimateMaintenance(input, p);
  const target = goalCalories(m.kcal, goal, p);
  const balance = Math.round(intake.kcal - m.kcal);
  const overTarget = Math.round(intake.kcal - target.kcal);
  const steps = input.steps ?? 0;
  const hp = input.heartPoints ?? 0;
  const proteinGap = Math.max(0, Math.round(p.proteinTargetG - intake.proteinG));
  const fibreGap = Math.max(0, Math.round(p.fibreTargetG - intake.fibreG));

  const metrics = [
    { key: "calories", label: "Calories eaten", value: Math.round(intake.kcal), target: target.kcal, unit: "kcal", status: cutting ? status(intake.kcal, target.kcal, false, 0.05) : gaining ? status(intake.kcal, target.kcal, true, 0.05) : status(Math.abs(balance), 150, false) },
    { key: "protein", label: "Protein", value: Math.round(intake.proteinG), target: p.proteinTargetG, unit: "g", status: status(intake.proteinG, p.proteinTargetG) },
    { key: "fibre", label: "Fibre", value: Math.round(intake.fibreG), target: p.fibreTargetG, unit: "g", status: status(intake.fibreG, p.fibreTargetG) },
    { key: "steps", label: "Steps", value: steps, target: p.stepGoal, unit: "", status: status(steps, p.stepGoal) },
    { key: "heart", label: "Heart Points", value: hp, target: HEART_POINTS_DAILY, unit: "pts", status: status(hp, HEART_POINTS_DAILY, true, 0.25) },
  ];

  // "You did / you ate / you should have" summary.
  const summary: string[] = [];
  const did = [steps ? `${steps.toLocaleString("en-IN")} steps` : null, input.distanceKm ? `${input.distanceKm} km` : null, hp ? `${hp} Heart Points` : null, input.moveMinutes ? `${input.moveMinutes} Move Minutes` : null].filter(Boolean);
  summary.push(did.length ? `You did ${did.join(", ")}${input.caloriesBurned ? ` and burned ${input.caloriesBurned} kcal (Google Fit, incl. resting)` : ""}.` : "No activity numbers entered yet.");
  summary.push(`Your maintenance for today is ~${m.kcal} kcal. You've eaten ${Math.round(intake.kcal)} kcal${intake.entries ? "" : " (nothing logged in the food diary yet)"}, ${Math.round(intake.proteinG)} g protein and ${Math.round(intake.fibreG)} g fibre.`);
  summary.push(
    `For “${GOAL_LABEL[goal]}” you should be around ${target.kcal} kcal (${target.adjustment === 0 ? "maintenance" : `${target.adjustment > 0 ? "+" : ""}${target.adjustment} kcal vs maintenance`}), ${p.proteinTargetG} g protein and ${p.fibreTargetG} g fibre.`,
  );
  summary.push(
    balance <= 0
      ? `Right now you're in a ${Math.abs(balance)} kcal deficit${partial ? " (so far — the day isn't over)" : ""}.`
      : `Right now you're in a ${balance} kcal surplus${partial ? " (so far)" : ""}.`,
  );

  const actions: FitAction[] = [];
  const walkFor = (kcal: number) => minutesToBurn(kcal, BRISK_KMH, "walk", p.weightKg);
  const jogFor = (kcal: number) => minutesToBurn(kcal, JOG_KMH, "run", p.weightKg);
  const walkNet = Math.round(netKcal(metFromSpeed("walk", BRISK_KMH), p.weightKg, 40));

  if (cutting && overTarget > 50) {
    const w = walkFor(overTarget);
    actions.push({
      kind: "move",
      title: w > 75 ? `Burn ~${overTarget} kcal: ${Math.ceil(w / 2 / 5) * 5}-min brisk walk, twice` : `Go for a ${w}-min brisk walk`,
      detail: `You're ${overTarget} kcal over today's ${GOAL_LABEL[goal].toLowerCase()} target. A brisk walk (${BRISK_KMH} km/h) burns ~${Math.round(overTarget / w)} kcal/min for you; or jog ${jogFor(overTarget)} min at ${JOG_KMH} km/h. Don't “eat back” the deficit later tonight.`,
    });
  } else if (gaining && overTarget < -150) {
    actions.push({ kind: "eat", title: `Eat ~${-overTarget} kcal more today`, detail: `Muscle gain needs a small surplus. You're ${-overTarget} kcal below today's target — add a protein-rich meal or snack rather than extra cardio.` });
  } else if (cutting && partial && overTarget < 0) {
    actions.push({ kind: "hold", title: `~${-overTarget} kcal left for the rest of today`, detail: `Stay within this to keep the deficit. Build the remaining meals around protein and vegetables.` });
  } else if (cutting && !partial && overTarget <= 50) {
    actions.push({ kind: "hold", title: "Deficit day done ✔", detail: `You finished ${Math.abs(overTarget)} kcal ${overTarget <= 0 ? "under" : "over"} target — a consistent week of days like this is what reduces belly fat.` });
  }

  if (steps < p.stepGoal) {
    const left = p.stepGoal - steps;
    const min = Math.ceil((left / 110) / 5) * 5; // ~110 steps/min at a brisk pace
    if (!actions.some((a) => a.kind === "move")) actions.push({ kind: "move", title: `Walk ${min} more minutes (${left.toLocaleString("en-IN")} steps to goal)`, detail: `A ${min}-min brisk walk gets you to ${p.stepGoal.toLocaleString("en-IN")} steps and burns ~${Math.round(netKcal(metFromSpeed("walk", BRISK_KMH), p.weightKg, min))} kcal.` });
  }
  if (hp < HEART_POINTS_DAILY) {
    const need = HEART_POINTS_DAILY - hp;
    actions.push({ kind: "move", title: `Earn ${need} more Heart Points`, detail: `Brisk walking gives 1 point/min; jogging, skipping or cycling hard gives 2/min — so ${need} min brisk or ~${Math.ceil(need / 2)} min vigorous. A 40-min brisk walk (~${walkNet} kcal) covers it.` });
  }
  if (proteinGap > 5) {
    const foods = pickFoods(p.dietPreference, "proteinG", proteinGap, cutting ? Math.max(0, -overTarget) : 9999);
    actions.push({ kind: "eat", title: `Add ${proteinGap} g protein`, detail: foods.map((f) => `${f.name} — ${f.serving}: ${f.proteinG} g protein, ${f.kcal} kcal`).join(" · ") || "Add a protein source to your next meal." });
  }
  if (fibreGap > 3) {
    const foods = pickFoods(p.dietPreference, "fibreG", fibreGap, cutting ? Math.max(0, -overTarget) : 9999);
    actions.push({ kind: "eat", title: `Add ${fibreGap} g fibre`, detail: foods.map((f) => `${f.name} — ${f.serving}: ${f.fibreG} g fibre`).join(" · ") });
  }
  if (intake.sugarG > 50) actions.push({ kind: "info", title: `Sugar is high (${Math.round(intake.sugarG)} g)`, detail: "Sweet chai, mithai and juices add up fast. Each teaspoon of sugar is ~4 g / 16 kcal — try unsweetened chai and whole fruit instead of juice." });

  const advice: Record<string, string[]> = {
    belly_fat_reduction: ["Belly fat can't be spot-reduced — it goes with overall fat loss, so the daily deficit matters most.", "Strength-train 2–3×/week to keep muscle while you lose fat; sleep 7–9 h (short sleep raises hunger)."],
    visible_abs: ["Abs show at roughly 10–14% body fat (men) / 18–22% (women) — the deficit reveals them, core work builds them.", "Train abs 2–3×/week (hanging leg raises, cable crunches, planks) and keep protein near 2 g/kg."],
    fat_loss: ["Aim for ~0.5–0.75% of body weight lost per week; faster costs muscle.", "Keep protein high and lift weights to preserve muscle."],
    weight_loss: ["Weigh daily and watch the 7-day average, not single days — water swings 1–2 kg."],
    recomposition: ["Stay near maintenance with high protein and progressive strength training; judge by waist and strength, not just weight."],
    muscle_gain: ["Keep cardio moderate so it doesn't eat into your surplus; prioritise progressive overload."],
    strength: ["Recovery drives strength: hit protein, sleep, and don't turn rest days into big-burn days."],
  };

  return {
    goal,
    goalLabel: GOAL_LABEL[goal],
    partial,
    maintenance: m,
    target,
    intake,
    balance,
    overTarget,
    metrics,
    summary,
    actions,
    advice: advice[goal] ?? [],
  };
}

export type FitDayAnalysis = ReturnType<typeof analyzeFitDay>;
