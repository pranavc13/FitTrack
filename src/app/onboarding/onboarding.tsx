"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Chip, Field, Input, Notice, NumberInput, Segmented, Select } from "@/components/ui/primitives";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

const GOALS = [
  { value: "fat_loss", label: "Fat loss", hint: "Lose fat, keep muscle" },
  { value: "weight_loss", label: "Weight loss", hint: "Lower body weight steadily" },
  { value: "visible_abs", label: "Visible abs", hint: "Lean down + core strength" },
  { value: "belly_fat_reduction", label: "Belly fat", hint: "Via overall fat loss" },
  { value: "muscle_gain", label: "Muscle gain", hint: "Lean bulk + progressive overload" },
  { value: "recomposition", label: "Recomposition", hint: "Lose fat & build muscle" },
  { value: "strength", label: "Strength", hint: "Lift heavier" },
  { value: "endurance", label: "Endurance", hint: "Run/cycle further" },
  { value: "general_fitness", label: "General fitness", hint: "Feel fitter overall" },
  { value: "maintenance", label: "Maintain weight", hint: "Hold steady" },
] as const;

const ACTIVITY = [
  { value: "sedentary", label: "Sedentary", hint: "Desk job, < 4k steps" },
  { value: "light", label: "Lightly active", hint: "Some walking, chores" },
  { value: "moderate", label: "Moderately active", hint: "On feet part of the day" },
  { value: "active", label: "Active", hint: "On feet most of the day" },
  { value: "very_active", label: "Very active", hint: "Physical labour" },
] as const;

const DIETS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "non_vegetarian", label: "Non-veg" },
  { value: "vegan", label: "Vegan" },
  { value: "jain", label: "Jain" },
  { value: "pescatarian", label: "Pescatarian" },
] as const;

const ALLERGENS = ["Milk / dairy", "Lactose", "Gluten", "Peanut", "Tree nuts", "Soy", "Egg", "Fish", "Shellfish", "Sesame"];
const EQUIPMENT = ["Dumbbells", "Barbell", "Kettlebell", "Resistance bands", "Pull-up bar", "Bench", "Machines", "Treadmill", "Cycle", "Skipping rope", "Yoga mat"];

interface State {
  dateOfBirth: string;
  sex: "male" | "female" | "unspecified";
  heightCm: string;
  currentWeightKg: string;
  targetWeightKg: string;
  activityLevel: string;
  sleepHours: string;
  lifestyle: string;
  dietPreference: string;
  allergies: string[];
  intolerances: string;
  primaryGoal: string;
  trainingExperience: string;
  trainingLocation: string;
  equipment: string[];
  workoutDaysPerWeek: number;
  workoutMinutes: number;
}

const STEPS = ["About you", "Lifestyle", "Food", "Goal", "Training", "Your plan"];

export function Onboarding({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ targets: Record<string, unknown> & { computed: Record<string, unknown> } } | null>(null);
  const [s, set] = useState<State>({
    dateOfBirth: "",
    sex: "unspecified",
    heightCm: "",
    currentWeightKg: "",
    targetWeightKg: "",
    activityLevel: "light",
    sleepHours: "7",
    lifestyle: "",
    dietPreference: "vegetarian",
    allergies: [],
    intolerances: "",
    primaryGoal: "fat_loss",
    trainingExperience: "beginner",
    trainingLocation: "both",
    equipment: [],
    workoutDaysPerWeek: 3,
    workoutMinutes: 45,
  });
  const upd = <K extends keyof State>(k: K, v: State[K]) => set((p) => ({ ...p, [k]: v }));
  const toggle = (k: "allergies" | "equipment", v: string) => set((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  const age = s.dateOfBirth ? Math.floor((Date.now() - Date.parse(s.dateOfBirth)) / (365.25 * 86400000)) : null;
  const valid = [
    Boolean(s.dateOfBirth && age && age >= 13 && age <= 100 && Number(s.heightCm) >= 100 && Number(s.heightCm) <= 250 && Number(s.currentWeightKg) >= 25 && Number(s.currentWeightKg) <= 350),
    true,
    true,
    Boolean(s.primaryGoal),
    true,
    true,
  ];

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.put<{ targets: State & { computed: Record<string, unknown> } }>("/profile", {
        dateOfBirth: s.dateOfBirth,
        sex: s.sex,
        heightCm: Number(s.heightCm),
        currentWeightKg: Number(s.currentWeightKg),
        targetWeightKg: s.targetWeightKg ? Number(s.targetWeightKg) : null,
        activityLevel: s.activityLevel,
        sleepHours: Number(s.sleepHours) || null,
        lifestyle: s.lifestyle || null,
        dietPreference: s.dietPreference,
        allergies: s.allergies,
        intolerances: s.intolerances.split(",").map((x) => x.trim()).filter(Boolean),
        primaryGoal: s.primaryGoal,
        trainingExperience: s.trainingExperience,
        trainingLocation: s.trainingLocation,
        equipment: s.equipment,
        workoutDaysPerWeek: s.workoutDaysPerWeek,
        workoutMinutes: s.workoutMinutes,
        completeOnboarding: true,
      });
      await api.post("/goals", { type: s.primaryGoal, targetWeightKg: s.targetWeightKg ? Number(s.targetWeightKg) : null }).catch(() => null);
      const bundle = await api.get<{ targets: Record<string, unknown> & { computed: Record<string, unknown> } }>("/profile");
      setResult({ targets: bundle.targets ?? (res.targets as never) });
      setStep(5);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-8 pt-[calc(env(safe-area-inset-top)+20px)]">
      <div className="mb-6">
        <div className="mb-3 flex gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-lime" : "bg-surface-3")} />
          ))}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
        <h1 className="mt-1 font-display text-2xl font-bold">{step === 0 ? `Hi ${name.split(" ")[0]} 👋 Let's set you up` : step === 5 ? "Your personalised targets" : STEPS[step]}</h1>
      </div>

      <div className="flex-1 space-y-5">
        {step === 0 && (
          <>
            <Field label="Date of birth">
              <Input type="date" value={s.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => upd("dateOfBirth", e.target.value)} />
            </Field>
            <Field label="Sex (optional)" hint="Used only for the metabolic-rate formula. 'Prefer not to say' uses a neutral midpoint.">
              <Segmented value={s.sex} onChange={(v) => upd("sex", v)} options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "unspecified", label: "Skip" }]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height">
                <NumberInput suffix="cm" value={s.heightCm} onChange={(e) => upd("heightCm", e.target.value)} placeholder="170" />
              </Field>
              <Field label="Current weight">
                <NumberInput suffix="kg" value={s.currentWeightKg} onChange={(e) => upd("currentWeightKg", e.target.value)} placeholder="72" />
              </Field>
            </div>
            <Field label="Target weight (optional)">
              <NumberInput suffix="kg" value={s.targetWeightKg} onChange={(e) => upd("targetWeightKg", e.target.value)} placeholder="65" />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted">Daily activity outside workouts</p>
              {ACTIVITY.map((a) => (
                <button key={a.value} type="button" onClick={() => upd("activityLevel", a.value)} className={cn("flex w-full items-center justify-between rounded-2xl border p-4 text-left", s.activityLevel === a.value ? "border-lime bg-lime/10" : "border-line bg-surface")}>
                  <span>
                    <span className="block font-semibold">{a.label}</span>
                    <span className="text-sm text-muted">{a.hint}</span>
                  </span>
                  {s.activityLevel === a.value ? <Check className="h-5 w-5 text-lime" /> : null}
                </button>
              ))}
            </div>
            <Field label="Average sleep">
              <NumberInput suffix="hours" value={s.sleepHours} onChange={(e) => upd("sleepHours", e.target.value)} />
            </Field>
            <Field label="Anything about your routine? (optional)">
              <Input value={s.lifestyle} onChange={(e) => upd("lifestyle", e.target.value)} placeholder="e.g. night shifts, long commute" maxLength={300} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Diet preference">
              <div className="flex flex-wrap gap-2">
                {DIETS.map((d) => (
                  <Chip key={d.value} active={s.dietPreference === d.value} onClick={() => upd("dietPreference", d.value)}>
                    {d.label}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Food allergies" hint="Recipes and suggestions containing these are filtered out.">
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((a) => (
                  <Chip key={a} active={s.allergies.includes(a)} onClick={() => toggle("allergies", a)}>
                    {a}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Intolerances / foods you avoid (comma separated)">
              <Input value={s.intolerances} onChange={(e) => upd("intolerances", e.target.value)} placeholder="e.g. brinjal, mushroom" />
            </Field>
          </>
        )}

        {step === 3 && (
          <div className="grid grid-cols-2 gap-2.5">
            {GOALS.map((g) => (
              <button key={g.value} type="button" onClick={() => upd("primaryGoal", g.value)} className={cn("rounded-2xl border p-3.5 text-left", s.primaryGoal === g.value ? "border-lime bg-lime/10" : "border-line bg-surface")}>
                <span className="block font-semibold">{g.label}</span>
                <span className="text-xs text-muted">{g.hint}</span>
              </button>
            ))}
            {s.primaryGoal === "belly_fat_reduction" || s.primaryGoal === "visible_abs" ? (
              <div className="col-span-2">
                <Notice>Fat can&apos;t be lost from one spot by exercising it. Belly fat and ab visibility improve through overall fat loss, with core training for strength.</Notice>
              </div>
            ) : null}
          </div>
        )}

        {step === 4 && (
          <>
            <Field label="Training experience">
              <Segmented value={s.trainingExperience} onChange={(v) => upd("trainingExperience", v)} options={[{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "advanced", label: "Advanced" }]} />
            </Field>
            <Field label="Where do you train?">
              <Segmented value={s.trainingLocation} onChange={(v) => upd("trainingLocation", v)} options={[{ value: "gym", label: "Gym" }, { value: "home", label: "Home" }, { value: "both", label: "Both" }]} />
            </Field>
            <Field label="Equipment available">
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT.map((e) => (
                  <Chip key={e} active={s.equipment.includes(e)} onClick={() => toggle("equipment", e)}>
                    {e}
                  </Chip>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Days per week">
                <Select value={s.workoutDaysPerWeek} onChange={(e) => upd("workoutDaysPerWeek", Number(e.target.value))}>
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Minutes per session">
                <Select value={s.workoutMinutes} onChange={(e) => upd("workoutMinutes", Number(e.target.value))}>
                  {[20, 30, 45, 60, 75, 90].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </>
        )}

        {step === 5 && result && <TargetsSummary targets={result.targets} />}
        {error ? <p role="alert" className="rounded-xl bg-red/10 px-3 py-2 text-sm text-red">{error}</p> : null}
      </div>

      <div className="sticky bottom-0 mt-6 flex gap-3 bg-gradient-to-t from-bg via-bg pt-4 safe-bottom">
        {step > 0 && step < 5 ? (
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : null}
        {step < 4 ? (
          <Button size="lg" className="flex-1" disabled={!valid[step]} onClick={() => setStep(step + 1)}>
            Continue <ArrowRight className="h-5 w-5" />
          </Button>
        ) : step === 4 ? (
          <Button size="lg" className="flex-1" loading={saving} onClick={finish}>
            Calculate my plan
          </Button>
        ) : (
          <Button size="lg" className="flex-1" onClick={() => router.replace("/home")}>
            Start tracking <ArrowRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </main>
  );
}

function TargetsSummary({ targets }: { targets: Record<string, unknown> & { computed: Record<string, unknown> } }) {
  const c = targets.computed as { bmi: number; bmiCategory: { who: string; asian: string }; bmr: number; baseline: number; tdee: number; rationale: string[] };
  const rows = [
    ["Calories", `${targets.calories} kcal`, "text-lime"],
    ["Protein", `${targets.proteinG} g`, "text-blue"],
    ["Carbs", `${targets.carbsG} g`, "text-orange"],
    ["Fat", `${targets.fatG} g`, "text-purple"],
    ["Fibre", `${targets.fibreG} g`, "text-cyan"],
    ["Water", `${((targets.waterMl as number) / 1000).toFixed(1)} L`, "text-cyan"],
  ];
  return (
    <div className="space-y-4">
      <Card className="card-gradient grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-muted">BMI</p>
          <p className="font-display text-xl font-bold tabular">{c.bmi.toFixed(1)}</p>
          <p className="text-[11px] text-faint">{c.bmiCategory.asian} (Asian cut-offs)</p>
        </div>
        <div>
          <p className="text-xs text-muted">BMR</p>
          <p className="font-display text-xl font-bold tabular">{c.bmr}</p>
          <p className="text-[11px] text-faint">kcal at rest</p>
        </div>
        <div>
          <p className="text-xs text-muted">Maintenance</p>
          <p className="font-display text-xl font-bold tabular">{c.tdee}</p>
          <p className="text-[11px] text-faint">kcal/day (TDEE)</p>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-2.5">
        {rows.map(([label, value, tone]) => (
          <Card key={label} className="p-3 text-center">
            <p className="text-xs text-muted">{label}</p>
            <p className={cn("font-display text-lg font-bold tabular", tone)}>{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <p className="mb-2 text-sm font-semibold">How we calculated this</p>
        <ul className="space-y-1.5 text-sm text-muted">
          {c.rationale.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
              {r}
            </li>
          ))}
        </ul>
      </Card>
      <Notice>These are estimates from standard formulas. After 2–4 weeks of logging, the app can refine your maintenance from your real intake and weight trend. You can edit targets anytime in Profile.</Notice>
    </div>
  );
}
