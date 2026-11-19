"use client";

import { Droplets, Hourglass, Moon, Pill, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar as RBar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button, Card, CardHeader, Chip, Field, Input, Notice, NumberInput, ProgressRing, Segmented, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, offlineCapable, useApi } from "@/lib/client/api";
import { addDays } from "@/lib/dates";
import { fmt } from "@/lib/utils";

type Tab = "water" | "sleep" | "fasting" | "supplements";

export default function WellnessPage() {
  const [tab, setTab] = useState<Tab>("water");
  const me = useApi<{ today: string; targets: { waterMl: number; sleepMinutes: number } | null; preferences: { waterGlassMl: number } | null }>("/auth/me");
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Wellness</h1>
      <Segmented<Tab> value={tab} onChange={setTab} size="sm" options={[{ value: "water", label: "Water" }, { value: "sleep", label: "Sleep" }, { value: "fasting", label: "Fasting" }, { value: "supplements", label: "Supplements" }]} />
      {!me.data ? <Skeleton className="h-80" /> : tab === "water" ? <Water today={me.data.today} target={me.data.targets?.waterMl ?? 2500} glass={me.data.preferences?.waterGlassMl ?? 250} /> : tab === "sleep" ? <Sleep today={me.data.today} target={me.data.targets?.sleepMinutes ?? 450} /> : tab === "fasting" ? <Fasting /> : <Supplements today={me.data.today} />}
    </div>
  );
}

function Water({ today, target, glass }: { today: string; target: number; glass: number }) {
  const toast = useToast();
  const { data, mutate } = useApi<{ entries: { id: number; ml: number; loggedAt: string }[] }>(`/wellness/water?date=${today}`);
  const [custom, setCustom] = useState("");
  const total = (data?.entries ?? []).reduce((a, e) => a + e.ml, 0);
  async function add(ml: number) {
    const r = await offlineCapable("POST", "/wellness/water", { date: today, ml }, `${ml} ml water`);
    toast(r.state === "queued" ? `${ml} ml saved offline` : `+${ml} ml`, r.state === "queued" ? "queued" : "success");
    mutate();
    invalidate("/dashboard");
  }
  return (
    <div className="space-y-4">
      <Card className="grid place-items-center py-6">
        <ProgressRing value={total / target} size={200} stroke={16} color="var(--color-cyan)">
          <div><Droplets className="mx-auto h-6 w-6 text-cyan" /><p className="font-display text-4xl font-bold tabular">{fmt.litres(total)}</p><p className="text-sm text-muted">of {fmt.litres(target)}</p></div>
        </ProgressRing>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        {[glass, 500, 1000].map((ml) => <Button key={ml} variant="secondary" size="lg" onClick={() => add(ml)}><Plus className="h-4 w-4" /> {ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`}</Button>)}
      </div>
      <div className="flex gap-2"><NumberInput suffix="ml" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom amount" /><Button disabled={!(Number(custom) > 0)} onClick={() => { add(Number(custom)); setCustom(""); }}>Add</Button></div>
      <Card>
        <CardHeader title="Today" />
        {data?.entries.length ? (
          <ul className="divide-y divide-line">{data.entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted">{new Date(e.loggedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
              <span className="tabular">{e.ml} ml</span>
              <button onClick={async () => { await api.del(`/wellness/water/${e.id}`); mutate(); invalidate("/dashboard"); }} className="text-faint hover:text-red" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}</ul>
        ) : <p className="text-sm text-muted">No water logged yet today.</p>}
      </Card>
      <Notice>Your target (~35 ml/kg) includes all fluids — chai, milk, buttermilk and dal count too. Drink more in heat or after sweaty workouts.</Notice>
    </div>
  );
}

function Sleep({ today, target }: { today: string; target: number }) {
  const toast = useToast();
  const { data, mutate } = useApi<{ sleep: { id: number; date: string; durationMin: number; quality: number | null; source: string; bedtime: string | null; wakeTime: string | null }[] }>(`/wellness/sleep?from=${addDays(today, -29)}`);
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  const [quality, setQuality] = useState(3);
  const [date, setDate] = useState(today);
  async function save() {
    const wakeAt = new Date(`${date}T${wake}:00`);
    let bedAt = new Date(`${date}T${bed}:00`);
    if (bedAt >= wakeAt) bedAt = new Date(bedAt.getTime() - 86_400_000);
    try {
      await api.post("/wellness/sleep", { date, bedtime: bedAt.toISOString(), wakeTime: wakeAt.toISOString(), quality });
      toast("Sleep logged");
      mutate();
      invalidate("/dashboard");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  const rows = [...(data?.sleep ?? [])].reverse().map((s) => ({ date: s.date.slice(5), hours: Math.round((s.durationMin / 60) * 10) / 10 }));
  const avg = rows.length ? rows.reduce((a, r) => a + r.hours, 0) / rows.length : null;
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardHeader title="Log sleep" subtitle={`Target ${fmt.minutes(target)}`} icon={<Moon className="h-5 w-5" />} />
        <Field label="Woke up on"><Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bedtime"><Input type="time" value={bed} onChange={(e) => setBed(e.target.value)} /></Field>
          <Field label="Wake time"><Input type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></Field>
        </div>
        <Field label="How did you sleep?">
          <div className="flex gap-2">{[1, 2, 3, 4, 5].map((q) => <Chip key={q} active={quality === q} onClick={() => setQuality(q)}>{["😫", "😕", "😐", "🙂", "😴"][q - 1]}</Chip>)}</div>
        </Field>
        <Button className="w-full" onClick={save}>Save</Button>
      </Card>
      <Card>
        <CardHeader title="Last 30 days" subtitle={avg ? `Average ${avg.toFixed(1)} h` : "No data yet"} />
        {rows.length ? (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ left: -24, right: 4 }}>
                <XAxis dataKey="date" stroke="#69736b" fontSize={10} minTickGap={16} />
                <YAxis stroke="#69736b" fontSize={10} domain={[0, 12]} />
                <Tooltip contentStyle={{ background: "#1b201c", border: "1px solid #2a312c", borderRadius: 12 }} />
                <RBar dataKey="hours" fill="#a78bfa" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-muted">Log a few nights to see your pattern. Imported sleep from Google Fit appears here too.</p>}
      </Card>
    </div>
  );
}

function Fasting() {
  const toast = useToast();
  const { data, mutate } = useApi<{ history: { id: number; startedAt: string; endedAt: string | null; targetHours: number }[] }>("/wellness/fasting");
  const [hours, setHours] = useState(14);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const active = data?.history.find((f) => !f.endedAt);
  const elapsedH = active ? (now - Date.parse(active.startedAt)) / 3_600_000 : 0;
  return (
    <div className="space-y-4">
      <Notice>Fasting is optional and not required for fat loss — total intake over the week matters most. Windows are capped at 24 h. If you have diabetes, are pregnant, or have a history of disordered eating, speak to a doctor first.</Notice>
      {active ? (
        <Card className="grid place-items-center gap-4 py-6">
          <ProgressRing value={elapsedH / active.targetHours} size={200} stroke={14} color="var(--color-orange)">
            <div><Hourglass className="mx-auto h-6 w-6 text-orange" /><p className="font-display text-3xl font-bold tabular">{Math.floor(elapsedH)}h {Math.floor((elapsedH % 1) * 60)}m</p><p className="text-sm text-muted">of {active.targetHours} h</p></div>
          </ProgressRing>
          <Button onClick={async () => { await api.patch("/wellness/fasting", {}); mutate(); toast("Fast ended"); invalidate("/dashboard"); }}>End fast</Button>
        </Card>
      ) : (
        <Card className="space-y-3">
          <CardHeader title="Start a fasting window" icon={<Hourglass className="h-5 w-5" />} />
          <div className="flex flex-wrap gap-2">{[12, 13, 14, 16].map((h) => <Chip key={h} active={hours === h} onClick={() => setHours(h)}>{h}:{24 - h}</Chip>)}</div>
          <Button className="w-full" onClick={async () => { try { await api.post("/wellness/fasting", { targetHours: hours }); mutate(); } catch (e) { toast((e as Error).message, "error"); } }}>Start {hours} h window</Button>
        </Card>
      )}
      <Card>
        <CardHeader title="History" />
        <ul className="divide-y divide-line text-sm">
          {(data?.history ?? []).filter((f) => f.endedAt).map((f) => (
            <li key={f.id} className="flex justify-between py-2"><span className="text-muted">{new Date(f.startedAt).toLocaleDateString("en-IN")}</span><span className="tabular">{((Date.parse(f.endedAt!) - Date.parse(f.startedAt)) / 3_600_000).toFixed(1)} h / {f.targetHours} h</span></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Supplements({ today }: { today: string }) {
  const toast = useToast();
  const { data, mutate } = useApi<{ supplements: { id: number; name: string; dose: number; unit: string; kcal: number | null; proteinG: number | null }[] }>(`/wellness/supplements?date=${today}`);
  const [f, setF] = useState({ name: "", dose: "", unit: "g", kcal: "", protein: "" });
  async function add() {
    try {
      await api.post("/wellness/supplements", { date: today, name: f.name, dose: Number(f.dose), unit: f.unit, kcal: f.kcal ? Number(f.kcal) : null, proteinG: f.protein ? Number(f.protein) : null });
      setF({ name: "", dose: "", unit: "g", kcal: "", protein: "" });
      mutate();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardHeader title="Log a supplement" icon={<Pill className="h-5 w-5" />} />
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Whey protein, Vitamin D3, Creatine" />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput value={f.dose} onChange={(e) => setF({ ...f, dose: e.target.value })} placeholder="Dose" />
          <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="h-12 rounded-2xl border border-line bg-surface-2 px-4" aria-label="Unit">{["g", "mg", "mcg", "IU", "scoop", "capsule", "tablet", "ml"].map((u) => <option key={u}>{u}</option>)}</select>
          <NumberInput suffix="kcal" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} placeholder="Calories (label)" />
          <NumberInput suffix="g P" value={f.protein} onChange={(e) => setF({ ...f, protein: e.target.value })} placeholder="Protein (label)" />
        </div>
        <Button className="w-full" onClick={add} disabled={!f.name.trim() || !(Number(f.dose) > 0)}>Add</Button>
        <p className="text-[11px] text-faint">For tracking only — the app doesn&apos;t recommend supplements or doses. Protein powders with calories are better logged as foods (scan the label) so they count toward your totals.</p>
      </Card>
      <Card>
        <CardHeader title="Today" />
        {data?.supplements.length ? (
          <ul className="divide-y divide-line text-sm">{data.supplements.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2"><span>{s.name}</span><span className="tabular text-muted">{s.dose} {s.unit}</span><button onClick={async () => { await api.del(`/wellness/supplements/${s.id}`); mutate(); }} className="text-faint hover:text-red" aria-label="Delete"><Trash2 className="h-4 w-4" /></button></li>
          ))}</ul>
        ) : <p className="text-sm text-muted">Nothing logged today.</p>}
      </Card>
    </div>
  );
}
