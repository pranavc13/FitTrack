"use client";

import { Bell, Download, LogOut, RotateCcw, Shield, Smartphone, Target, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/providers";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, NumberInput, Select, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";

interface Me {
  user: { name: string; email: string };
  profile: { dateOfBirth: string | null; sex: string; heightCm: number | null; targetWeightKg: number | null; activityLevel: string; dietPreference: string; allergies: string[]; workoutDaysPerWeek: number; workoutMinutes: number; trainingLocation: string; trainingExperience: string; sleepHours: number | null } | null;
  preferences: { timezone: string; stepGoal: number; waterGlassMl: number } | null;
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; waterMl: number; sleepMinutes: number; isCustom: boolean; computed: { bmr: number; tdee: number; baseline: number; bmi: number; rationale: string[]; recommended: Record<string, number> } } | null;
  aiEnabled: boolean;
  pushEnabled: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { data, mutate } = useApi<Me>("/auth/me");
  const { installPrompt, promptInstall, isStandalone } = useAppState();
  const [editTargets, setEditTargets] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!data) return <Skeleton className="h-96" />;
  const t = data.targets;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-lime/30 to-cyan/20 font-display text-xl font-bold">{data.user.name.slice(0, 1).toUpperCase()}</div>
        <div><h1 className="font-display text-xl font-bold">{data.user.name}</h1><p className="text-sm text-muted">{data.user.email}</p></div>
      </div>

      {t ? (
        <Card>
          <CardHeader title="Daily targets" subtitle={t.isCustom ? "Custom (set by you)" : "Calculated from your profile"} icon={<Target className="h-5 w-5" />} action={<Button size="sm" variant="secondary" onClick={() => setEditTargets(true)}>Edit</Button>} />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["Calories", t.calories], ["Protein", `${t.proteinG} g`], ["Carbs", `${t.carbsG} g`], ["Fat", `${t.fatG} g`], ["Fibre", `${t.fibreG} g`], ["Water", `${(t.waterMl / 1000).toFixed(1)} L`]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-surface-2 p-2.5"><p className="font-semibold tabular">{v}</p><p className="text-[11px] text-faint">{l}</p></div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">BMI {t.computed.bmi?.toFixed(1)} · BMR {t.computed.bmr} · Baseline {t.computed.baseline} · Est. maintenance {t.computed.tdee} kcal (estimates)</p>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Profile" icon={<User className="h-5 w-5" />} action={<Button size="sm" variant="secondary" onClick={() => setEditProfile(true)}>Edit</Button>} />
        {data.profile ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[["Height", `${data.profile.heightCm} cm`], ["Target weight", data.profile.targetWeightKg ? `${data.profile.targetWeightKg} kg` : "—"], ["Diet", data.profile.dietPreference.replace("_", "-")], ["Activity", data.profile.activityLevel.replace("_", " ")], ["Training", `${data.profile.workoutDaysPerWeek}×/wk · ${data.profile.trainingLocation}`], ["Allergies", data.profile.allergies.join(", ") || "None"]].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-faint">{k}</dt><dd className="capitalize">{v}</dd></div>
            ))}
          </dl>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Install the app" icon={<Smartphone className="h-5 w-5" />} />
        {isStandalone ? <p className="text-sm text-lime">✓ Running as an installed app.</p> : installPrompt ? (
          <Button className="w-full" onClick={promptInstall}>Install FitTrack AI</Button>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li><b className="text-ink">Android (Chrome):</b> tap ⋮ menu → <i>Install app</i> (or <i>Add to Home screen</i>).</li>
            <li><b className="text-ink">Samsung Internet:</b> tap ☰ → <i>Add page to</i> → <i>Home screen</i>.</li>
            <li><b className="text-ink">iPhone (Safari):</b> tap Share → <i>Add to Home Screen</i>.</li>
            <li>Open from the new icon — it launches full-screen, straight to your dashboard, and stays signed in.</li>
          </ol>
        )}
      </Card>

      <Reminders pushEnabled={data.pushEnabled} />

      <Card>
        <CardHeader title="Privacy & data" icon={<Shield className="h-5 w-5" />} />
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Your data is private to your account. Progress photos are never shared or sent to AI.</li>
          <li>Meal and label photos are sent to the AI provider only when you tap Analyse.</li>
          <li>Status: AI {data.aiEnabled ? <Badge tone="lime">enabled</Badge> : <Badge>not configured</Badge>} · Push {data.pushEnabled ? <Badge tone="lime">enabled</Badge> : <Badge>not configured</Badge>}</li>
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="secondary"><a href="/api/v1/account"><Download className="h-4 w-4" /> Export all data</a></Button>
          <Button variant="secondary" onClick={async () => { await api.post("/auth/logout", {}); navigator.serviceWorker?.controller?.postMessage({ type: "clear-api-cache" }); router.replace("/login"); }}><LogOut className="h-4 w-4" /> Sign out</Button>
        </div>
        <Button variant="danger" className="mt-2 w-full" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Delete account</Button>
      </Card>

      <TargetsSheet open={editTargets} onOpenChange={setEditTargets} me={data} onSaved={() => { mutate(); invalidate("/dashboard"); }} toast={toast} />
      <ProfileSheet open={editProfile} onOpenChange={setEditProfile} me={data} onSaved={() => { mutate(); invalidate("/dashboard"); }} toast={toast} />
      <DeleteSheet open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}

function TargetsSheet({ open, onOpenChange, me, onSaved, toast }: { open: boolean; onOpenChange: (o: boolean) => void; me: Me; onSaved: () => void; toast: ReturnType<typeof useToast> }) {
  const t = me.targets!;
  const [v, setV] = useState({ calories: "", proteinG: "", carbsG: "", fatG: "", fibreG: "", waterMl: "" });
  useEffect(() => {
    if (t) setV({ calories: String(t.calories), proteinG: String(t.proteinG), carbsG: String(t.carbsG), fatG: String(t.fatG), fibreG: String(t.fibreG), waterMl: String(t.waterMl) });
  }, [t, open]);
  async function save() {
    try {
      const r = await api.put<{ warnings: string[] }>("/targets", Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)])));
      r.warnings.forEach((w) => toast(w, "info"));
      toast("Targets saved");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  async function reset() {
    await api.post("/targets", {});
    toast("Targets recalculated from your profile");
    onSaved();
    onOpenChange(false);
  }
  if (!t) return null;
  const macroKcal = Number(v.proteinG) * 4 + Number(v.carbsG) * 4 + Number(v.fatG) * 9;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Edit targets" size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {([["calories", "Calories", "kcal"], ["proteinG", "Protein", "g"], ["carbsG", "Carbs", "g"], ["fatG", "Fat", "g"], ["fibreG", "Fibre", "g"], ["waterMl", "Water", "ml"]] as const).map(([k, l, u]) => (
            <Field key={k} label={l} hint={`Recommended ${t.computed.recommended?.[k] ?? "—"}`}><NumberInput suffix={u} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>
          ))}
        </div>
        <p className="text-xs text-muted">Macros add up to {Math.round(macroKcal)} kcal.</p>
        <details className="text-sm"><summary className="cursor-pointer text-muted">How the recommendation was calculated</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">{t.computed.rationale.map((r) => <li key={r}>{r}</li>)}</ul></details>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="secondary" onClick={reset}><RotateCcw className="h-4 w-4" /> Recalculate</Button>
          <Button onClick={save}>Save custom targets</Button>
        </div>
      </div>
    </Sheet>
  );
}

function ProfileSheet({ open, onOpenChange, me, onSaved, toast }: { open: boolean; onOpenChange: (o: boolean) => void; me: Me; onSaved: () => void; toast: ReturnType<typeof useToast> }) {
  const p = me.profile;
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => {
    if (p) setV({ name: me.user.name, heightCm: String(p.heightCm ?? ""), targetWeightKg: String(p.targetWeightKg ?? ""), activityLevel: p.activityLevel, dietPreference: p.dietPreference, allergies: p.allergies.join(", "), workoutDaysPerWeek: String(p.workoutDaysPerWeek), workoutMinutes: String(p.workoutMinutes), trainingLocation: p.trainingLocation, sleepHours: String(p.sleepHours ?? ""), stepGoal: String(me.preferences?.stepGoal ?? 8000), timezone: me.preferences?.timezone ?? "Asia/Kolkata" });
  }, [p, me, open]);
  async function save() {
    try {
      await api.put("/profile", {
        name: v.name,
        heightCm: Number(v.heightCm),
        targetWeightKg: v.targetWeightKg ? Number(v.targetWeightKg) : null,
        activityLevel: v.activityLevel,
        dietPreference: v.dietPreference,
        allergies: v.allergies!.split(",").map((s) => s.trim()).filter(Boolean),
        workoutDaysPerWeek: Number(v.workoutDaysPerWeek),
        workoutMinutes: Number(v.workoutMinutes),
        trainingLocation: v.trainingLocation,
        sleepHours: v.sleepHours ? Number(v.sleepHours) : null,
        preferences: { stepGoal: Number(v.stepGoal), timezone: v.timezone },
      });
      toast("Profile updated — targets recalculated");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  if (!p) return null;
  const set = (k: string) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Edit profile" size="lg">
      <div className="space-y-3">
        <Field label="Name"><Input value={v.name ?? ""} onChange={set("name")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height"><NumberInput suffix="cm" value={v.heightCm ?? ""} onChange={set("heightCm")} /></Field>
          <Field label="Target weight"><NumberInput suffix="kg" value={v.targetWeightKg ?? ""} onChange={set("targetWeightKg")} /></Field>
          <Field label="Daily activity"><Select value={v.activityLevel} onChange={set("activityLevel")}>{["sedentary", "light", "moderate", "active", "very_active"].map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}</Select></Field>
          <Field label="Diet"><Select value={v.dietPreference} onChange={set("dietPreference")}>{["vegetarian", "eggetarian", "non_vegetarian", "vegan", "jain", "pescatarian"].map((x) => <option key={x} value={x}>{x.replace("_", "-")}</option>)}</Select></Field>
          <Field label="Workout days/week"><NumberInput value={v.workoutDaysPerWeek ?? ""} onChange={set("workoutDaysPerWeek")} /></Field>
          <Field label="Minutes/session"><NumberInput value={v.workoutMinutes ?? ""} onChange={set("workoutMinutes")} /></Field>
          <Field label="Train at"><Select value={v.trainingLocation} onChange={set("trainingLocation")}><option value="gym">Gym</option><option value="home">Home</option><option value="both">Both</option></Select></Field>
          <Field label="Step goal"><NumberInput value={v.stepGoal ?? ""} onChange={set("stepGoal")} /></Field>
        </div>
        <Field label="Allergies (comma separated)"><Input value={v.allergies ?? ""} onChange={set("allergies")} /></Field>
        <Field label="Timezone"><Input value={v.timezone ?? ""} onChange={set("timezone")} /></Field>
        <Button className="w-full" onClick={save}>Save</Button>
      </div>
    </Sheet>
  );
}

const REMINDER_KINDS = [
  { kind: "water", label: "Water", time: "11:00" },
  { kind: "meal", label: "Log meals", time: "13:30" },
  { kind: "weigh_in", label: "Morning weigh-in", time: "07:30" },
  { kind: "measurement", label: "Weekly measurements", time: "08:00" },
  { kind: "workout", label: "Workout", time: "18:00" },
  { kind: "sleep", label: "Wind down", time: "22:30" },
] as const;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function Reminders({ pushEnabled }: { pushEnabled: boolean }) {
  const toast = useToast();
  const { data, mutate } = useApi<{ reminders: { kind: string; timeOfDay: string; weekdays: number[]; enabled: boolean }[] }>("/reminders");
  const [perm, setPerm] = useState<string>("default");
  useEffect(() => setPerm(typeof Notification !== "undefined" ? Notification.permission : "unsupported"), []);

  async function enablePush() {
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p !== "granted") return toast("Notifications were not allowed", "info");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
      await api.post("/push", sub.toJSON());
      await api.put("/push", {});
      toast("Notifications enabled");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  async function toggle(kind: string, time: string, on: boolean) {
    const current = data?.reminders ?? [];
    const others = current.filter((r) => r.kind !== kind);
    const existing = current.find((r) => r.kind === kind);
    const next = [...others, { kind, timeOfDay: existing?.timeOfDay ?? time, weekdays: kind === "measurement" ? [0] : [0, 1, 2, 3, 4, 5, 6], enabled: on }];
    await api.put("/reminders", { reminders: next });
    mutate();
  }
  return (
    <Card>
      <CardHeader title="Reminders" icon={<Bell className="h-5 w-5" />} />
      {!pushEnabled ? (
        <Notice>Push notifications need server setup (VAPID keys — see README). Reminder preferences are saved and will work once configured.</Notice>
      ) : perm !== "granted" ? (
        <Button className="mb-3 w-full" variant="secondary" onClick={enablePush} disabled={perm === "unsupported" || perm === "denied"}>{perm === "denied" ? "Notifications blocked in browser settings" : "Allow notifications"}</Button>
      ) : null}
      <ul className="mt-2 space-y-2">
        {REMINDER_KINDS.map((k) => {
          const r = data?.reminders.find((x) => x.kind === k.kind);
          return (
            <li key={k.kind} className="flex items-center justify-between gap-2">
              <span className="text-sm">{k.label} <span className="text-faint">· {r?.timeOfDay ?? k.time}</span></span>
              <input type="checkbox" role="switch" checked={Boolean(r?.enabled)} onChange={(e) => toggle(k.kind, k.time, e.target.checked)} className="h-6 w-11 accent-[var(--color-lime)]" aria-label={`${k.label} reminder`} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function DeleteSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Delete account" description="This permanently deletes your account, logs, recipes, photos and AI conversations. It cannot be undone.">
      <div className="space-y-3">
        <Field label="Confirm with your password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field>
        <Button variant="danger" className="w-full" loading={busy} disabled={!pw} onClick={async () => {
          setBusy(true);
          try {
            await api.del("/account", { password: pw });
            router.replace("/signup");
          } catch (e) {
            toast((e as Error).message, "error");
          } finally {
            setBusy(false);
          }
        }}>Delete everything</Button>
      </div>
    </Sheet>
  );
}
