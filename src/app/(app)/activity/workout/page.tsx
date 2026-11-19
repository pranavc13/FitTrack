"use client";

import { Check, ChevronDown, Dumbbell, Play, Plus, Timer, Trash2, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, CardHeader, EmptyState, NumberInput, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";
import { cn, fmt } from "@/lib/utils";

interface WorkoutView {
  workout: { id: number; name: string; date: string; startedAt: string; endedAt: string | null; durationMin: number | null };
  exercises: {
    id: number;
    notes: string | null;
    exercise: { slug: string; name: string; primaryMuscle: string; defaultSets: number; defaultReps: string; defaultRestSec: number; equipment: string[] };
    sets: { id: number; setNumber: number; reps: number | null; weightKg: number | null; durationSec: number | null; isWarmup: boolean }[];
    suggestion: { action: string; text: string; weightKg: number | null } | null;
  }[];
}
interface Next {
  plan: { name: string; days: { day: string; focus: string; exercises: { slug: string; sets: number; reps: string }[] }[] } | null;
  suggestion: { day: string; focus: string } | null;
  reason: string;
  openWorkoutId: number | null;
  records: { exercise: string; kind: string; value: number; detail: string }[];
}

export default function WorkoutPage() {
  const next = useApi<Next>("/workouts/next");
  const me = useApi<{ today: string }>("/auth/me");
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const toast = useToast();
  const id = workoutId ?? next.data?.openWorkoutId ?? null;

  async function start(planDay: string | null, name?: string) {
    if (!me.data) return;
    try {
      const w = await api.post<WorkoutView>("/workouts", { date: me.data.today, planDay, name });
      setWorkoutId(w.workout.id);
      invalidate("/workouts/next");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (!next.data) return <Skeleton className="h-80" />;
  if (id) return <ActiveWorkout id={id} onFinished={() => { setWorkoutId(null); next.mutate(); }} />;
  const plan = next.data.plan;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Workout</h1>
      {plan ? (
        <>
          <Card glow className="card-gradient">
            <CardHeader title={next.data.suggestion ? `Suggested: ${next.data.suggestion.day}` : "Rest recommended"} subtitle={next.data.reason} icon={<Dumbbell className="h-5 w-5" />} />
            {next.data.suggestion ? <p className="mb-3 text-sm text-muted">{next.data.suggestion.focus}</p> : null}
            {next.data.suggestion ? <Button className="w-full" size="lg" onClick={() => start(next.data!.suggestion!.day)}><Play className="h-5 w-5" /> Start {next.data.suggestion.day}</Button> : null}
          </Card>
          <Card>
            <CardHeader title={plan.name} subtitle="Or pick any day" action={<Link href="/goals" className="text-sm font-semibold text-lime">Change plan</Link>} />
            <ul className="space-y-2">
              {plan.days.map((d) => (
                <li key={d.day} className="flex items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{d.day} <span className="font-normal text-muted">· {d.focus}</span></p>
                    <p className="truncate text-xs text-faint">{d.exercises.map((e) => e.slug.replace(/-/g, " ")).join(", ")}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => start(d.day)}>Start</Button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <EmptyState icon={<Dumbbell className="h-5 w-5" />} title="No training plan yet" body="Pick a plan in Goals, or start an empty workout and add exercises." action={<Button asChild><Link href="/goals">Choose a plan</Link></Button>} />
      )}
      <Button variant="secondary" className="w-full" onClick={() => start(null, "Custom workout")}><Plus className="h-4 w-4" /> Empty workout</Button>
      {next.data.records.length ? (
        <Card>
          <CardHeader title="Personal records" icon={<Trophy className="h-5 w-5" />} />
          <ul className="space-y-1.5 text-sm">
            {next.data.records.filter((r) => r.kind !== "e1rm").slice(0, 10).map((r, i) => (
              <li key={i} className="flex justify-between gap-2"><span>{r.exercise}</span><span className="tabular text-muted">{r.detail}</span></li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function ActiveWorkout({ id, onFinished }: { id: number; onFinished: () => void }) {
  const toast = useToast();
  const { data, mutate } = useApi<WorkoutView>(`/workouts/${id}`, { revalidateOnFocus: false });
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [addOpen, setAddOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [openIdx, setOpenIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (rest && now >= rest.until) {
      navigator.vibrate?.([200, 100, 200]);
      setRest(null);
    }
  }, [now, rest]);

  if (!data) return <Skeleton className="h-96" />;
  const elapsed = Math.floor((now - Date.parse(data.workout.startedAt)) / 1000);

  async function finish() {
    setFinishing(true);
    try {
      await api.post(`/workouts/${id}/finish`, {});
      toast("Workout saved 💪 — logged to your activity");
      invalidate("/dashboard", "/activities", "/workouts");
      onFinished();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-4 flex items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate font-semibold">{data.workout.name}</p>
          <p className="text-sm tabular text-muted">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed</p>
        </div>
        <Button onClick={finish} loading={finishing}><Check className="h-4 w-4" /> Finish</Button>
      </div>

      {rest ? (
        <Card className="flex items-center justify-between border-lime/40 bg-lime/10">
          <div className="flex items-center gap-3">
            <Timer className="h-6 w-6 text-lime" />
            <div>
              <p className="font-display text-3xl font-bold tabular">{Math.max(0, Math.ceil((rest.until - now) / 1000))}s</p>
              <p className="text-xs text-muted">Rest</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setRest({ ...rest, until: rest.until + 15000 })}>+15s</Button>
            <Button size="sm" variant="secondary" onClick={() => setRest(null)} aria-label="Skip rest"><X className="h-4 w-4" /></Button>
          </div>
        </Card>
      ) : null}

      {data.exercises.map((ex, idx) => (
        <ExerciseCard key={ex.id} workoutId={id} ex={ex} open={openIdx === idx} onToggle={() => setOpenIdx(openIdx === idx ? -1 : idx)} onLogged={(restSec, records) => { mutate(); setRest({ until: Date.now() + restSec * 1000, total: restSec }); if (records.length) toast(`New personal record! 🏆`); }} onRemoved={() => mutate()} />
      ))}
      <Button variant="secondary" className="w-full" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add exercise</Button>
      <Button variant="ghost" className="w-full text-red" onClick={async () => { if (!confirm("Discard this workout?")) return; await api.del(`/workouts/${id}`); invalidate("/workouts"); onFinished(); }}>
        <Trash2 className="h-4 w-4" /> Discard workout
      </Button>
      <AddExerciseSheet open={addOpen} onOpenChange={setAddOpen} workoutId={id} onAdded={() => mutate()} />
    </div>
  );
}

function ExerciseCard({ workoutId, ex, open, onToggle, onLogged, onRemoved }: { workoutId: number; ex: WorkoutView["exercises"][number]; open: boolean; onToggle: () => void; onLogged: (restSec: number, records: unknown[]) => void; onRemoved: () => void }) {
  const toast = useToast();
  const last = ex.sets.at(-1);
  const [reps, setReps] = useState(String(last?.reps ?? ex.exercise.defaultReps.match(/\d+/)?.[0] ?? "10"));
  const [kg, setKg] = useState(String(last?.weightKg ?? ex.suggestion?.weightKg ?? ""));
  const [warmup, setWarmup] = useState(false);
  const [busy, setBusy] = useState(false);
  const usesTime = /s$/.test(ex.exercise.defaultReps.trim()) || ex.exercise.defaultReps.includes(" s");
  const repsRef = useRef<HTMLInputElement>(null);

  async function log() {
    setBusy(true);
    try {
      const r = await api.post<{ newRecords: unknown[] }>(`/workouts/${workoutId}/sets`, usesTime ? { workoutExerciseId: ex.id, durationSec: Number(reps), weightKg: kg ? Number(kg) : null, isWarmup: warmup } : { workoutExerciseId: ex.id, reps: Number(reps), weightKg: kg ? Number(kg) : null, isWarmup: warmup });
      onLogged(warmup ? 45 : ex.exercise.defaultRestSec, r.newRecords);
      setWarmup(false);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const working = ex.sets.filter((s) => !s.isWarmup).length;
  return (
    <Card className="p-0">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left" aria-expanded={open}>
        <div className="min-w-0">
          <p className="font-semibold">{ex.exercise.name}</p>
          <p className="text-xs text-muted">{ex.notes ?? `${ex.exercise.defaultSets} × ${ex.exercise.defaultReps}`} · {working} set{working === 1 ? "" : "s"} done</p>
        </div>
        <div className="flex items-center gap-2">
          {working >= ex.exercise.defaultSets ? <Badge tone="lime">Done</Badge> : null}
          <ChevronDown className={cn("h-5 w-5 text-faint transition", open && "rotate-180")} />
        </div>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
          {ex.suggestion ? <p className={cn("rounded-xl px-3 py-2 text-xs", ex.suggestion.action === "increase" ? "bg-lime/10 text-lime" : "bg-surface-2 text-muted")}>{ex.suggestion.text}</p> : null}
          {ex.sets.length ? (
            <ul className="space-y-1">
              {ex.sets.map((st) => (
                <li key={st.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <span className="text-muted">{st.isWarmup ? "Warm-up" : `Set ${st.setNumber}`}</span>
                  <span className="tabular">{st.durationSec ? `${st.durationSec}s` : `${st.reps} reps`}{st.weightKg ? ` × ${st.weightKg} kg` : ""}</span>
                  <button onClick={async () => { await api.del(`/workouts/${workoutId}/sets`, { setId: st.id }); onRemoved(); }} className="text-faint hover:text-red" aria-label="Delete set"><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <NumberInput ref={repsRef} suffix={usesTime ? "sec" : "reps"} value={reps} onChange={(e) => setReps(e.target.value)} aria-label={usesTime ? "Seconds" : "Reps"} />
            <NumberInput suffix="kg" value={kg} onChange={(e) => setKg(e.target.value)} placeholder={ex.exercise.equipment.length ? "kg" : "BW"} aria-label="Weight" />
            <Button className="h-12" onClick={log} loading={busy} disabled={!(Number(reps) > 0)} aria-label="Log set"><Check className="h-5 w-5" /></Button>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={warmup} onChange={(e) => setWarmup(e.target.checked)} className="h-4 w-4 accent-[var(--color-lime)]" /> Warm-up set</label>
            <Link href={`/activity/exercises?slug=${ex.exercise.slug}`} className="text-xs font-semibold text-lime">How to do it</Link>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function AddExerciseSheet({ open, onOpenChange, workoutId, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; workoutId: number; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const list = useApi<{ exercises: { slug: string; name: string; primaryMuscle: string; equipment: string[] }[] }>(open ? `/exercises${q ? `?q=${encodeURIComponent(q)}` : ""}` : null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add exercise" size="lg">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" className="mb-3 h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 focus:outline-none" aria-label="Search exercises" />
      <ul className="space-y-1.5">
        {(list.data?.exercises ?? []).map((e) => (
          <li key={e.slug}>
            <button onClick={async () => { await api.post(`/workouts/${workoutId}/exercises`, { slug: e.slug }); onAdded(); onOpenChange(false); }} className="w-full rounded-2xl bg-surface-2 px-3.5 py-3 text-left hover:bg-surface-3">
              <p className="font-medium">{e.name}</p>
              <p className="text-xs capitalize text-muted">{e.primaryMuscle.replace("_", " ")} · {e.equipment.join(", ") || "bodyweight"}</p>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

