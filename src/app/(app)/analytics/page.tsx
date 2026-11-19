"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, CardHeader, Chip, ErrorState, Input, Notice, Skeleton } from "@/components/ui/primitives";
import { useApi } from "@/lib/client/api";
import { addDays } from "@/lib/dates";
import { fmt } from "@/lib/utils";

interface Day { date: string; logged: boolean; kcalIn: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; exerciseNetKcal: number; exerciseMinutes: number; steps: number; distanceKm: number; waterMl: number; sleepMin: number; expenditure: number }
interface Analytics {
  from: string;
  to: string;
  days: Day[];
  weights: { date: string; weightKg: number; trendKg: number }[];
  measurements: { date: string; waistCm: number | null }[];
  calendar: { date: string; workouts: number; minutes: number }[];
  adaptive: { estimate: number | null; reason: string; daysUsed: number; loggedDays: number };
}

const RANGES = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["182", "6 months"], ["365", "1 year"]] as const;
const grid = <CartesianGrid stroke="#2a312c" vertical={false} />;
const tip = <Tooltip contentStyle={{ background: "#1b201c", border: "1px solid #2a312c", borderRadius: 12, fontSize: 12 }} />;
const xAxis = <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} stroke="#69736b" fontSize={10} minTickGap={20} />;

export default function AnalyticsPage() {
  const me = useApi<{ today: string; targets: { calories: number; proteinG: number } | null }>("/auth/me");
  const [range, setRange] = useState<string>("30");
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const today = me.data?.today;
  const from = range === "custom" ? custom.from : today ? addDays(today, -Number(range) + 1) : "";
  const to = range === "custom" ? custom.to : today ?? "";
  const { data, error, mutate } = useApi<Analytics>(from && to ? `/analytics?from=${from}&to=${to}` : null);

  const weekly = (() => {
    if (!data) return [];
    const out: { week: string; intake: number; expenditure: number; balance: number }[] = [];
    for (let i = 0; i < data.days.length; i += 7) {
      const chunk = data.days.slice(i, i + 7).filter((d) => d.logged);
      if (!chunk.length) continue;
      const intake = chunk.reduce((a, d) => a + d.kcalIn, 0) / chunk.length;
      const exp = chunk.reduce((a, d) => a + d.expenditure, 0) / chunk.length;
      out.push({ week: data.days[i]!.date.slice(5), intake: Math.round(intake), expenditure: Math.round(exp), balance: Math.round(intake - exp) });
    }
    return out;
  })();
  const logged = data?.days.filter((d) => d.logged) ?? [];
  const consistency = data ? Math.round((logged.length / data.days.length) * 100) : 0;
  const workoutDays = data?.calendar.filter((c) => c.workouts > 0).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        {from && to ? <Button asChild size="sm" variant="secondary"><a href={`/api/v1/reports?kind=custom&from=${from}&to=${to}&format=pdf`}><Download className="h-4 w-4" /> PDF</a></Button> : null}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {RANGES.map(([v, l]) => <Chip key={v} active={range === v} onClick={() => setRange(v)}>{l}</Chip>)}
        <Chip active={range === "custom"} onClick={() => setRange("custom")}>Custom</Chip>
      </div>
      {range === "custom" ? (
        <div className="grid grid-cols-2 gap-2"><Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="From" /><Input type="date" value={custom.to} max={today} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="To" /></div>
      ) : null}
      {error ? <ErrorState error={error} onRetry={() => mutate()} /> : null}
      {!data ? <Skeleton className="h-96" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Logging consistency", `${consistency}%`, `${logged.length}/${data.days.length} days`],
              ["Avg intake", logged.length ? fmt.int(logged.reduce((a, d) => a + d.kcalIn, 0) / logged.length) : "—", "kcal on logged days"],
              ["Avg protein", logged.length ? `${fmt.int(logged.reduce((a, d) => a + d.proteinG, 0) / logged.length)} g` : "—", me.data?.targets ? `target ${me.data.targets.proteinG} g` : ""],
              ["Workout days", String(workoutDays), `avg ${fmt.int(data.days.reduce((a, d) => a + d.steps, 0) / data.days.length)} steps`],
            ].map(([l, v, s]) => <Card key={l} className="p-3.5"><p className="text-xs text-muted">{l}</p><p className="font-display text-xl font-bold tabular">{v}</p><p className="text-[11px] text-faint">{s}</p></Card>)}
          </div>

          <Card>
            <CardHeader title="Adaptive maintenance estimate" subtitle="From your intake and weight trend" />
            {data.adaptive.estimate ? (
              <p className="text-sm">Your data suggests maintenance is about <b className="text-lime">{fmt.int(data.adaptive.estimate)} kcal/day</b> (over {data.adaptive.daysUsed} days). Compare with your target to judge whether to adjust — only after 3+ weeks of consistent logging.</p>
            ) : <p className="text-sm text-muted">{data.adaptive.reason}</p>}
          </Card>

          <Card>
            <CardHeader title="Daily calories" subtitle="Intake vs estimated expenditure" />
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data.days} margin={{ left: -16, right: 4 }}>{grid}{xAxis}<YAxis stroke="#69736b" fontSize={10} />{tip}<Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="kcalIn" name="Intake" fill="#B6F34A" radius={[4, 4, 0, 0]} isAnimationActive={false} /><Line dataKey="expenditure" name="Est. expenditure" stroke="#ff9a3d" dot={false} strokeWidth={2} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>
          </Card>

          {weekly.length ? (
            <Card>
              <CardHeader title="Weekly energy balance" subtitle="Average per logged day (estimate)" />
              <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} margin={{ left: -16, right: 4 }}>{grid}<XAxis dataKey="week" stroke="#69736b" fontSize={10} /><YAxis stroke="#69736b" fontSize={10} />{tip}<Bar dataKey="balance" name="Balance" fill="#4aa8ff" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Macronutrients" subtitle="Grams per day" />
            <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.days} margin={{ left: -16, right: 4 }}>{grid}{xAxis}<YAxis stroke="#69736b" fontSize={10} />{tip}<Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="proteinG" name="Protein" stackId="m" fill="#4aa8ff" isAnimationActive={false} /><Bar dataKey="carbsG" name="Carbs" stackId="m" fill="#ff9a3d" isAnimationActive={false} /><Bar dataKey="fatG" name="Fat" stackId="m" fill="#a78bfa" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Fibre" />
              <div className="h-40"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.days} margin={{ left: -24, right: 4 }}>{grid}{xAxis}<YAxis stroke="#69736b" fontSize={10} />{tip}<Bar dataKey="fibreG" name="Fibre g" fill="#2fd4e0" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
            </Card>
            <Card>
              <CardHeader title="Steps & exercise" />
              <div className="h-40"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data.days} margin={{ left: -16, right: 4 }}>{grid}{xAxis}<YAxis yAxisId="s" stroke="#69736b" fontSize={10} /><YAxis yAxisId="m" orientation="right" hide />{tip}<Bar yAxisId="s" dataKey="steps" name="Steps" fill="#ff9a3d" radius={[4, 4, 0, 0]} isAnimationActive={false} /><Line yAxisId="m" dataKey="exerciseMinutes" name="Exercise min" stroke="#B6F34A" dot={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>
            </Card>
          </div>

          {data.weights.length > 1 ? (
            <Card>
              <CardHeader title="Weight" />
              <div className="h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.weights} margin={{ left: -16, right: 4 }}>{grid}{xAxis}<YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#69736b" fontSize={10} />{tip}<Line dataKey="weightKg" name="Weight" stroke="#69736b" dot={{ r: 2 }} isAnimationActive={false} /><Line dataKey="trendKg" name="Trend" stroke="#B6F34A" strokeWidth={3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
            </Card>
          ) : null}
          {data.measurements.length > 1 ? (
            <Card>
              <CardHeader title="Waist" />
              <div className="h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.measurements.filter((m) => m.waistCm != null)} margin={{ left: -16, right: 4 }}>{grid}{xAxis}<YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#69736b" fontSize={10} />{tip}<Line dataKey="waistCm" name="Waist cm" stroke="#2fd4e0" strokeWidth={3} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
            </Card>
          ) : null}
          <Notice>Expenditure, energy balance and adaptive maintenance are estimates based on formulas and your logs, not measurements.</Notice>
        </>
      )}
    </div>
  );
}
