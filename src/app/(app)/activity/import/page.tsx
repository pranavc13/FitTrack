"use client";

import { CheckCircle2, FileUp, Info } from "lucide-react";
import { useRef, useState } from "react";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";

interface Preview {
  jobId: number;
  provider: string;
  dateRange: { from: string | null; to: string | null };
  counts: { total: number; inRange: number; duplicates: number; new: number; byType: Record<string, number> };
  sample: { recordType: string; date: string; value: number | null; unit: string | null; activityName?: string | null; durationMin?: number | null }[];
  errors: string[];
  note: string;
}

export default function ImportPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<Record<string, number> | null>(null);
  const history = useApi<{ history: { id: number; filename: string; provider: string; status: string; stats: Record<string, number>; errors: string[]; createdAt: string }[] }>("/imports");

  function form(action: "preview" | "commit") {
    const f = new FormData();
    f.set("file", file!);
    f.set("action", action);
    if (from) f.set("from", from);
    if (to) f.set("to", to);
    if (action === "commit" && preview) f.set("jobId", String(preview.jobId));
    return f;
  }

  async function run(action: "preview" | "commit") {
    if (!file) return;
    setLoading(true);
    try {
      if (action === "preview") {
        setDone(null);
        setPreview(await api.upload<Preview>("/imports", form("preview")));
      } else {
        const r = await api.upload<{ stats: Record<string, number> }>("/imports", form("commit"));
        setDone(r.stats);
        setPreview(null);
        invalidate("/dashboard", "/activities", "/imports", "/workouts");
        toast("Import complete");
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Import fitness data</h1>
      <Card>
        <CardHeader title="What's supported" icon={<Info className="h-5 w-5" />} />
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li><b className="text-ink">Google Fit (Takeout)</b> — takeout.google.com → select &ldquo;Fit&rdquo; → upload the .zip, or the <i>Daily activity metrics.csv</i> / <i>All Sessions</i> JSON files.</li>
          <li><b className="text-ink">Generic CSV</b> with columns like <code>date, steps, distance_km, calories, active_minutes, sleep_minutes</code> (works with most Health Connect exporter apps).</li>
          <li>Steps, distance, workout sessions, sleep and heart rate are imported. Device calorie totals are kept for reference but not added to your energy balance (to avoid double counting).</li>
        </ul>
        <Notice>
          This is a historical file import, not live sync. Live Health Connect access requires a native Android app (planned via Capacitor); the Google Fit web API is being deprecated by Google.
        </Notice>
      </Card>

      <Card className="space-y-3">
        <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center hover:border-lime/50">
          <FileUp className="h-8 w-8 text-lime" />
          <span className="font-semibold">{file ? file.name : "Choose export file"}</span>
          <span className="text-xs text-muted">.zip, .csv or .json · up to 25 MB</span>
        </button>
        <input ref={fileRef} type="file" accept=".zip,.csv,.json" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setDone(null); }} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="From (optional)"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To (optional)"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <Button className="w-full" disabled={!file} loading={loading && !preview} onClick={() => run("preview")}>Preview import</Button>
      </Card>

      {preview ? (
        <Card className="space-y-3">
          <CardHeader title="Preview" subtitle={`${preview.provider.replace(/_/g, " ")} · ${preview.dateRange.from ?? "?"} → ${preview.dateRange.to ?? "?"}`} />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-surface-2 p-2.5"><p className="font-semibold">{preview.counts.inRange}</p><p className="text-[11px] text-faint">records</p></div>
            <div className="rounded-2xl bg-surface-2 p-2.5"><p className="font-semibold text-lime">{preview.counts.new}</p><p className="text-[11px] text-faint">new</p></div>
            <div className="rounded-2xl bg-surface-2 p-2.5"><p className="font-semibold text-muted">{preview.counts.duplicates}</p><p className="text-[11px] text-faint">already imported</p></div>
          </div>
          <div className="flex flex-wrap gap-1.5">{Object.entries(preview.counts.byType).map(([k, v]) => <Badge key={k}>{k.replace("_", " ")}: {v}</Badge>)}</div>
          {preview.sample.length ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-muted">
              {preview.sample.map((s, i) => <li key={i}>{s.date} · {s.recordType}{s.activityName ? ` (${s.activityName})` : ""} · {s.value != null ? Math.round(s.value * 10) / 10 : ""} {s.unit ?? ""}{s.durationMin ? ` · ${s.durationMin} min` : ""}</li>)}
            </ul>
          ) : null}
          {preview.errors.length ? <Notice tone="warn">{preview.errors.length} issue(s): {preview.errors.slice(0, 3).join(" · ")}</Notice> : null}
          <Button className="w-full" loading={loading} disabled={!preview.counts.new} onClick={() => run("commit")}>Import {preview.counts.new} records</Button>
        </Card>
      ) : null}

      {done ? (
        <Card className="flex items-start gap-3 border-lime/30">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-lime" />
          <div className="text-sm">
            <p className="font-semibold">Imported</p>
            <p className="text-muted">{done.stepDays ?? 0} days of steps · {done.sessions ?? 0} workout sessions · {done.sleep ?? 0} sleep records · {done.duplicates ?? 0} duplicates skipped{done.skippedManual ? ` · ${done.skippedManual} days kept your manual step entry` : ""}</p>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Import history" />
        {!history.data ? <Skeleton className="h-20" /> : history.data.history.length ? (
          <ul className="divide-y divide-line text-sm">
            {history.data.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0 truncate">{h.filename}</span>
                <span className="shrink-0 text-xs text-muted">{new Date(h.createdAt).toLocaleDateString("en-IN")} · <Badge tone={h.status === "committed" ? "lime" : "default"}>{h.status}</Badge></span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No imports yet.</p>}
      </Card>
    </div>
  );
}
