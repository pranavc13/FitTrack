"use client";

import { CalendarDays, ChefHat, Loader2, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, CardHeader, Chip, EmptyState, Field, Input, Notice, NumberInput, Segmented, Select, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";
import { addDays, formatDateLabel } from "@/lib/dates";
import { cn, fmt } from "@/lib/utils";

type Tab = "plan" | "cook" | "pantry" | "grocery";

interface PlanItem { slot: string; recipeId: number; name: string; servings: number; servingLabel: string; kcal: number; proteinG: number; costInr: number | null }
interface PlanResult { days: { date: string; training: boolean; items: PlanItem[]; totals: { kcal: number; proteinG: number; fibreG: number; costInr: number } }[]; notes: string[]; saved: { id: number } | null }

export default function PlanPage() {
  const [tab, setTab] = useState<Tab>("plan");
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Plan, pantry &amp; groceries</h1>
      <Segmented<Tab> value={tab} onChange={setTab} size="sm" options={[{ value: "plan", label: "Meal plan" }, { value: "cook", label: "What can I cook?" }, { value: "pantry", label: "Pantry" }, { value: "grocery", label: "Grocery" }]} />
      {tab === "plan" ? <Planner onGrocery={() => setTab("grocery")} /> : tab === "cook" ? <CookWithWhatIHave /> : tab === "pantry" ? <Pantry /> : <Grocery />}
    </div>
  );
}

function Planner({ onGrocery }: { onGrocery: () => void }) {
  const toast = useToast();
  const me = useApi<{ today: string; targets: { calories: number; proteinG: number } | null; profile: { dietPreference: string } | null }>("/auth/me");
  const plans = useApi<{ plans: { id: number; name: string; startDate: string; days: number; plan: PlanResult }[] }>("/mealplans");
  const [days, setDays] = useState(7);
  const [maxCook, setMaxCook] = useState("");
  const [budget, setBudget] = useState("");
  const [region, setRegion] = useState("");
  const [have, setHave] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate(save = false) {
    if (!me.data) return;
    setLoading(true);
    try {
      const r = await api.post<PlanResult>("/mealplans", {
        days,
        startDate: me.data.today,
        maxCookMinutes: maxCook ? Number(maxCook) : null,
        budgetPerDayInr: budget ? Number(budget) : null,
        region: region || null,
        availableIngredients: have.split(",").map((s) => s.trim()).filter(Boolean),
        save,
        name: `${days}-day plan from ${me.data.today}`,
      });
      setPlan(r);
      if (save) {
        toast("Plan saved");
        invalidate("/mealplans");
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function grocery(planId: number) {
    setBusy(true);
    try {
      await api.post(`/mealplans/${planId}/grocery`, {});
      toast("Grocery list created (pantry items subtracted)");
      invalidate("/grocery");
      onGrocery();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardHeader title="Generate a plan" subtitle={me.data?.targets ? `${me.data.targets.calories} kcal · ${me.data.targets.proteinG} g protein · ${me.data.profile?.dietPreference?.replace("_", "-")}` : "Uses your targets and diet"} icon={<CalendarDays className="h-5 w-5" />} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Days"><Select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[1, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d}</option>)}</Select></Field>
          <Field label="Max cooking time"><Select value={maxCook} onChange={(e) => setMaxCook(e.target.value)}><option value="">Any</option><option value="20">20 min (quick)</option><option value="30">30 min</option><option value="45">45 min</option></Select></Field>
          <Field label="Budget / day (₹)"><NumberInput value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Optional" /></Field>
          <Field label="Cuisine"><Select value={region} onChange={(e) => setRegion(e.target.value)}><option value="">Mixed Indian</option><option value="North">North Indian</option><option value="South">South Indian</option><option value="Punjabi">Punjabi</option><option value="Gujarati">Gujarati</option><option value="Maharashtrian">Maharashtrian</option><option value="Bengali">Bengali</option><option value="Kerala">Kerala</option></Select></Field>
        </div>
        <Field label="Ingredients you already have (optional)"><Input value={have} onChange={(e) => setHave(e.target.value)} placeholder="paneer, capsicum, curd, rice" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => generate(false)} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Preview</Button>
          <Button onClick={() => generate(true)} disabled={loading}>Generate &amp; save</Button>
        </div>
      </Card>

      {plan ? (
        <div className="space-y-3">
          {plan.notes.map((n) => <Notice key={n}>{n}</Notice>)}
          {plan.saved ? <Button className="w-full" loading={busy} onClick={() => grocery(plan.saved!.id)}><ShoppingCart className="h-4 w-4" /> Make grocery list</Button> : null}
          {plan.days.map((d) => (
            <Card key={d.date}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">{formatDateLabel(d.date, me.data?.today ?? d.date)} {d.training ? <Badge tone="lime" className="ml-1">training day</Badge> : null}</p>
                <p className="text-sm tabular text-muted">{fmt.int(d.totals.kcal)} kcal · {d.totals.proteinG} g P{d.totals.costInr ? ` · ₹${d.totals.costInr}` : ""}</p>
              </div>
              <ul className="space-y-1.5">
                {d.items.map((it, i) => (
                  <li key={i}>
                    <Link href={`/food/recipes/${it.recipeId}`} prefetch={false} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm hover:bg-surface-3">
                      <span className="min-w-0 truncate"><span className="text-xs uppercase text-faint">{it.slot}</span> · {it.name} <span className="text-muted">× {it.servings} {it.servingLabel.split(" (")[0]}</span></span>
                      <span className="shrink-0 tabular">{fmt.int(it.kcal)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : null}

      {plans.data?.plans.length ? (
        <Card>
          <CardHeader title="Saved plans" />
          <ul className="space-y-2">
            {plans.data.plans.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <button className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => setPlan({ ...(p.plan as PlanResult), saved: { id: p.id } })}>{p.name}</button>
                <Button size="sm" variant="secondary" onClick={() => grocery(p.id)} loading={busy}><ShoppingCart className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function CookWithWhatIHave() {
  const [text, setText] = useState("");
  const [usePantry, setUsePantry] = useState(true);
  const [res, setRes] = useState<{ results: { recipeId: number; name: string; region: string | null; perServing: { kcal: number; proteinG: number }; matched: string[]; missing: string[] }[]; unrecognised: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  async function go() {
    setLoading(true);
    try {
      setRes(await api.post("/pantry/suggest", { ingredients: text.split(",").map((s) => s.trim()).filter(Boolean), usePantry }));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardHeader title="Cook with what you have" subtitle="Recipes ranked by how many main ingredients you already have" icon={<ChefHat className="h-5 w-5" />} />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="paneer, capsicum, onions, curd, rice" />
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={usePantry} onChange={(e) => setUsePantry(e.target.checked)} className="h-4 w-4 accent-[var(--color-lime)]" /> Include my pantry (items expiring soon count extra)</label>
        <Button className="w-full" onClick={go} loading={loading}>Find recipes</Button>
      </Card>
      {res?.unrecognised.length ? <Notice>Didn&apos;t recognise: {res.unrecognised.join(", ")}</Notice> : null}
      {res ? (
        res.results.length ? (
          <div className="space-y-2">
            {res.results.map((r) => (
              <Link key={r.recipeId} href={`/food/recipes/${r.recipeId}`} prefetch={false}>
                <Card className="p-3.5 hover:bg-surface-2">
                  <div className="flex justify-between gap-2"><p className="font-semibold">{r.name}</p><span className="text-sm tabular">{fmt.int(r.perServing.kcal)} kcal</span></div>
                  <p className="text-xs text-lime">Have: {r.matched.join(", ")}</p>
                  {r.missing.length ? <p className="text-xs text-muted">Need: {r.missing.join(", ")}</p> : <p className="text-xs text-lime">You have everything ✓</p>}
                </Card>
              </Link>
            ))}
          </div>
        ) : <EmptyState title="No matching recipes" body="Try adding more ingredients." />
      ) : null}
    </div>
  );
}

function Pantry() {
  const toast = useToast();
  const { data, mutate } = useApi<{ items: { id: number; name: string; quantityG: number | null; expiresOn: string | null }[] }>("/pantry");
  const me = useApi<{ today: string }>("/auth/me");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [exp, setExp] = useState("");
  async function add() {
    try {
      await api.post("/pantry", { name, quantityG: qty ? Number(qty) : null, expiresOn: exp || null });
      setName(""); setQty(""); setExp("");
      mutate();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  const soon = me.data ? addDays(me.data.today, 3) : "";
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardHeader title="Add to pantry" icon={<Package className="h-5 w-5" />} />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. paneer, spinach, toor dal" />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput suffix="g" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Quantity" />
          <Input type="date" value={exp} onChange={(e) => setExp(e.target.value)} aria-label="Use by date" />
        </div>
        <Button className="w-full" disabled={!name.trim()} onClick={add}><Plus className="h-4 w-4" /> Add</Button>
      </Card>
      {!data ? <Skeleton className="h-40" /> : data.items.length ? (
        <ul className="space-y-1.5">
          {data.items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-3.5 py-2.5">
              <div>
                <p className="font-medium capitalize">{i.name}</p>
                <p className={cn("text-xs", i.expiresOn && i.expiresOn <= soon ? "text-orange" : "text-muted")}>{i.quantityG ? `${fmt.int(i.quantityG)} g` : ""}{i.expiresOn ? ` · use by ${i.expiresOn}` : ""}</p>
              </div>
              <button onClick={async () => { await api.del("/pantry", { id: i.id }); mutate(); }} className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:text-red" aria-label={`Remove ${i.name}`}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="Pantry is empty" body="Add what's in your kitchen to get recipe suggestions and smarter grocery lists." />}
    </div>
  );
}

function Grocery() {
  const lists = useApi<{ lists: { id: number; name: string; createdAt: string }[] }>("/grocery");
  const [id, setId] = useState<number | null>(null);
  const active = id ?? lists.data?.lists[0]?.id ?? null;
  const list = useApi<{ list: { name: string }; items: { id: number; name: string; category: string; display: string | null; estimatedPriceInr: number | null; checked: boolean }[]; estimatedTotalInr: number }>(active ? `/grocery/${active}` : null);
  const [extra, setExtra] = useState("");
  if (!lists.data) return <Skeleton className="h-60" />;
  if (!lists.data.lists.length) return <EmptyState icon={<ShoppingCart className="h-5 w-5" />} title="No grocery lists yet" body="Generate and save a meal plan, then tap 'Make grocery list'." />;
  const groups = new Map<string, NonNullable<typeof list.data>["items"]>();
  for (const it of list.data?.items ?? []) groups.set(it.category, [...(groups.get(it.category) ?? []), it]);
  return (
    <div className="space-y-4">
      {lists.data.lists.length > 1 ? (
        <Select value={active ?? ""} onChange={(e) => setId(Number(e.target.value))}>{lists.data.lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
      ) : null}
      {list.data ? (
        <>
          <Card className="flex items-center justify-between">
            <div><p className="font-semibold">{list.data.list.name}</p><p className="text-xs text-muted">{list.data.items.filter((i) => !i.checked).length} items left</p></div>
            <div className="text-right"><p className="font-display text-xl font-bold tabular">≈ ₹{fmt.int(list.data.estimatedTotalInr)}</p><p className="text-[11px] text-faint">approx. retail</p></div>
          </Card>
          {[...groups.entries()].map(([cat, items]) => (
            <Card key={cat} className="p-0">
              <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-faint">{cat}</p>
              <ul>
                {items.map((it) => (
                  <li key={it.id}>
                    <label className="flex items-center gap-3 px-4 py-2.5">
                      <input type="checkbox" checked={it.checked} onChange={async (e) => { await api.patch(`/grocery/${active}`, { itemId: it.id, checked: e.target.checked }); list.mutate(); }} className="h-5 w-5 accent-[var(--color-lime)]" />
                      <span className={cn("flex-1 capitalize", it.checked && "text-faint line-through")}>{it.name}</span>
                      <span className="text-sm tabular text-muted">{it.display}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          <div className="flex gap-2">
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Add an item" />
            <Button disabled={!extra.trim()} onClick={async () => { await api.post(`/grocery/${active}`, { name: extra }); setExtra(""); list.mutate(); }}><Plus className="h-4 w-4" /></Button>
          </div>
        </>
      ) : <Skeleton className="h-60" />}
      <div className="flex flex-wrap gap-2">{lists.data.lists.slice(0, 5).map((l) => <Chip key={l.id} active={l.id === active} onClick={() => setId(l.id)}>{l.name.replace("Groceries — ", "")}</Chip>)}</div>
    </div>
  );
}
