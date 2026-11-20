"use client";

import { ArrowLeft, LogOut, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Notice, Skeleton } from "@/components/ui/primitives";
import { api, ApiClientError, useApi } from "@/lib/client/api";
import { GOAL_LABEL } from "@/lib/nutrition/fit-journal";
import { fmt, MEAL_LABEL } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  google: boolean;
  goal: string | null;
  onboarded: boolean;
  targetKcal: number | null;
  targetProteinG: number | null;
  latestWeightKg: number | null;
  foodEntries: number;
  weighIns: number;
  fitDays: number;
  lastLoggedDate: string | null;
  lastSeenAt: string | null;
}

interface Day {
  date: string;
  logged: boolean;
  kcalIn: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  steps: number;
  waterMl: number;
  exerciseMinutes: number;
}

interface Detail {
  today: string;
  user: { name: string; email: string; createdAt: string; googleLinked: boolean } | null;
  profile: { dateOfBirth: string | null; sex: string; heightCm: number | null; currentWeightKg: number | null; targetWeightKg: number | null; primaryGoal: string; activityLevel: string; dietPreference: string; allergies: string[]; workoutDaysPerWeek: number } | null;
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; waterMl: number } | null;
  days: Day[];
  weights: { date: string; weightKg: number }[];
  fit: { date: string; steps: number | null; heartPoints: number | null; distanceKm: number | null; caloriesBurned: number | null; goal: string; isFullDay: boolean }[];
  food: { date: string; meal: string; name: string; grams: number; kcal: number; proteinG: number; source: string }[];
}

const goalLabel = (g: string | null | undefined) => (g ? (GOAL_LABEL as Record<string, string>)[g] ?? g.replace(/_/g, " ") : "—");
const dateLabel = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const age = (dob: string | null) => (dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31_557_600_000) : null);

export default function AdminPage() {
  const users = useApi<{ users: AdminUser[] }>("/admin/users", { shouldRetryOnError: false, revalidateOnFocus: false });
  const [selected, setSelected] = useState<string | null>(null);
  const status = users.error instanceof ApiClientError ? users.error.status : null;

  if (status === 401) return <AdminLogin onDone={() => users.mutate()} />;
  if (status === 503) return <Notice tone="warn">Admin access isn&apos;t configured. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH in the server environment.</Notice>;

  async function signOut() {
    await api.del("/admin/login").catch(() => {});
    users.mutate(undefined, { revalidate: true });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold"><ShieldCheck className="h-6 w-6 text-lime" /> Admin</h1>
        <Button size="sm" variant="secondary" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
      </div>
      {users.error && status !== 401 ? <ErrorState error={users.error} onRetry={() => users.mutate()} /> : null}
      {selected ? (
        <UserDetail id={selected} onBack={() => setSelected(null)} />
      ) : users.isLoading ? (
        <Skeleton className="h-64" />
      ) : users.data ? (
        <UserList users={users.data.users} onOpen={setSelected} />
      ) : null}
    </div>
  );
}

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/admin/login", { email, password });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-lime" />
          <h1 className="font-display text-xl font-bold">Admin sign-in</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Admin email"><Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Admin password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          {error ? <Notice tone="warn">{error}</Notice> : null}
          <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
        </form>
        <p className="text-xs text-muted">Separate from app accounts. Sessions last 8 hours.</p>
      </Card>
    </div>
  );
}

function UserList({ users, onOpen }: { users: AdminUser[]; onOpen: (id: string) => void }) {
  if (!users.length) return <EmptyState icon={<Users className="h-5 w-5" />} title="No users yet" body="Accounts appear here as soon as someone signs up." />;
  return (
    <Card className="space-y-3">
      <CardHeader title={`${users.length} ${users.length === 1 ? "user" : "users"}`} icon={<Users className="h-5 w-5" />} />
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              {["Name", "Goal", "Target", "Weight", "Food logs", "Weigh-ins", "Fit days", "Last logged", "Joined"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} onClick={() => onOpen(u.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2">
                <td className="px-2 py-2.5">
                  <p className="font-medium">{u.name} {u.google ? <Badge tone="blue">Google</Badge> : null} {!u.onboarded ? <Badge tone="orange">Not onboarded</Badge> : null}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-2 py-2.5">{goalLabel(u.goal)}</td>
                <td className="px-2 py-2.5 tabular">{u.targetKcal ? `${fmt.int(u.targetKcal)} kcal · ${u.targetProteinG} g P` : "—"}</td>
                <td className="px-2 py-2.5 tabular">{u.latestWeightKg ? `${fmt.dec(u.latestWeightKg)} kg` : "—"}</td>
                <td className="px-2 py-2.5 tabular">{u.foodEntries}</td>
                <td className="px-2 py-2.5 tabular">{u.weighIns}</td>
                <td className="px-2 py-2.5 tabular">{u.fitDays}</td>
                <td className="px-2 py-2.5">{dateLabel(u.lastLoggedDate)}</td>
                <td className="px-2 py-2.5">{dateLabel(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function UserDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, error, mutate } = useApi<Detail>(`/admin/users/${id}`, { revalidateOnFocus: false });
  if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;
  const p = data.profile;
  const t = data.targets;
  const logged = data.days.filter((d) => d.logged);
  const avg = (k: keyof Day) => (logged.length ? logged.reduce((a, d) => a + (d[k] as number), 0) / logged.length : null);
  const foodByDate = Object.entries(
    data.food.reduce<Record<string, Detail["food"]>>((acc, f) => {
      (acc[f.date] ??= []).push(f);
      return acc;
    }, {}),
  );

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> All users</button>
      <Card className="space-y-3">
        <div>
          <p className="font-display text-xl font-bold">{data.user?.name}</p>
          <p className="text-sm text-muted">{data.user?.email} · joined {dateLabel(data.user?.createdAt ?? null)}</p>
        </div>
        {p ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            {[
              ["Goal", goalLabel(p.primaryGoal)],
              ["Age / sex", `${age(p.dateOfBirth) ?? "—"} · ${p.sex}`],
              ["Height", p.heightCm ? `${p.heightCm} cm` : "—"],
              ["Weight", data.weights[0] ? `${fmt.dec(data.weights[0].weightKg)} kg` : p.currentWeightKg ? `${fmt.dec(p.currentWeightKg)} kg` : "—"],
              ["Target weight", p.targetWeightKg ? `${p.targetWeightKg} kg` : "—"],
              ["Diet", p.dietPreference.replace(/_/g, "-")],
              ["Activity", p.activityLevel.replace(/_/g, " ")],
              ["Allergies", p.allergies.join(", ") || "None"],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        ) : <Notice>Hasn&apos;t finished onboarding.</Notice>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <CardHeader title="Targets vs 30-day average" subtitle={`${logged.length} of 30 days logged`} />
          <table className="w-full text-sm">
            <thead className="text-xs text-muted"><tr><th className="py-1 text-left font-medium" /><th className="py-1 text-right font-medium">Target</th><th className="py-1 text-right font-medium">Avg (logged days)</th></tr></thead>
            <tbody className="tabular">
              {([["Calories", t?.calories, avg("kcalIn"), "kcal"], ["Protein", t?.proteinG, avg("proteinG"), "g"], ["Carbs", t?.carbsG, avg("carbsG"), "g"], ["Fat", t?.fatG, avg("fatG"), "g"], ["Fibre", t?.fibreG, avg("fibreG"), "g"], ["Steps", null, avg("steps"), ""]] as const).map(([k, target, a, unit]) => (
                <tr key={k} className="border-t border-line"><td className="py-1.5">{k}</td><td className="py-1.5 text-right">{target == null ? "—" : `${fmt.int(target)} ${unit}`}</td><td className="py-1.5 text-right">{a == null ? "—" : `${fmt.int(a)} ${unit}`}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="space-y-2">
          <CardHeader title="Weigh-ins" subtitle={data.weights.length ? `${data.weights.length} entries` : undefined} />
          {data.weights.length ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm tabular">
              {data.weights.map((w) => <li key={w.date} className="flex justify-between border-b border-line py-1 last:border-0"><span className="text-muted">{dateLabel(w.date)}</span><span className="font-medium">{fmt.dec(w.weightKg)} kg</span></li>)}
            </ul>
          ) : <p className="text-sm text-muted">No weigh-ins yet.</p>}
        </Card>
      </div>

      <Card className="space-y-2">
        <CardHeader title="Last 30 days" />
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm tabular">
            <thead className="text-xs text-muted"><tr className="border-b border-line">{["Date", "kcal", "Protein", "Carbs", "Fat", "Fibre", "Steps", "Water", "Exercise"].map((h) => <th key={h} className="px-2 py-1.5 text-right font-medium first:text-left">{h}</th>)}</tr></thead>
            <tbody>
              {[...data.days].reverse().filter((d) => d.logged || d.steps || d.waterMl || d.exerciseMinutes).map((d) => (
                <tr key={d.date} className="border-b border-line last:border-0">
                  <td className="px-2 py-1.5">{dateLabel(d.date)}</td>
                  <td className={`px-2 py-1.5 text-right ${t && d.kcalIn > t.calories * 1.1 ? "text-orange" : ""}`}>{d.logged ? fmt.int(d.kcalIn) : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{d.logged ? `${fmt.int(d.proteinG)} g` : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{d.logged ? `${fmt.int(d.carbsG)} g` : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{d.logged ? `${fmt.int(d.fatG)} g` : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{d.logged ? `${fmt.int(d.fibreG)} g` : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{d.steps ? fmt.int(d.steps) : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{d.waterMl ? fmt.litres(d.waterMl) : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{d.exerciseMinutes ? fmt.minutes(d.exerciseMinutes) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.days.some((d) => d.logged || d.steps || d.waterMl || d.exerciseMinutes) ? <p className="px-1 text-sm text-muted">Nothing logged in the last 30 days.</p> : null}
        </div>
      </Card>

      {data.fit.length ? (
        <Card className="space-y-2">
          <CardHeader title="Google Fit journal (14 days)" />
          <ul className="space-y-1 text-sm tabular">
            {data.fit.map((f) => (
              <li key={f.date} className="flex flex-wrap justify-between gap-2 border-b border-line py-1.5 last:border-0">
                <span>{dateLabel(f.date)} <span className="text-muted">· {goalLabel(f.goal)}{f.isFullDay ? "" : " · partial"}</span></span>
                <span>{fmt.int(f.steps)} steps · {fmt.int(f.heartPoints)} ♥ · {fmt.dec(f.distanceKm)} km · {fmt.int(f.caloriesBurned)} kcal</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <CardHeader title="Food log (30 days)" subtitle={data.food.length >= 200 ? "Latest 200 entries" : undefined} />
        {foodByDate.length ? foodByDate.map(([date, items]) => (
          <div key={date}>
            <p className="mb-1 text-xs font-semibold text-muted">{dateLabel(date)} · {fmt.int(items.reduce((a, f) => a + f.kcal, 0))} kcal</p>
            <ul className="space-y-0.5 text-sm">
              {items.map((f, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{f.name} <span className="text-muted">· {MEAL_LABEL[f.meal] ?? f.meal} · {fmt.int(f.grams)} g{f.source === "scan" ? " · scanned" : ""}</span></span>
                  <span className="shrink-0 tabular">{fmt.int(f.kcal)} kcal · {fmt.dec(f.proteinG)} g P</span>
                </li>
              ))}
            </ul>
          </div>
        )) : <p className="text-sm text-muted">No food logged in the last 30 days.</p>}
      </Card>
    </div>
  );
}
