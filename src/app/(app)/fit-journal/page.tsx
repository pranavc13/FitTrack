"use client";

import { Activity, CheckCircle2, Footprints, Flame, HeartPulse, Info, Lightbulb, Salad, Timer, Trash2, TriangleAlert, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DateStrip } from "@/components/food/date-strip";
import { Badge, Button, Card, CardHeader, Chip, EmptyState, ErrorState, Field, Notice, NumberInput, SectionTitle, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";
import { formatDateLabel } from "@/lib/dates";
import { GOAL_LABEL, type FitDayAnalysis, type Status } from "@/lib/nutrition/fit-journal";
import type { GoalType } from "@/lib/nutrition/targets";
import { cn, fmt } from "@/lib/utils";

interface Entry {
  steps: number | null;
  heartPoints: number | null;
  moveMinutes: number | null;
  distanceKm: number | null;
  caloriesBurned: number | null;
  avgHeartRate: number | null;
  goal: GoalType;
  isFullDay: boolean;
  recordedAt: string;
}
interface Day {
  today: string;
  date: string;
  entry: Entry | null;
  profileGoal: GoalType;
  weightKg: number;
  bmr: number;
  analysis: FitDayAnalysis;
  history: { date: string; steps: number | null; heartPoints: number | null; caloriesBurned: number | null; goal: GoalType; isFullDay: boolean; kcalIn: number; proteinG: number; logged: boolean }[];
}

const GOAL_CHOICES: GoalType[] = ["belly_fat_reduction", "visible_abs", "fat_loss", "weight_loss", "recomposition", "muscle_gain", "strength", "maintenance"];
const FIELDS = [
  { key: "steps", label: "Steps", suffix: "steps", icon: Footprints },
  { key: "heartPoints", label: "Heart Points", suffix: "pts", icon: HeartPulse },
  { key: "distanceKm", label: "Distance", suffix: "km", icon: Activity },
  { key: "caloriesBurned", label: "Calories burned", suffix: "kcal", icon: Flame },
  { key: "moveMinutes", label: "Move Minutes", suffix: "min", icon: Timer },
  { key: "avgHeartRate", label: "Avg heart rate (optional)", suffix: "bpm", icon: HeartPulse },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

const STATUS_STYLE: Record<Status, { tone: "lime" | "orange" | "red" | "cyan"; label: string }> = {
  good: { tone: "lime", label: "On track" },
  close: { tone: "cyan", label: "Close" },
  low: { tone: "orange", label: "Short" },
  high: { tone: "red", label: "Over" },
};

export default function FitJournalPage() {
  const me = useApi<{ today: string }>("/auth/me");
  const [date, setDate] = useState<string | null>(null);
  const today = me.data?.today;
  const current = date ?? today ?? null;
  const day = useApi<Day>(current ? `/fit-journal?date=${current}` : null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Google Fit journal</h1>
        <p className="text-sm text-muted">Copy today's numbers from Google Fit — we compare them with what you ate and your goal.</p>
      </div>
      {today && current ? <DateStrip date={current} today={today} onChange={setDate} /> : null}
      {day.error ? <ErrorState error={day.error} onRetry={() => day.mutate()} /> : !day.data ? <Skeleton className="h-96" /> : <Journal key={day.data.date} day={day.data} onSaved={(d) => day.mutate(d, { revalidate: false })} />}
    </div>
  );
}

function Journal({ day, onSaved }: { day: Day; onSaved: (d: Day) => void }) {
  const toast = useToast();
  const e = day.entry;
  const [goal, setGoal] = useState<GoalType>(e?.goal ?? day.profileGoal);
  const [vals, setVals] = useState<Record<FieldKey, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, e?.[f.key] != null ? String(e[f.key]) : ""])) as Record<FieldKey, string>);
  const [fullDay, setFullDay] = useState(e?.isFullDay ?? day.date < day.today);
  const [saving, setSaving] = useState(false);
  const choices = GOAL_CHOICES.includes(day.profileGoal) ? GOAL_CHOICES : [day.profileGoal, ...GOAL_CHOICES];

  const num = (k: FieldKey) => (vals[k].trim() === "" ? null : Number(vals[k]));
  const hasAny = FIELDS.some((f) => vals[f.key].trim() !== "");

  async function save(nextGoal = goal) {
    setSaving(true);
    try {
      const d = await api.put<Day>("/fit-journal", { date: day.date, goal: nextGoal, isFullDay: fullDay, ...Object.fromEntries(FIELDS.map((f) => [f.key, num(f.key)])) });
      onSaved(d);
      invalidate("/dashboard");
      toast("Journal saved", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await api.del(`/fit-journal?date=${day.date}`);
    setVals(Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<FieldKey, string>);
    const d = await api.get<Day>(`/fit-journal?date=${day.date}`);
    onSaved(d);
    toast("Entry removed", "info");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="What's your goal?" subtitle="Today is judged against this goal" />
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {choices.map((g) => (
            <Chip key={g} active={goal === g} onClick={() => { setGoal(g); if (e) save(g); }}>{GOAL_LABEL[g]}</Chip>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={`Google Fit · ${formatDateLabel(day.date, day.today)}`} subtitle="Open Google Fit → Home, and copy the numbers" action={e ? <button onClick={remove} className="text-faint hover:text-red" aria-label="Delete entry"><Trash2 className="h-4 w-4" /></button> : null} />
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <Field key={f.key} label={<span className="flex items-center gap-1.5"><f.icon className="h-3.5 w-3.5 text-faint" />{f.label}</span>} className={f.key === "avgHeartRate" ? "col-span-2" : undefined}>
              <NumberInput suffix={f.suffix} min={0} value={vals[f.key]} onChange={(ev) => setVals((v) => ({ ...v, [f.key]: ev.target.value }))} placeholder="—" />
            </Field>
          ))}
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-2xl bg-surface-2 px-3.5 py-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-lime" checked={fullDay} onChange={(ev) => setFullDay(ev.target.checked)} />
          <span><span className="font-semibold">These are my final numbers for the day</span><br /><span className="text-xs text-muted">Leave unticked mid-day — we'll add the resting calories still to come before midnight.</span></span>
        </label>
        <Button size="lg" className="mt-4 w-full" loading={saving} disabled={!hasAny} onClick={() => save()}>
          {e ? "Update journal" : "Save & analyse"}
        </Button>
        {e ? <p className="mt-2 text-center text-[11px] text-faint">Last updated {new Date(e.recordedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p> : null}
      </Card>

      <Analysis a={day.analysis} hasEntry={Boolean(e)} />
      <History day={day} />
    </div>
  );
}

function Analysis({ a, hasEntry }: { a: FitDayAnalysis; hasEntry: boolean }) {
  const max = Math.max(a.maintenance.kcal, a.target.kcal, a.intake.kcal, 1) * 1.08;
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <>
      <SectionTitle>Today's verdict · {a.goalLabel}</SectionTitle>
      <Card glow>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Maintenance</p><p className="font-display text-xl font-bold tabular">{fmt.int(a.maintenance.kcal)}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Eaten</p><p className={cn("font-display text-xl font-bold tabular", a.overTarget > 50 && a.target.adjustment <= 0 ? "text-orange" : "text-ink")}>{fmt.int(a.intake.kcal)}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Goal</p><p className="font-display text-xl font-bold tabular text-lime">{fmt.int(a.target.kcal)}</p></div>
        </div>
        <div className="relative mt-4 h-3 rounded-full bg-surface-3">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-lime/70 to-lime" style={{ width: pos(a.intake.kcal) }} />
          <div className="absolute -top-1 h-5 w-0.5 rounded bg-ink" style={{ left: pos(a.maintenance.kcal) }} title="Maintenance" />
          <div className="absolute -top-1 h-5 w-0.5 rounded bg-lime" style={{ left: pos(a.target.kcal) }} title="Goal" />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-faint"><span>0</span><span>▮ white = maintenance · ▮ lime = goal</span></div>
        <p className={cn("mt-4 rounded-2xl px-3.5 py-2.5 text-sm font-semibold", a.balance <= 0 ? "bg-lime/10 text-lime" : "bg-orange/10 text-orange")}>
          {a.balance <= 0 ? `${fmt.int(-a.balance)} kcal deficit` : `${fmt.int(a.balance)} kcal surplus`} vs maintenance{a.partial ? " so far" : ""}
        </p>
        <p className="mt-2 text-xs text-muted">{a.maintenance.explanation}</p>
      </Card>

      <Card>
        <ul className="space-y-3">
          {a.metrics.map((m) => {
            const st = STATUS_STYLE[m.status];
            return (
              <li key={m.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{m.label}</span>
                  <span className="flex items-center gap-2"><span className="tabular text-muted">{fmt.int(m.value)} / {fmt.int(m.target)} {m.unit}</span><Badge tone={st.tone}>{st.label}</Badge></span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-3"><div className={cn("h-full rounded-full", st.tone === "lime" ? "bg-lime" : st.tone === "cyan" ? "bg-cyan" : st.tone === "orange" ? "bg-orange" : "bg-red")} style={{ width: `${Math.min(100, m.target ? (m.value / m.target) * 100 : 0)}%` }} /></div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Your day in numbers" icon={<Info className="h-4 w-4" />} />
        <ul className="space-y-2 text-sm leading-relaxed text-muted">{a.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
        {a.intake.entries === 0 ? (
          <Notice tone="warn">Nothing is logged in your food diary for this day, so “eaten” is 0. <Link href="/food" className="font-semibold underline">Log meals</Link> or <Link href="/scan" className="font-semibold underline">scan a plate</Link> for a real comparison.</Notice>
        ) : null}
      </Card>

      <SectionTitle>What to do now</SectionTitle>
      {a.actions.length ? (
        <div className="space-y-2">
          {a.actions.map((act, i) => {
            const Icon = act.kind === "move" ? Footprints : act.kind === "eat" ? (act.title.includes("fibre") ? Salad : UtensilsCrossed) : act.kind === "hold" ? CheckCircle2 : TriangleAlert;
            const tone = act.kind === "move" ? "text-cyan bg-cyan/12" : act.kind === "eat" ? "text-lime bg-lime/12" : act.kind === "hold" ? "text-lime bg-lime/12" : "text-orange bg-orange/12";
            return (
              <Card key={i} className="flex gap-3">
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", tone)}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0"><p className="font-semibold">{act.title}</p><p className="mt-0.5 text-sm text-muted">{act.detail}</p></div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title={hasEntry ? "You're on track today" : "Add your Google Fit numbers"} body={hasEntry ? "Calories, protein, fibre, steps and Heart Points all look good for your goal." : "Enter at least your steps and calories burned to get a plan for the rest of the day."} />
      )}

      {a.advice.length ? (
        <Card>
          <CardHeader title={`${a.goalLabel}: what matters`} icon={<Lightbulb className="h-4 w-4" />} />
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">{a.advice.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </Card>
      ) : null}
      <Notice>Estimates: trackers and food logs are each typically ±10–25%. Judge progress on your 7-day weight average and waist measurement, not a single day.</Notice>
    </>
  );
}

function History({ day }: { day: Day }) {
  if (!day.history.length) return null;
  return (
    <>
      <SectionTitle>Last 14 days</SectionTitle>
      <Card>
        <ul className="divide-y divide-line">
          {day.history.map((h) => {
            const complete = h.isFullDay || h.date < day.today;
            const bal = complete && h.caloriesBurned != null && h.logged ? h.kcalIn - h.caloriesBurned : null;
            return (
              <li key={h.date} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{formatDateLabel(h.date, day.today)}</p>
                  <p className="truncate text-xs text-faint">{GOAL_LABEL[h.goal]} · {fmt.int(h.steps)} steps · {fmt.int(h.heartPoints)} ♥</p>
                </div>
                <div className="text-right tabular">
                  <p className="text-xs text-muted">{fmt.int(h.kcalIn)} in / {fmt.int(h.caloriesBurned)} out</p>
                  {bal != null ? <p className={cn("text-xs font-semibold", bal <= 0 ? "text-lime" : "text-orange")}>{bal <= 0 ? `−${fmt.int(-bal)}` : `+${fmt.int(bal)}`} kcal</p> : <p className="text-xs text-faint">{!complete ? "day in progress" : h.logged ? "no burn entered" : "no food logged"}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
