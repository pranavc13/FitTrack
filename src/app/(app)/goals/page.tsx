"use client";

import { CheckCircle2, Circle, Dumbbell, Footprints, HeartPulse, Moon, Target, TrendingDown, Utensils } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, CardHeader, Chip, Field, Notice, NumberInput, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";
import { cn, fmt } from "@/lib/utils";

interface GoalPlan {
  label: string;
  summary: string;
  expectedRate: string;
  nutrition: { calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; waterMl: number; rationale: string[] };
  training: { templateKey: string; templateName: string; daysPerWeek: number; description: string };
  walking: { dailySteps: number };
  cardio: string;
  recovery: string[];
  sleepHours: number;
  notes: string[];
  disclaimer: string;
}
interface GoalsData {
  active: { goal: { id: number; type: string; startDate: string; startWeightKg: number | null; targetWeightKg: number | null; plan: GoalPlan }; milestones: { id: number; title: string; achievedAt: string | null }[]; currentWeightKg: number | null; progress: number | null } | null;
  info: Record<string, { label: string; summary: string }>;
}
interface WeightData {
  analysis: { plateau: { status: string; weeklyRateKg: number | null; message: string; readings: number }; prediction: { weeksLow: number | null; weeksHigh: number | null; basis: string } | null; current: number | null; target: number | null };
}

export default function GoalsPage() {
  const { data, mutate } = useApi<GoalsData>("/goals");
  const weight = useApi<WeightData>("/body/weight?days=90");
  const plans = useApi<{ templates: { key: string; name: string; description: string; daysPerWeek: number; level: string; location: string }[]; active: { templateKey: string } | null }>("/plans");
  const [editOpen, setEditOpen] = useState(false);
  const toast = useToast();

  if (!data) return <Skeleton className="h-96" />;
  const a = data.active;
  const p = a?.goal.plan;
  const an = weight.data?.analysis;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Goals</h1>
        <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>{a ? "Change goal" : "Set goal"}</Button>
      </div>

      {a && p ? (
        <>
          <Card glow className="card-gradient">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone="lime">{p.label}</Badge>
                <p className="mt-2 text-sm text-muted">{p.summary}</p>
              </div>
              <Target className="h-8 w-8 shrink-0 text-lime" />
            </div>
            {a.progress != null ? (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="tabular">{fmt.dec(a.goal.startWeightKg)} kg</span><span className="font-semibold tabular">{fmt.dec(a.currentWeightKg)} kg now</span><span className="tabular">{fmt.dec(a.goal.targetWeightKg)} kg</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-gradient-to-r from-lime to-cyan" style={{ width: `${Math.round(a.progress * 100)}%` }} /></div>
              </div>
            ) : null}
            <p className="mt-3 text-xs text-muted">Expected pace: {p.expectedRate}</p>
          </Card>

          {an ? (
            <Card>
              <CardHeader title="Progress analysis" subtitle="Based on your smoothed weight trend" icon={<TrendingDown className="h-5 w-5" />} />
              <p className={cn("text-sm", an.plateau.status === "plateau" ? "text-orange" : an.plateau.status === "progressing" ? "text-lime" : "text-muted")}>{an.plateau.message}</p>
              {an.prediction?.weeksLow != null ? (
                <p className="mt-2 text-sm">Estimated <b>{an.prediction.weeksLow}–{an.prediction.weeksHigh} weeks</b> to reach {an.target} kg at your current trend.</p>
              ) : an.prediction ? <p className="mt-2 text-xs text-muted">{an.prediction.basis}</p> : null}
              {an.plateau.status === "plateau" ? <p className="mt-2 text-xs text-muted">Plateaus are common. Check logging completeness (including oil, drinks and weekends), step count trend and sleep before cutting calories — ask the AI coach to review your last 3 weeks.</p> : null}
              <p className="mt-2 text-[11px] text-faint">Estimates only; real progress is rarely linear.</p>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Nutrition plan" icon={<Utensils className="h-5 w-5" />} />
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["Calories", `${p.nutrition.calories}`], ["Protein", `${p.nutrition.proteinG} g`], ["Fibre", `${p.nutrition.fibreG} g`], ["Carbs", `${p.nutrition.carbsG} g`], ["Fat", `${p.nutrition.fatG} g`], ["Water", `${(p.nutrition.waterMl / 1000).toFixed(1)} L`]].map(([l, v]) => (
                  <div key={l} className="rounded-2xl bg-surface-2 p-2.5"><p className="font-semibold tabular">{v}</p><p className="text-[11px] text-faint">{l}</p></div>
                ))}
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted">How these were calculated</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">{p.nutrition.rationale.map((r) => <li key={r}>{r}</li>)}</ul>
              </details>
            </Card>
            <Card>
              <CardHeader title="Training plan" subtitle={p.training.templateName} icon={<Dumbbell className="h-5 w-5" />} />
              <p className="text-sm text-muted">{p.training.description}</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center gap-2"><Footprints className="h-4 w-4 text-orange" /> {fmt.int(p.walking.dailySteps)} steps/day</p>
                <p className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-red" /> {p.cardio}</p>
                <p className="flex items-center gap-2"><Moon className="h-4 w-4 text-purple" /> {p.sleepHours} h sleep target</p>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Milestones" />
            <ul className="space-y-2">
              {a.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  {m.achievedAt ? <CheckCircle2 className="h-5 w-5 text-lime" /> : <Circle className="h-5 w-5 text-faint" />}
                  <span className={cn(m.achievedAt && "text-muted line-through")}>{m.title}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Recovery & notes" />
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{[...p.recovery, ...p.notes].map((r) => <li key={r}>{r}</li>)}</ul>
          </Card>
          <Notice>{p.disclaimer}</Notice>
        </>
      ) : (
        <Card className="text-center"><p className="text-muted">No active goal. Set one to get a full nutrition and training plan.</p></Card>
      )}

      {plans.data ? (
        <Card>
          <CardHeader title="Workout plans" subtitle="Switch your training split anytime" />
          <ul className="space-y-2">
            {plans.data.templates.map((t) => {
              const active = plans.data!.active?.templateKey === t.key;
              return (
                <li key={t.key} className={cn("rounded-2xl border p-3.5", active ? "border-lime bg-lime/5" : "border-line bg-surface-2")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-muted">{t.level} · {t.location} · {t.daysPerWeek} days/week</p>
                    </div>
                    {active ? <Badge tone="lime">Active</Badge> : <Button size="sm" variant="secondary" onClick={async () => { await api.post("/plans", { templateKey: t.key }); plans.mutate(); invalidate("/workouts", "/dashboard"); toast(`${t.name} activated`); }}>Use</Button>}
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{t.description}</p>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <GoalSheet open={editOpen} onOpenChange={setEditOpen} info={data.info} current={a?.goal.type} onSaved={() => { mutate(); weight.mutate(); plans.mutate(); invalidate("/dashboard", "/auth/me"); }} />
    </div>
  );
}

function GoalSheet({ open, onOpenChange, info, current, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; info: GoalsData["info"]; current?: string; onSaved: () => void }) {
  const toast = useToast();
  const [type, setType] = useState(current ?? "fat_loss");
  const [target, setTarget] = useState("");
  const [waist, setWaist] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await api.post("/goals", { type, targetWeightKg: target ? Number(target) : null, targetWaistCm: waist ? Number(waist) : null });
      toast("New plan generated");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Choose your goal" size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">{Object.entries(info).map(([k, v]) => <Chip key={k} active={type === k} onClick={() => setType(k)}>{v.label}</Chip>)}</div>
        <p className="text-sm text-muted">{info[type]?.summary}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target weight (optional)"><NumberInput suffix="kg" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
          <Field label="Target waist (optional)"><NumberInput suffix="cm" value={waist} onChange={(e) => setWaist(e.target.value)} /></Field>
        </div>
        <Notice>No transformation dates are guaranteed. The plan uses moderate, sustainable targets — never crash diets.</Notice>
        <Button className="w-full" size="lg" onClick={save} loading={saving}>Generate plan</Button>
      </div>
    </Sheet>
  );
}
