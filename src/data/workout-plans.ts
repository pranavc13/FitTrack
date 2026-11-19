/** Workout plan templates; exercise slugs reference src/data/exercises.ts. */
export interface PlanDay {
  day: string;
  focus: string;
  exercises: { slug: string; sets: number; reps: string; restSec: number }[];
}
export interface PlanTemplate {
  key: string;
  name: string;
  description: string;
  daysPerWeek: number;
  level: "beginner" | "intermediate" | "advanced";
  location: "gym" | "home";
  goals: string[];
  days: PlanDay[];
}

const e = (slug: string, sets: number, reps: string, restSec = 90) => ({ slug, sets, reps, restSec });

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    key: "full-body-beginner", name: "Full body — beginner (3×/week)", daysPerWeek: 3, level: "beginner", location: "gym",
    description: "Three full-body sessions with the main movement patterns. Add weight when you hit the top of the rep range on all sets.",
    goals: ["fat_loss", "general_fitness", "recomposition", "weight_loss", "belly_fat_reduction", "visible_abs"],
    days: [
      { day: "A", focus: "Squat + push + pull", exercises: [e("goblet-squat", 3, "10-12"), e("dumbbell-bench-press", 3, "8-12"), e("lat-pulldown", 3, "10-12"), e("romanian-deadlift", 3, "10"), e("plank", 3, "30-45 s", 45)] },
      { day: "B", focus: "Hinge + press + row", exercises: [e("leg-press", 3, "10-12"), e("dumbbell-shoulder-press", 3, "8-12"), e("seated-cable-row", 3, "10-12"), e("walking-lunge", 2, "10 each"), e("dead-bug", 3, "10 each", 45)] },
      { day: "C", focus: "Full body", exercises: [e("goblet-squat", 3, "12"), e("incline-dumbbell-press", 3, "10"), e("dumbbell-row", 3, "10 each"), e("glute-bridge", 3, "15"), e("side-plank", 2, "30 s each", 45)] },
    ],
  },
  {
    key: "home-bodyweight", name: "Home bodyweight (3×/week)", daysPerWeek: 3, level: "beginner", location: "home",
    description: "No equipment needed. Progress by adding reps, slowing tempo, then moving to harder variations (incline → regular → decline push-ups).",
    goals: ["fat_loss", "general_fitness", "weight_loss", "belly_fat_reduction", "visible_abs", "endurance"],
    days: [
      { day: "A", focus: "Upper + core", exercises: [e("push-up", 3, "AMRAP-2", 60), e("inverted-row", 3, "8-12", 60), e("pike-push-up", 3, "6-10", 60), e("bench-dip", 3, "10-15", 60), e("plank", 3, "45 s", 45)] },
      { day: "B", focus: "Lower + conditioning", exercises: [e("bodyweight-squat", 4, "20", 45), e("walking-lunge", 3, "12 each", 60), e("glute-bridge", 3, "20", 45), e("calf-raise", 3, "20", 45), e("mountain-climber", 3, "40 s", 30)] },
      { day: "C", focus: "Full body circuit", exercises: [e("burpee", 4, "10", 45), e("jump-squat", 3, "12", 60), e("diamond-push-up", 3, "8-12", 60), e("lying-leg-raise", 3, "12", 45), e("surya-namaskar", 1, "8 rounds", 30)] },
    ],
  },
  {
    key: "upper-lower", name: "Upper / Lower (4×/week)", daysPerWeek: 4, level: "intermediate", location: "gym",
    description: "Each muscle trained twice weekly — a strong default for muscle gain and recomposition.",
    goals: ["muscle_gain", "recomposition", "strength", "visible_abs"],
    days: [
      { day: "Upper 1", focus: "Strength emphasis", exercises: [e("barbell-bench-press", 4, "6-8", 150), e("barbell-row", 4, "6-8", 120), e("overhead-press", 3, "6-8", 120), e("pull-up", 3, "6-10", 120), e("barbell-curl", 2, "10-12", 60), e("triceps-pushdown", 2, "10-12", 60)] },
      { day: "Lower 1", focus: "Squat emphasis", exercises: [e("back-squat", 4, "5-8", 180), e("romanian-deadlift", 3, "8-10", 120), e("leg-press", 3, "10-12", 90), e("leg-curl", 3, "12", 60), e("calf-raise", 4, "12-15", 45), e("hanging-leg-raise", 3, "10", 60)] },
      { day: "Upper 2", focus: "Hypertrophy emphasis", exercises: [e("incline-dumbbell-press", 4, "8-12"), e("lat-pulldown", 4, "10-12"), e("dumbbell-shoulder-press", 3, "10-12"), e("seated-cable-row", 3, "10-12"), e("lateral-raise", 3, "12-15", 60), e("hammer-curl", 3, "12", 60), e("overhead-triceps-extension", 3, "12", 60)] },
      { day: "Lower 2", focus: "Hinge emphasis", exercises: [e("deadlift", 3, "4-6", 180), e("bulgarian-split-squat", 3, "8-10 each"), e("hip-thrust", 3, "10-12"), e("leg-extension", 3, "12-15", 60), e("seated-calf-raise", 3, "15", 45), e("cable-crunch", 3, "12", 60)] },
    ],
  },
  {
    key: "ppl", name: "Push / Pull / Legs (6×/week, or 3× rotating)", daysPerWeek: 6, level: "intermediate", location: "gym",
    description: "Classic hypertrophy split. Run it twice per week if recovery allows, or once through for 3 days.",
    goals: ["muscle_gain", "strength", "recomposition"],
    days: [
      { day: "Push", focus: "Chest, shoulders, triceps", exercises: [e("barbell-bench-press", 4, "6-10", 150), e("overhead-press", 3, "8-10", 120), e("incline-dumbbell-press", 3, "10-12"), e("lateral-raise", 4, "12-15", 60), e("triceps-pushdown", 3, "10-15", 60), e("dips", 2, "AMRAP", 90)] },
      { day: "Pull", focus: "Back, biceps", exercises: [e("deadlift", 3, "4-6", 180), e("pull-up", 4, "6-10", 120), e("barbell-row", 3, "8-10", 120), e("face-pull", 3, "15", 60), e("barbell-curl", 3, "10-12", 60), e("hammer-curl", 2, "12", 60)] },
      { day: "Legs", focus: "Quads, hamstrings, glutes, calves", exercises: [e("back-squat", 4, "6-10", 180), e("romanian-deadlift", 3, "8-10", 120), e("leg-press", 3, "12"), e("leg-curl", 3, "12", 60), e("calf-raise", 4, "15", 45), e("hanging-leg-raise", 3, "10-12", 60)] },
    ],
  },
  {
    key: "bro-split", name: "Body-part split (5×/week)", daysPerWeek: 5, level: "advanced", location: "gym",
    description: "One muscle group per day, high per-session volume. Best for experienced lifters who enjoy longer sessions.",
    goals: ["muscle_gain"],
    days: [
      { day: "Chest", focus: "Chest", exercises: [e("barbell-bench-press", 4, "6-10", 150), e("incline-dumbbell-press", 4, "8-12"), e("dips", 3, "8-12"), e("cable-fly", 3, "12-15", 60)] },
      { day: "Back", focus: "Back", exercises: [e("deadlift", 3, "5", 180), e("pull-up", 4, "6-10", 120), e("barbell-row", 4, "8-10"), e("seated-cable-row", 3, "12")] },
      { day: "Shoulders", focus: "Shoulders", exercises: [e("overhead-press", 4, "6-8", 150), e("lateral-raise", 4, "12-15", 60), e("reverse-fly", 3, "15", 60), e("face-pull", 3, "15", 60)] },
      { day: "Legs", focus: "Legs", exercises: [e("back-squat", 4, "6-10", 180), e("leg-press", 4, "10-12"), e("romanian-deadlift", 3, "10"), e("leg-curl", 3, "12", 60), e("calf-raise", 4, "15", 45)] },
      { day: "Arms + abs", focus: "Biceps, triceps, abs", exercises: [e("close-grip-bench", 3, "8-10"), e("barbell-curl", 3, "10"), e("overhead-triceps-extension", 3, "12", 60), e("hammer-curl", 3, "12", 60), e("hanging-leg-raise", 3, "12", 60), e("cable-crunch", 3, "15", 60)] },
    ],
  },
  {
    key: "strength-5x5", name: "Strength foundation (3×/week)", daysPerWeek: 3, level: "intermediate", location: "gym",
    description: "Low-rep compound lifts with linear progression (+2.5 kg upper / +5 kg lower when all sets are completed).",
    goals: ["strength", "muscle_gain"],
    days: [
      { day: "A", focus: "Squat / bench / row", exercises: [e("back-squat", 5, "5", 180), e("barbell-bench-press", 5, "5", 180), e("barbell-row", 5, "5", 150)] },
      { day: "B", focus: "Squat / press / deadlift", exercises: [e("back-squat", 5, "5", 180), e("overhead-press", 5, "5", 180), e("deadlift", 1, "5", 180), e("pull-up", 3, "AMRAP", 120)] },
    ],
  },
];
