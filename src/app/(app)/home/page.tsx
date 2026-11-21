"use client";

import { ChevronRight, Droplets, Flame, Footprints, Moon, Plus, ScanLine, Sparkles, Target, Timer, Download, Dumbbell } from "lucide-react";
import Link from "next/link";
import { useAppState } from "@/components/providers";
import { Badge, Button, Card, CardHeader, ErrorState, MacroStat, ProgressRing, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { invalidate, offlineCapable, useApi } from "@/lib/client/api";
import { cn, fmt, MEAL_LABEL } from "@/lib/utils";
import { weekdayShort } from "@/lib/dates";

interface Dashboard {
  date: string;
  user: { name: string };
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; waterMl: number; sleepMinutes: number } | null;
  today: { kcalIn: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; exerciseNetKcal: number; exerciseMinutes: number; steps: number; distanceKm: number; waterMl: number; sleepMin: number; estimatedExpenditure: number; kcalRemaining: number | null };
  meals: { mealType: string; name: string; kcal: number; proteinG: number; items: string[] }[];
  week: { date: string; kcalIn: number; logged: boolean; steps: number; exerciseMinutes: number }[];
  weight: { latest: { weightKg: number; trendKg: number; date: string } | null; trend: { date: string; weightKg: number; trendKg: number }[] };
  goal: { label: string; progress: number | null; targetWeightKg: number | null; nextMilestone: string | null } | null;
  workout: { day: string | null; focus: string | null; reason: string; doneToday: boolean };
  streak: number;
  fasting: { startedAt: string; targetHours: number } | null;
  recommendations: { id: string; text: string; href: string }[];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const { data, error, mutate, isLoading } = useApi<Dashboard>("/dashboard");
  const { installPrompt, promptInstall, isStandalone } = useAppState();
  const toast = useToast();

  if (error && !data) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (isLoading || !data) return <HomeSkeleton />;

  const t = data.targets;
  const d = data.today;
  const pct = t ? d.kcalIn / t.calories : 0;

  async function addWater(ml: number) {
    const r = await offlineCapable("POST", "/wellness/water", { date: data!.date, ml }, `${ml} ml water`);
    toast(r.state === "queued" ? `${ml} ml saved offline — will sync` : `+${ml} ml water`, r.state === "queued" ? "queued" : "success");
    invalidate("/dashboard", "/wellness");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{greeting()},</p>
          <h1 className="font-display text-2xl font-bold">{data.user.name.split(" ")[0]} 👋</h1>
        </div>
        {data.streak > 0 ? (
          <Badge tone="orange" className="px-3 py-1 text-xs">
            <Flame className="h-3.5 w-3.5" /> {data.streak}-day streak
          </Badge>
        ) : null}
      </div>

      {installPrompt && !isStandalone ? (
        <Card className="flex items-center gap-3 border-lime/30 bg-lime/5">
          <Download className="h-5 w-5 shrink-0 text-lime" />
          <p className="flex-1 text-sm">Install FitTrack AI on your home screen for one-tap access.</p>
          <Button size="sm" onClick={promptInstall}>Install</Button>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* Calories */}
        <Card className="card-gradient">
          <div className="flex items-center justify-between gap-2">
            <div className="text-center">
              <p className="font-display text-xl font-bold tabular">{fmt.int(d.kcalIn)}</p>
              <p className="text-xs text-muted">Eaten</p>
            </div>
            <ProgressRing value={pct} size={168} stroke={14} color={pct > 1.1 ? "var(--color-orange)" : "var(--color-lime)"}>
              <div>
                <p className="font-display text-3xl font-bold tabular">{t ? fmt.int(Math.abs(d.kcalRemaining ?? 0)) : "—"}</p>
                <p className="text-xs text-muted">{d.kcalRemaining != null && d.kcalRemaining < 0 ? "kcal over" : "kcal left"}</p>
                {t ? <p className="mt-0.5 text-[11px] text-faint">of {fmt.int(t.calories)}</p> : null}
              </div>
            </ProgressRing>
            <div className="text-center">
              <p className="font-display text-xl font-bold tabular">{fmt.int(d.exerciseNetKcal)}</p>
              <p className="text-xs text-muted">Burned*</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
            <MacroStat label="Protein" value={d.proteinG} target={t?.proteinG} color="bg-blue" />
            <MacroStat label="Carbs" value={d.carbsG} target={t?.carbsG} color="bg-orange" />
            <MacroStat label="Fat" value={d.fatG} target={t?.fatG} color="bg-purple" />
            <MacroStat label="Fibre" value={d.fibreG} target={t?.fibreG} color="bg-cyan" />
          </div>
          <p className="mt-3 text-[11px] text-faint">*Estimated net exercise calories (MET-based). Est. total expenditure today: {fmt.int(d.estimatedExpenditure)} kcal.</p>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile href="/activity" icon={<Footprints className="h-5 w-5" />} tone="text-orange" label="Steps" value={fmt.int(d.steps)} sub={d.distanceKm ? `${fmt.dec(d.distanceKm)} km` : "Tap to add"} />
          <Card className="relative p-3.5">
            <div className="flex items-center gap-2 text-cyan">
              <Droplets className="h-5 w-5" />
              <span className="text-xs font-medium text-muted">Water</span>
            </div>
            <p className="mt-2 font-display text-xl font-bold tabular">{fmt.litres(d.waterMl)}</p>
            <p className="text-[11px] text-faint">of {t ? fmt.litres(t.waterMl) : "—"}</p>
            <button onClick={() => addWater(250)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-cyan/15 text-cyan active:scale-95" aria-label="Add 250 ml water">
              <Plus className="h-5 w-5" />
            </button>
          </Card>
          <StatTile href="/activity" icon={<Timer className="h-5 w-5" />} tone="text-lime" label="Active" value={`${fmt.int(d.exerciseMinutes)} min`} sub={`${fmt.int(d.exerciseNetKcal)} kcal est.`} />
          <StatTile href="/wellness" icon={<Moon className="h-5 w-5" />} tone="text-purple" label="Sleep" value={d.sleepMin ? fmt.minutes(d.sleepMin) : "—"} sub={d.sleepMin ? "last night" : "Log sleep"} />
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length ? (
        <Card>
          <CardHeader title="Today's focus" icon={<Sparkles className="h-5 w-5" />} action={<Link href="/coach" className="text-sm font-semibold text-lime">Ask coach</Link>} />
          <ul className="space-y-2">
            {data.recommendations.map((r) => (
              <li key={r.id}>
                <Link href={r.href} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3 text-sm hover:bg-surface-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-lime" />
                  <span className="flex-1">{r.text}</span>
                  <ChevronRight className="h-4 w-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Meals */}
        <Card>
          <CardHeader title="Meals" subtitle={`${data.meals.length ? data.meals.reduce((a, m) => a + m.items.length, 0) : 0} items logged`} action={<Link href="/food" className="text-sm font-semibold text-lime">Diary</Link>} />
          {data.meals.length ? (
            <ul className="divide-y divide-line">
              {data.meals.map((m) => (
                <li key={m.mealType + m.name} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium">{MEAL_LABEL[m.mealType] ?? m.name}</p>
                    <p className="truncate text-xs text-muted">{m.items.join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular">{fmt.int(m.kcal)}</p>
                    <p className="text-[11px] text-faint">{fmt.int(m.proteinG)} g protein</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button asChild>
                <Link href="/scan"><ScanLine className="h-4 w-4" /> Snap meal</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/food?add=1"><Plus className="h-4 w-4" /> Search food</Link>
              </Button>
            </div>
          )}
        </Card>

        {/* Workout + goal */}
        <div className="space-y-4">
          <Card>
            <CardHeader title={data.workout.day ? `Next: ${data.workout.day}` : "Training"} subtitle={data.workout.focus ?? data.workout.reason} icon={<Dumbbell className="h-5 w-5" />} />
            {data.workout.doneToday ? <Badge tone="lime">Workout done today ✓</Badge> : null}
            <div className="mt-2 flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href="/activity/workout">{data.workout.day ? "Start session" : "Choose a plan"}</Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="flex-1">
                <Link href="/activity?log=1">Log activity</Link>
              </Button>
            </div>
          </Card>
          {data.goal ? (
            <Link href="/goals" className="block">
              <Card>
                <CardHeader title={data.goal.label} subtitle={data.goal.nextMilestone ? `Next: ${data.goal.nextMilestone}` : "Goal in progress"} icon={<Target className="h-5 w-5" />} action={<ChevronRight className="h-5 w-5 text-faint" />} />
                {data.goal.progress != null ? (
                  <div className="space-y-1">
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-gradient-to-r from-lime to-cyan" style={{ width: `${Math.round(data.goal.progress * 100)}%` }} />
                    </div>
                    <p className="text-xs text-muted">{Math.round(data.goal.progress * 100)}% of the way to {data.goal.targetWeightKg} kg</p>
                  </div>
                ) : null}
              </Card>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Week */}
        <Card>
          <CardHeader title="This week" subtitle="Calories logged per day" />
          <div className="flex items-end justify-between gap-1.5">
            {data.week.map((w) => {
              const h = t ? Math.min(1.25, w.kcalIn / t.calories) : 0;
              return (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex h-24 w-full items-end justify-center">
                    {t ? <div className="absolute inset-x-0 border-t border-dashed border-faint/40" style={{ bottom: `${(1 / 1.25) * 100}%` }} /> : null}
                    <div className={cn("w-full max-w-7 rounded-lg", w.logged ? (h > 1.1 ? "bg-orange" : "bg-lime") : "bg-surface-3")} style={{ height: `${Math.max(6, (h / 1.25) * 100)}%` }} />
                  </div>
                  <span className={cn("text-[11px]", w.date === data.date ? "font-bold text-lime" : "text-faint")}>{weekdayShort(w.date)}</span>
                </div>
              );
            })}
          </div>
        </Card>
        {/* Weight */}
        <Link href="/progress">
          <Card className="h-full">
            <CardHeader
              title="Weight trend"
              subtitle={data.weight.latest ? `${fmt.dec(data.weight.latest.weightKg)} kg · trend ${fmt.dec(data.weight.latest.trendKg)} kg` : "No weigh-ins yet"}
              action={<ChevronRight className="h-5 w-5 text-faint" />}
            />
            {data.weight.trend.length > 1 ? (
              <div className="h-24">
                <Sparkline values={data.weight.trend.map((p: { trendKg: number }) => p.trendKg)} />
              </div>
            ) : (
              <p className="text-sm text-muted">Log your weight a few times a week to see a smoothed trend.</p>
            )}
          </Card>
        </Link>
      </div>
    </div>
  );
}

function StatTile({ href, icon, tone, label, value, sub }: { href: string; icon: React.ReactNode; tone: string; label: string; value: string; sub: string }) {
  return (
    <Link href={href}>
      <Card className="h-full p-3.5 hover:border-line">
        <div className={cn("flex items-center gap-2", tone)}>
          {icon}
          <span className="text-xs font-medium text-muted">{label}</span>
        </div>
        <p className="mt-2 font-display text-xl font-bold tabular">{value}</p>
        <p className="text-[11px] text-faint">{sub}</p>
      </Card>
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-72" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}

/** Lightweight weight-trend line (plain SVG, so Home doesn't load a charting library). */
function Sparkline({ values }: { values: number[] }) {
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return null;
  const min = Math.min(...pts) - 0.5;
  const max = Math.max(...pts) + 0.5;
  const W = 300, H = 96, pad = 3;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, pad + (1 - (v - min) / (max - min)) * (H - pad * 2)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Weight trend">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B6F34A" stopOpacity={0.35} />
          <stop offset="1" stopColor="#B6F34A" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#wg)" />
      <path d={line} fill="none" stroke="#B6F34A" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
