"use client";

import { Camera, Download, FileText, Lock, Ruler, Scale, Trash2, Trophy } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CompareSlider } from "@/components/progress/compare-slider";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Notice, NumberInput, Segmented, Select, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, offlineCapable, useApi } from "@/lib/client/api";
import { compressImage } from "@/lib/client/image";
import { fmt } from "@/lib/utils";

interface Weight { id: number; date: string; weightKg: number; trendKg: number; notes: string | null }
interface Measurement { id: number; date: string; waistCm: number | null; chestCm: number | null; hipsCm: number | null; armCm: number | null; thighCm: number | null; neckCm: number | null; bodyFatPct: number | null; bodyFatMethod: string | null }
interface Photo { id: number; date: string; pose: string; imageKey: string; weightKg: number | null; waistCm: number | null; notes: string | null }

type Tab = "timeline" | "photos" | "reports";
const tooltipStyle = { background: "#1b201c", border: "1px solid #2a312c", borderRadius: 12, fontSize: 12 };

export default function ProgressPage() {
  const [tab, setTab] = useState<Tab>("timeline");
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Transformation</h1>
      <Segmented<Tab> value={tab} onChange={setTab} options={[{ value: "timeline", label: "Timeline" }, { value: "photos", label: "Photos" }, { value: "reports", label: "Reports" }]} />
      {tab === "timeline" ? <Timeline /> : tab === "photos" ? <Photos /> : <Reports />}
    </div>
  );
}

function Timeline() {
  const toast = useToast();
  const me = useApi<{ today: string; profile: { targetWeightKg: number | null; heightCm: number | null } | null }>("/auth/me");
  const [range, setRange] = useState("90");
  const weights = useApi<{ history: Weight[]; analysis: { plateau: { message: string; status: string }; prediction: { weeksLow: number | null; weeksHigh: number | null; basis: string } | null } }>(`/body/weight?days=${range}`);
  const measures = useApi<{ measurements: Measurement[] }>("/body/measurements");
  const milestones = useApi<{ milestones: { id: number; title: string; achievedAt: string }[] }>("/milestones");
  const [weightOpen, setWeightOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [metric, setMetric] = useState<keyof Measurement>("waistCm");

  const w = weights.data?.history ?? [];
  const first = w[0];
  const last = w.at(-1);
  const m = measures.data?.measurements ?? [];
  const firstWaist = m.find((x) => x.waistCm != null);
  const lastWaist = [...m].reverse().find((x) => x.waistCm != null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Starting", first ? `${fmt.dec(first.weightKg)} kg` : "—"],
          ["Current trend", last ? `${fmt.dec(last.trendKg)} kg` : "—"],
          ["Target", me.data?.profile?.targetWeightKg ? `${me.data.profile.targetWeightKg} kg` : "—"],
          ["Waist", firstWaist && lastWaist ? `${fmt.dec(firstWaist.waistCm)} → ${fmt.dec(lastWaist.waistCm)} cm` : "—"],
        ].map(([l, v]) => (
          <Card key={l} className="p-3.5"><p className="text-xs text-muted">{l}</p><p className="mt-1 font-display text-lg font-bold tabular">{v}</p></Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setWeightOpen(true)}><Scale className="h-4 w-4" /> Log weight</Button>
        <Button variant="secondary" onClick={() => setMeasureOpen(true)}><Ruler className="h-4 w-4" /> Measurements</Button>
      </div>

      <Card>
        <CardHeader title="Weight" subtitle="Daily readings and smoothed trend" action={<Select value={range} onChange={(e) => setRange(e.target.value)} className="h-9 w-28 text-sm">{[["30", "30 days"], ["90", "90 days"], ["180", "6 months"], ["365", "1 year"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>} />
        {w.length > 1 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={w} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid stroke="#2a312c" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} stroke="#69736b" fontSize={11} minTickGap={24} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#69736b" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="weightKg" name="Weight" stroke="#69736b" dot={{ r: 2 }} strokeWidth={1} isAnimationActive={false} />
                <Line type="monotone" dataKey="trendKg" name="Trend" stroke="#B6F34A" dot={false} strokeWidth={3} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyState icon={<Scale className="h-5 w-5" />} title="Not enough weigh-ins" body="Weigh in 3–7 times a week (same time, after the bathroom) for a reliable trend." />}
        {weights.data ? <p className="mt-2 text-sm text-muted">{weights.data.analysis.plateau.message}</p> : null}
        {weights.data?.analysis.prediction?.weeksLow != null ? <p className="text-sm">Estimated {weights.data.analysis.prediction.weeksLow}–{weights.data.analysis.prediction.weeksHigh} weeks to target <span className="text-xs text-faint">(estimate)</span></p> : null}
      </Card>

      <Card>
        <CardHeader title="Body measurements" action={<Select value={metric} onChange={(e) => setMetric(e.target.value as keyof Measurement)} className="h-9 w-32 text-sm">{[["waistCm", "Waist"], ["chestCm", "Chest"], ["hipsCm", "Hips"], ["armCm", "Arm"], ["thighCm", "Thigh"], ["bodyFatPct", "Body fat %"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>} />
        {m.filter((x) => x[metric] != null).length > 1 ? (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.filter((x) => x[metric] != null)} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid stroke="#2a312c" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} stroke="#69736b" fontSize={11} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#69736b" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey={metric as string} stroke="#2fd4e0" strokeWidth={3} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-muted">Log measurements weekly to chart them. Body fat % is only shown if you enter a measured value — it&apos;s never guessed from photos.</p>}
      </Card>

      <Card>
        <CardHeader title="Milestones" icon={<Trophy className="h-5 w-5" />} />
        {milestones.data?.milestones.length ? (
          <ol className="relative space-y-3 border-l border-line pl-5">
            {milestones.data.milestones.map((ms) => (
              <li key={ms.id}>
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-lime" />
                <p className="font-medium">{ms.title}</p>
                <p className="text-xs text-muted">{new Date(ms.achievedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-muted">Your first milestones (1 kg lost, 7-day streak, first workout…) will appear here.</p>}
      </Card>

      <Card>
        <CardHeader title="Weigh-in log" />
        <ul className="max-h-72 divide-y divide-line overflow-y-auto">
          {[...w].reverse().map((x) => (
            <li key={x.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted">{x.date}</span>
              <span className="tabular">{fmt.dec(x.weightKg)} kg <span className="text-faint">(trend {fmt.dec(x.trendKg)})</span></span>
              <button onClick={async () => { await api.del(`/body/weight/${x.id}`); weights.mutate(); }} className="text-faint hover:text-red" aria-label={`Delete weigh-in ${x.date}`}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </Card>

      {me.data ? <WeightSheet open={weightOpen} onOpenChange={setWeightOpen} today={me.data.today} onSaved={() => { weights.mutate(); milestones.mutate(); invalidate("/dashboard", "/goals"); }} /> : null}
      {me.data ? <MeasureSheet open={measureOpen} onOpenChange={setMeasureOpen} today={me.data.today} onSaved={() => { measures.mutate(); milestones.mutate(); toast("Measurements saved"); }} /> : null}
    </div>
  );
}

function WeightSheet({ open, onOpenChange, today, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; today: string; onSaved: () => void }) {
  const toast = useToast();
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState("");
  async function save() {
    try {
      const r = await offlineCapable("POST", "/body/weight", { date, weightKg: Number(kg) }, "weight");
      toast(r.state === "queued" ? "Saved offline — will sync" : "Weight logged", r.state === "queued" ? "queued" : "success");
      onSaved();
      onOpenChange(false);
      setKg("");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Log weight">
      <div className="space-y-3">
        <NumberInput suffix="kg" value={kg} onChange={(e) => setKg(e.target.value)} autoFocus placeholder="72.4" />
        <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <p className="text-xs text-muted">Daily weight swings of 0.5–2 kg are normal (water, salt, food). The trend line smooths these out.</p>
        <Button className="w-full" onClick={save} disabled={!(Number(kg) > 20)}>Save</Button>
      </div>
    </Sheet>
  );
}

function MeasureSheet({ open, onOpenChange, today, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; today: string; onSaved: () => void }) {
  const toast = useToast();
  const [v, setV] = useState<Record<string, string>>({ date: today });
  const fields: [string, string][] = [["waistCm", "Waist (at navel)"], ["chestCm", "Chest"], ["hipsCm", "Hips"], ["armCm", "Arm (flexed)"], ["thighCm", "Thigh"], ["neckCm", "Neck"]];
  async function save() {
    try {
      const body: Record<string, unknown> = { date: v.date };
      for (const [k] of fields) if (v[k]) body[k] = Number(v[k]);
      if (v.bodyFatPct) { body.bodyFatPct = Number(v.bodyFatPct); body.bodyFatMethod = v.bodyFatMethod || "user-entered"; }
      await api.post("/body/measurements", body);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Body measurements" size="lg">
      <div className="space-y-3">
        <Input type="date" value={v.date} max={today} onChange={(e) => setV({ ...v, date: e.target.value })} aria-label="Date" />
        <div className="grid grid-cols-2 gap-3">
          {fields.map(([k, l]) => <Field key={k} label={l}><NumberInput suffix="cm" value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Body fat % (measured only)"><NumberInput suffix="%" value={v.bodyFatPct ?? ""} onChange={(e) => setV({ ...v, bodyFatPct: e.target.value })} /></Field>
          <Field label="Method"><Select value={v.bodyFatMethod ?? ""} onChange={(e) => setV({ ...v, bodyFatMethod: e.target.value })}><option value="">—</option><option>DEXA</option><option>Calipers</option><option>Smart scale (BIA)</option><option>Other</option></Select></Field>
        </div>
        <Button className="w-full" onClick={save}>Save</Button>
      </div>
    </Sheet>
  );
}

function Photos() {
  const toast = useToast();
  const me = useApi<{ today: string }>("/auth/me");
  const { data, mutate } = useApi<{ photos: Photo[] }>("/body/photos");
  const fileRef = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState("front");
  const [uploading, setUploading] = useState(false);
  const [cmp, setCmp] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [comparePose, setComparePose] = useState("front");

  const photos = data?.photos ?? [];
  const byDate = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const p of photos) map.set(p.date, [...(map.get(p.date) ?? []), p]);
    return [...map.entries()];
  }, [photos]);
  const ofPose = photos.filter((p) => p.pose === comparePose).sort((x, y) => x.date.localeCompare(y.date));
  const a = ofPose.find((p) => p.id === cmp.a) ?? ofPose[0];
  const b = ofPose.find((p) => p.id === cmp.b) ?? ofPose.at(-1);

  async function upload(file: File | undefined) {
    if (!file || !me.data) return;
    setUploading(true);
    try {
      const blob = await compressImage(file, 1600, 0.85);
      const f = new FormData();
      f.append("images", blob, "progress.jpg");
      f.set("date", me.data.today);
      f.set("pose", pose);
      await api.upload("/body/photos", f);
      toast("Photo saved privately");
      mutate();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3"><Lock className="h-5 w-5 shrink-0 text-lime" /><p className="text-sm text-muted">Progress photos are private to your account and never shared or analysed by AI.</p></Card>
      <Card className="space-y-3">
        <Segmented value={pose} onChange={setPose} size="sm" options={[{ value: "front", label: "Front" }, { value: "side", label: "Side" }, { value: "back", label: "Back" }]} />
        <Button className="w-full" loading={uploading} onClick={() => fileRef.current?.click()}><Camera className="h-4 w-4" /> Add {pose} photo</Button>
        <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <p className="text-xs text-faint">Tip: same spot, lighting, time of day and clothing each time makes comparisons meaningful.</p>
      </Card>

      {ofPose.length >= 2 && a && b ? (
        <Card className="space-y-3">
          <CardHeader title="Before & after" action={<Select value={comparePose} onChange={(e) => setComparePose(e.target.value)} className="h-9 w-24 text-sm"><option value="front">Front</option><option value="side">Side</option><option value="back">Back</option></Select>} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={a.id} onChange={(e) => setCmp({ ...cmp, a: Number(e.target.value) })} aria-label="Before date">{ofPose.map((p) => <option key={p.id} value={p.id}>{p.date}</option>)}</Select>
            <Select value={b.id} onChange={(e) => setCmp({ ...cmp, b: Number(e.target.value) })} aria-label="After date">{ofPose.map((p) => <option key={p.id} value={p.id}>{p.date}</option>)}</Select>
          </div>
          <CompareSlider before={`/api/v1/files/${a.imageKey}`} after={`/api/v1/files/${b.imageKey}`} beforeLabel={`${a.date}${a.weightKg ? ` · ${a.weightKg} kg` : ""}`} afterLabel={`${b.date}${b.weightKg ? ` · ${b.weightKg} kg` : ""}`} />
        </Card>
      ) : null}

      {!data ? <Skeleton className="h-60" /> : byDate.length ? (
        <div className="space-y-3">
          {byDate.map(([date, ps]) => (
            <Card key={date}>
              <p className="mb-2 font-semibold">{new Date(date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</p>
              <div className="grid grid-cols-3 gap-2">
                {ps.map((p) => (
                  <div key={p.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-2">
                    <img src={`/api/v1/files/${p.imageKey}`} alt={`${p.pose} ${p.date}`} loading="lazy" className="h-full w-full object-cover" />
                    <Badge className="absolute bottom-1.5 left-1.5 capitalize">{p.pose}</Badge>
                    <button onClick={async () => { if (!confirm("Delete this photo permanently?")) return; await api.del(`/body/photos/${p.id}`); mutate(); }} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white" aria-label="Delete photo"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          <Button variant="danger" className="w-full" onClick={async () => { if (!confirm("Delete ALL progress photos? This cannot be undone.")) return; await api.del("/body/photos"); mutate(); toast("All photos deleted"); }}>
            <Trash2 className="h-4 w-4" /> Delete entire photo history
          </Button>
        </div>
      ) : <EmptyState icon={<Camera className="h-5 w-5" />} title="No photos yet" body="Take front, side and back photos every 2–4 weeks." />}
    </div>
  );
}

function Reports() {
  const me = useApi<{ today: string }>("/auth/me");
  const [kind, setKind] = useState<"weekly" | "monthly" | "transformation">("weekly");
  const report = useApi<{ title: string; report: { from: string; to: string; daysLogged: number; daysInPeriod: number; nutrition: Record<string, number | null>; activity: Record<string, number | null>; body: Record<string, number | null>; wellness: Record<string, number | null>; energy: Record<string, number | null>; milestones: string[] } }>(`/reports?kind=${kind}`);
  const r = report.data?.report;
  return (
    <div className="space-y-4">
      <Segmented value={kind} onChange={setKind} size="sm" options={[{ value: "weekly", label: "This week" }, { value: "monthly", label: "This month" }, { value: "transformation", label: "6 months" }]} />
      {!r ? <Skeleton className="h-80" /> : (
        <Card className="space-y-4">
          <CardHeader title={report.data!.title} subtitle={`${r.from} → ${r.to} · food logged ${r.daysLogged}/${r.daysInPeriod} days`} icon={<FileText className="h-5 w-5" />} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Avg calories", r.nutrition.avgKcal != null ? `${fmt.int(r.nutrition.avgKcal)}` : "—", r.nutrition.targetKcal ? `target ${r.nutrition.targetKcal}` : ""],
              ["Avg protein", r.nutrition.avgProteinG != null ? `${fmt.int(r.nutrition.avgProteinG)} g` : "—", r.nutrition.targetProteinG ? `target ${r.nutrition.targetProteinG} g` : ""],
              ["Avg steps", fmt.int(r.activity.avgSteps), `${r.activity.workouts ?? 0} workouts`],
              ["Weight", r.body.weightStart != null ? `${fmt.dec(r.body.weightStart)}→${fmt.dec(r.body.weightEnd)}` : "—", r.body.trendChange != null ? `trend ${r.body.trendChange > 0 ? "+" : ""}${r.body.trendChange} kg` : ""],
            ].map(([l, v, s]) => (
              <div key={l} className="rounded-2xl bg-surface-2 p-3"><p className="text-xs text-muted">{l}</p><p className="font-display text-lg font-bold tabular">{v}</p><p className="text-[11px] text-faint">{s}</p></div>
            ))}
          </div>
          <ul className="space-y-1 text-sm text-muted">
            <li>Days within ±10% of calorie target: <b className="text-ink">{r.nutrition.daysWithinCalorieTarget ?? "—"}</b></li>
            <li>Days protein target met: <b className="text-ink">{r.nutrition.daysProteinMet ?? "—"}</b></li>
            <li>Avg estimated energy balance: <b className="text-ink">{r.energy.avgBalance != null ? `${r.energy.avgBalance > 0 ? "+" : ""}${r.energy.avgBalance} kcal/day` : "—"}</b></li>
            <li>Exercise: <b className="text-ink">{fmt.int(r.activity.totalExerciseMin)} min</b> over {r.activity.activeDays} active days</li>
            <li>Sleep: <b className="text-ink">{r.wellness.avgSleepH ?? "—"} h</b> · Water: <b className="text-ink">{r.wellness.avgWaterMl ? fmt.litres(r.wellness.avgWaterMl) : "—"}</b></li>
            {r.body.waistStart != null ? <li>Waist: <b className="text-ink">{r.body.waistStart} → {r.body.waistEnd} cm</b></li> : null}
          </ul>
          {r.milestones.length ? <div className="flex flex-wrap gap-1.5">{r.milestones.map((m) => <Badge key={m} tone="lime">{m}</Badge>)}</div> : null}
          <Button asChild className="w-full"><a href={`/api/v1/reports?kind=${kind}&format=pdf`}><Download className="h-4 w-4" /> Download PDF</a></Button>
        </Card>
      )}
      <Card>
        <CardHeader title="Export CSV" subtitle="Last 90 days" />
        <div className="grid grid-cols-2 gap-2">
          {[["daily", "Daily summary"], ["food", "Food log"], ["activity", "Activities"], ["weight", "Weight"], ["measurements", "Measurements"]].map(([k, l]) => (
            <Button key={k} asChild variant="secondary" size="sm"><a href={`/api/v1/export?kind=${k}`}><Download className="h-4 w-4" /> {l}</a></Button>
          ))}
        </div>
      </Card>
      {me.data ? <Notice>Reports use your logged data; energy expenditure and burn figures are estimates.</Notice> : null}
    </div>
  );
}

