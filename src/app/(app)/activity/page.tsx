"use client";

import { Dumbbell, FileUp, Footprints, Info, Library, Plus, Search, Timer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Badge, Button, Card, CardHeader, Chip, EmptyState, Field, Notice, NumberInput, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, offlineCapable, useApi } from "@/lib/client/api";
import { formatDateLabel } from "@/lib/dates";
import { cn, fmt } from "@/lib/utils";

interface ActivityType { id: number; code: string; name: string; category: string; met: number; intensity: string; isProxy: boolean; note: string | null; source: string; supportsDistance: boolean }
interface ActivityLog { id: number; name: string; date: string; durationMin: number; distanceKm: number | null; metUsed: number; grossKcal: number; netKcal: number; deviceKcal: number | null; source: string }

export default function ActivityPage() {
  return (
    <Suspense>
      <Activity />
    </Suspense>
  );
}

function Activity() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const me = useApi<{ today: string; preferences: { stepGoal: number } | null }>("/auth/me");
  const dash = useApi<{ today: { steps: number; distanceKm: number; exerciseMinutes: number; exerciseNetKcal: number } }>("/dashboard");
  const logs = useApi<{ activities: ActivityLog[] }>("/activities");
  const next = useApi<{ calendar: { date: string; workouts: number; activities: number; minutes: number }[]; suggestion: { day: string; focus: string } | null; reason: string; openWorkoutId: number | null }>("/workouts/next");
  const [logOpen, setLogOpen] = useState(params.get("log") === "1");
  const [stepsOpen, setStepsOpen] = useState(false);
  useEffect(() => {
    if (params.get("log")) router.replace("/activity");
  }, [params, router]);

  const stepGoal = me.data?.preferences?.stepGoal ?? 8000;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Activity</h1>
        <Button size="sm" onClick={() => setLogOpen(true)}><Plus className="h-4 w-4" /> Log activity</Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setStepsOpen(true)} className="text-left">
          <Card className="h-full p-4 hover:bg-surface-2">
            <div className="flex items-center gap-2 text-orange"><Footprints className="h-5 w-5" /><span className="text-xs text-muted">Steps today</span></div>
            <p className="mt-2 font-display text-2xl font-bold tabular">{fmt.int(dash.data?.today.steps ?? 0)}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-orange" style={{ width: `${Math.min(100, ((dash.data?.today.steps ?? 0) / stepGoal) * 100)}%` }} /></div>
            <p className="mt-1 text-[11px] text-faint">Goal {fmt.int(stepGoal)} · tap to update</p>
          </Card>
        </button>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-lime"><Timer className="h-5 w-5" /><span className="text-xs text-muted">Exercise today</span></div>
          <p className="mt-2 font-display text-2xl font-bold tabular">{fmt.int(dash.data?.today.exerciseMinutes ?? 0)} min</p>
          <p className="text-[11px] text-faint">≈{fmt.int(dash.data?.today.exerciseNetKcal ?? 0)} kcal net (estimate)</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { href: "/activity/workout", icon: Dumbbell, label: next.data?.openWorkoutId ? "Resume workout" : "Start workout", tone: "text-lime" },
          { href: "/activity/exercises", icon: Library, label: "Exercise library", tone: "text-blue" },
          { href: "/activity/timer", icon: Timer, label: "Interval timer", tone: "text-orange" },
          { href: "/activity/import", icon: FileUp, label: "Import Google Fit", tone: "text-purple" },
        ].map(({ href, icon: Icon, label, tone }) => (
          <Link key={href} href={href} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3 text-sm font-semibold hover:bg-surface-2">
            <Icon className={cn("h-5 w-5 shrink-0", tone)} /> {label}
          </Link>
        ))}
      </div>

      {next.data ? (
        <Card>
          <CardHeader title="Last 4 weeks" subtitle={next.data.suggestion ? `Up next: ${next.data.suggestion.day} — ${next.data.suggestion.focus}` : next.data.reason} />
          <div className="grid grid-cols-7 gap-1.5">
            {next.data.calendar.map((d) => (
              <div key={d.date} title={`${d.date}: ${Math.round(d.minutes)} min`} className={cn("aspect-square rounded-lg", d.workouts ? "bg-lime" : d.minutes >= 30 ? "bg-lime/50" : d.minutes > 0 ? "bg-lime/20" : "bg-surface-3")} />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-faint">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-lime" /> workout</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-lime/50" /> 30+ min active</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-lime/20" /> some activity</span>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="History" subtitle="Last 30 days" />
        {!logs.data ? <Skeleton className="h-40" /> : logs.data.activities.length ? (
          <ul className="divide-y divide-line">
            {logs.data.activities.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted">{me.data ? formatDateLabel(a.date, me.data.today) : a.date} · {fmt.int(a.durationMin)} min{a.distanceKm ? ` · ${fmt.dec(a.distanceKm)} km` : ""} · MET {a.metUsed}{a.source !== "manual" ? ` · ${a.source}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular">{fmt.int(a.netKcal)}</p>
                  <p className="text-[10px] text-faint">kcal net est.{a.deviceKcal ? ` · device ${fmt.int(a.deviceKcal)}` : ""}</p>
                </div>
                <button onClick={async () => { await api.del(`/activities/${a.id}`); invalidate("/activities", "/dashboard", "/workouts"); toast("Deleted"); }} className="grid h-9 w-9 place-items-center rounded-xl text-faint hover:text-red" aria-label={`Delete ${a.name}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No activities yet" body="Log a walk, workout, yoga, cricket, dance — over 1,100 activities with Compendium MET values." />}
      </Card>
      <Notice><Info className="mr-1 inline h-3.5 w-3.5" /> Calories burned are estimated from MET values (2024 Adult Compendium of Physical Activities) and your body weight — typically ±20–30% for an individual. Only net calories (above resting) are added to your daily expenditure, so nothing is counted twice.</Notice>

      {me.data ? <LogActivitySheet open={logOpen} onOpenChange={setLogOpen} date={me.data.today} /> : null}
      {me.data ? <StepsSheet open={stepsOpen} onOpenChange={setStepsOpen} date={me.data.today} current={dash.data?.today.steps ?? 0} /> : null}
    </div>
  );
}

const CATS = ["Walking", "Running", "Gym & strength", "High intensity", "Dance", "Mind-body", "Sports", "Cycling", "Water", "Outdoor", "Daily movement"];

function LogActivitySheet({ open, onOpenChange, date }: { open: boolean; onOpenChange: (o: boolean) => void; date: string }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [type, setType] = useState<ActivityType | null>(null);
  const [minutes, setMinutes] = useState("30");
  const [km, setKm] = useState("");
  const [hr, setHr] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!open) { setType(null); setQ(""); }
  }, [open]);
  const types = useApi<{ types: ActivityType[] }>(open ? `/activities/types?q=${encodeURIComponent(dq)}${cat ? `&category=${encodeURIComponent(cat)}` : ""}` : null);
  const weight = useApi<{ history: { weightKg: number }[] }>(open ? "/body/weight?days=60" : null);
  const w = weight.data?.history.at(-1)?.weightKg;
  const preview = type && w && Number(minutes) > 0 ? ((type.met - 1) * 3.5 * w * Number(minutes)) / 200 : null;

  async function save() {
    if (!type) return;
    setSaving(true);
    try {
      const r = await offlineCapable("POST", "/activities", { activityTypeId: type.id, date, durationMin: Number(minutes), distanceKm: km ? Number(km) : null, avgHeartRate: hr ? Number(hr) : null }, type.name);
      toast(r.state === "queued" ? "Saved offline — will sync" : `Logged ${type.name.split(",")[0]}`, r.state === "queued" ? "queued" : "success");
      invalidate("/activities", "/dashboard", "/workouts");
      onOpenChange(false);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={type ? "Activity details" : "Log activity"} size="full">
      {!type ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Brisk walk, badminton, Bhangra, yoga…" aria-label="Search activities" className="h-12 w-full rounded-2xl border border-line bg-surface-2 pl-12 pr-4 focus:border-lime/60 focus:outline-none" />
          </div>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            <Chip active={!cat} onClick={() => setCat(null)}>All</Chip>
            {CATS.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}</Chip>)}
          </div>
          {!types.data ? <Skeleton className="h-60" /> : (
            <ul className="space-y-1.5">
              {types.data.types.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setType(t)} className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3 text-left hover:bg-surface-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{t.name}</p>
                      <p className="text-xs text-muted">{t.category} · MET {t.met} · {t.intensity}{t.isProxy ? " · proxy" : ""}</p>
                    </div>
                    <Plus className="h-5 w-5 shrink-0 text-lime" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="space-y-1">
            <p className="font-semibold">{type.name}</p>
            <p className="text-xs text-muted">MET {type.met} · {type.source}</p>
            {type.note ? <p className="text-xs text-orange">{type.note}</p> : null}
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration"><NumberInput suffix="min" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
            {type.supportsDistance ? <Field label="Distance (optional)" hint={type.category === "Walking" || type.category === "Running" ? "Refines MET from your pace" : undefined}><NumberInput suffix="km" value={km} onChange={(e) => setKm(e.target.value)} /></Field> : <Field label="Avg heart rate (optional)"><NumberInput suffix="bpm" value={hr} onChange={(e) => setHr(e.target.value)} /></Field>}
          </div>
          <div className="flex flex-wrap gap-2">{[10, 20, 30, 45, 60, 90].map((m) => <Chip key={m} active={Number(minutes) === m} onClick={() => setMinutes(String(m))}>{m} min</Chip>)}</div>
          <Card className="text-center">
            <p className="text-sm text-muted">Estimated net burn</p>
            <p className="font-display text-3xl font-bold tabular">{preview != null ? fmt.int(preview) : "—"} <span className="text-base text-muted">kcal</span></p>
            <p className="text-[11px] text-faint">{w ? `(MET − 1) × 3.5 × ${w} kg ÷ 200 × ${minutes} min` : "Log your weight for a personal estimate"}</p>
          </Card>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button variant="secondary" onClick={() => setType(null)}>Back</Button>
            <Button onClick={save} loading={saving} disabled={!(Number(minutes) > 0)}>Log activity</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function StepsSheet({ open, onOpenChange, date, current }: { open: boolean; onOpenChange: (o: boolean) => void; date: string; current: number }) {
  const toast = useToast();
  const [steps, setSteps] = useState(String(current || ""));
  const [km, setKm] = useState("");
  useEffect(() => setSteps(String(current || "")), [current, open]);
  async function save() {
    try {
      const r = await offlineCapable("PUT", "/steps", { date, steps: Number(steps), distanceKm: km ? Number(km) : null }, "steps");
      toast(r.state === "queued" ? "Saved offline" : "Steps updated", r.state === "queued" ? "queued" : "success");
      invalidate("/dashboard", "/activities");
      onOpenChange(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Today's steps" description="Copy the total from your phone's step counter or watch">
      <div className="space-y-3">
        <NumberInput suffix="steps" value={steps} onChange={(e) => setSteps(e.target.value)} autoFocus />
        <NumberInput suffix="km" value={km} onChange={(e) => setKm(e.target.value)} placeholder="Distance (optional)" />
        <Badge>Steps are tracked for movement goals; their energy is already part of your lifestyle factor, so they don&apos;t add calories.</Badge>
        <Button className="w-full" onClick={save} disabled={!(Number(steps) >= 0) || steps === ""}>Save</Button>
      </div>
    </Sheet>
  );
}
