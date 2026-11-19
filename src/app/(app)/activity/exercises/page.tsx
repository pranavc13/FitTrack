"use client";

import { AlertTriangle, ExternalLink, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Badge, Card, Chip, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useApi } from "@/lib/client/api";

const MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "abs", "core", "quadriceps", "hamstrings", "glutes", "calves", "full_body"];

interface Exercise { slug: string; name: string; primaryMuscle: string; secondaryMuscles: string[]; equipment: string[]; difficulty: string; location: string; defaultSets: number; defaultReps: string }
interface Detail {
  exercise: Exercise & { instructions: string[]; commonMistakes: string[]; defaultRestSec: number; met: number; metCode: string | null; mechanics: string };
  alternatives: { slug: string; name: string }[];
  history: { date: string; setNumber: number; reps: number | null; weightKg: number | null }[];
  records: { kind: string; value: number; detail: string }[];
  suggestion: { text: string } | null;
}

export default function ExercisesPage() {
  return (
    <Suspense>
      <Library />
    </Suspense>
  );
}

function Library() {
  const params = useSearchParams();
  const router = useRouter();
  const [muscle, setMuscle] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const slug = params.get("slug");
  const qs = new URLSearchParams();
  if (muscle) qs.set("muscle", muscle);
  if (location) qs.set("location", location);
  if (q) qs.set("q", q);
  const { data } = useApi<{ exercises: Exercise[] }>(`/exercises?${qs}`);
  const detail = useApi<Detail>(slug ? `/exercises/${slug}` : null);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Exercise library</h1>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" aria-label="Search exercises" className="h-12 w-full rounded-2xl border border-line bg-surface-2 pl-12 pr-4 focus:outline-none" />
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={!location} onClick={() => setLocation(null)}>Anywhere</Chip>
        <Chip active={location === "home"} onClick={() => setLocation("home")}>Home</Chip>
        <Chip active={location === "gym"} onClick={() => setLocation("gym")}>Gym</Chip>
        <span className="mx-1 w-px shrink-0 bg-line" />
        {MUSCLES.map((m) => <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)} className="capitalize">{m.replace("_", " ")}</Chip>)}
      </div>
      {!data ? <Skeleton className="h-80" /> : (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.exercises.map((e) => (
            <button key={e.slug} onClick={() => router.push(`/activity/exercises?slug=${e.slug}`)} className="rounded-2xl border border-line bg-surface p-3.5 text-left hover:bg-surface-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{e.name}</p>
                <Badge tone={e.difficulty === "beginner" ? "lime" : e.difficulty === "intermediate" ? "blue" : "orange"}>{e.difficulty}</Badge>
              </div>
              <p className="mt-0.5 text-xs capitalize text-muted">{e.primaryMuscle.replace("_", " ")} · {e.equipment.join(", ") || "bodyweight"} · {e.defaultSets} × {e.defaultReps}</p>
            </button>
          ))}
        </div>
      )}
      <Sheet open={Boolean(slug)} onOpenChange={(o) => !o && router.replace("/activity/exercises")} title={detail.data?.exercise.name ?? "Exercise"} size="lg">
        {detail.data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="lime" className="capitalize">{detail.data.exercise.primaryMuscle.replace("_", " ")}</Badge>
              {detail.data.exercise.secondaryMuscles.map((m) => <Badge key={m} className="capitalize">{m.replace("_", " ")}</Badge>)}
              <Badge tone="blue">{detail.data.exercise.mechanics}</Badge>
            </div>
            <Card className="grid grid-cols-3 gap-2 text-center">
              <div><p className="font-semibold">{detail.data.exercise.defaultSets}</p><p className="text-[11px] text-faint">sets</p></div>
              <div><p className="font-semibold">{detail.data.exercise.defaultReps}</p><p className="text-[11px] text-faint">reps</p></div>
              <div><p className="font-semibold">{detail.data.exercise.defaultRestSec}s</p><p className="text-[11px] text-faint">rest</p></div>
            </Card>
            {detail.data.suggestion ? <p className="rounded-xl bg-lime/10 px-3 py-2 text-sm text-lime">{detail.data.suggestion.text}</p> : null}
            <div>
              <p className="mb-2 font-semibold">How to</p>
              <ol className="space-y-2">{detail.data.exercise.instructions.map((s, i) => <li key={i} className="flex gap-3 text-sm"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-orange" /> Common mistakes</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{detail.data.exercise.commonMistakes.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
            {detail.data.alternatives.length ? (
              <div>
                <p className="mb-2 font-semibold">Alternatives</p>
                <div className="flex flex-wrap gap-2">{detail.data.alternatives.map((a) => <Chip key={a.slug} onClick={() => router.replace(`/activity/exercises?slug=${a.slug}`)}>{a.name}</Chip>)}</div>
              </div>
            ) : null}
            {detail.data.records.length ? (
              <div>
                <p className="mb-2 font-semibold">Your bests</p>
                <ul className="space-y-1 text-sm">{detail.data.records.map((r, i) => <li key={i} className="flex justify-between"><span className="text-muted">{r.kind.replace(/_/g, " ")}</span><span>{r.detail}</span></li>)}</ul>
              </div>
            ) : null}
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(detail.data.exercise.name + " proper form")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-semibold text-lime">
              <ExternalLink className="h-4 w-4" /> Watch form videos (opens YouTube)
            </a>
            <p className="text-[11px] text-faint">Energy estimate uses Compendium MET {detail.data.exercise.met}{detail.data.exercise.metCode ? ` (code ${detail.data.exercise.metCode})` : ""}. Stop if you feel pain; consult a professional for injuries.</p>
          </div>
        ) : <Skeleton className="h-60" />}
      </Sheet>
    </div>
  );
}
