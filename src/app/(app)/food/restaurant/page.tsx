"use client";

import { Camera, Check, Search, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Chip, EmptyState, Notice, NumberInput, Segmented, Select, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";
import { fmt, mealForHour, MEAL_LABEL } from "@/lib/utils";

interface Dish {
  id: number;
  dishName: string;
  style: string;
  portionLabel: string;
  foodId: number;
  recipeId: number;
  kcalRange: [number, number];
  typicalKcal: number;
  addOns: { name: string; grams: number }[];
}
interface Estimate {
  dish: string;
  foodId: number;
  grams: number;
  kcal: number;
  proteinG: number;
  range: { kcalLow: number; kcalHigh: number };
  addOns: { name: string; grams: number; foodId: number | null; kcal: number }[];
  basis: string;
}

export default function RestaurantPage() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [selected, setSelected] = useState<Dish | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data } = useApi<{ dishes: Dish[] }>(`/restaurant${dq ? `?q=${encodeURIComponent(dq)}` : ""}`);
  const dishes = (data?.dishes ?? []).filter((d) => !style || d.style === style);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Eating out</h1>
        <p className="text-sm text-muted">Restaurant, street food, takeaway &amp; delivery — shown as honest ranges.</p>
      </div>
      <Link href="/scan">
        <Card className="flex items-center gap-3 hover:bg-surface-2">
          <Camera className="h-5 w-5 text-lime" />
          <p className="flex-1 text-sm">Got the plate in front of you? Photograph it instead.</p>
        </Card>
      </Link>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Butter chicken, pav bhaji, momos…" aria-label="Search dishes" className="h-12 w-full rounded-2xl border border-line bg-surface-2 pl-12 pr-4 focus:border-lime/60 focus:outline-none" />
      </div>
      <div className="flex gap-2">
        <Chip active={!style} onClick={() => setStyle(null)}>All</Chip>
        <Chip active={style === "restaurant"} onClick={() => setStyle("restaurant")}>Restaurant</Chip>
        <Chip active={style === "street"} onClick={() => setStyle("street")}>Street food</Chip>
      </div>
      {!data ? (
        <Skeleton className="h-60" />
      ) : dishes.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {dishes.map((d) => (
            <button key={d.id} onClick={() => setSelected(d)} className="rounded-2xl border border-line bg-surface p-3.5 text-left hover:bg-surface-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{d.dishName}</p>
                <Badge tone={d.style === "street" ? "orange" : "purple"}>{d.style}</Badge>
              </div>
              <p className="mt-1 text-sm tabular"><b>{fmt.int(d.kcalRange[0])}–{fmt.int(d.kcalRange[1])}</b> kcal <span className="text-muted">· {d.portionLabel}</span></p>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Store className="h-5 w-5" />} title="Dish not in the outside-food list" body="Search the main food database, or photograph your meal." action={<Button asChild variant="secondary"><Link href="/food?add=1">Search all foods</Link></Button>} />
      )}
      {selected ? <EstimateSheet dish={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function EstimateSheet({ dish, onClose }: { dish: Dish; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const me = useApi<{ today: string }>("/auth/me");
  const [portion, setPortion] = useState<"low" | "typical" | "high" | "custom">("typical");
  const [custom, setCustom] = useState("");
  const [addOns, setAddOns] = useState<string[]>([]);
  const [est, setEst] = useState<Estimate | null>(null);
  const [meal, setMeal] = useState(mealForHour());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (portion === "custom" && !(Number(custom) > 0)) return;
    api.post<Estimate>("/restaurant", { restaurantFoodId: dish.id, portion, customGrams: portion === "custom" ? Number(custom) : null, addOns }).then(setEst).catch(() => setEst(null));
  }, [dish.id, portion, custom, addOns]);

  async function log() {
    if (!est || !me.data) return;
    setSaving(true);
    try {
      await api.post("/diary/entries", { date: me.data.today, mealType: meal, foodId: est.foodId, quantity: est.grams, unit: "g", grams: est.grams, source: "restaurant", confidence: 0.5, displayName: `${dish.dishName} (outside)` });
      for (const a of est.addOns) if (a.foodId) await api.post("/diary/entries", { date: me.data.today, mealType: meal, foodId: a.foodId, quantity: a.grams, unit: "g", grams: a.grams, source: "restaurant", confidence: 0.5, displayName: a.name });
      toast(`Logged ${dish.dishName}`);
      invalidate("/diary", "/dashboard", "/insights");
      router.push("/food");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={dish.dishName} description={dish.portionLabel}>
      <div className="space-y-4">
        <Segmented value={portion} onChange={setPortion} size="sm" options={[{ value: "low", label: "Small" }, { value: "typical", label: "Typical" }, { value: "high", label: "Large" }, { value: "custom", label: "Grams" }]} />
        {portion === "custom" ? <NumberInput suffix="g" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. 300" /> : null}
        {dish.addOns.length ? (
          <div>
            <p className="mb-2 text-sm text-muted">Add-ons</p>
            <div className="flex flex-wrap gap-2">
              {dish.addOns.map((a) => (
                <Chip key={a.name} active={addOns.includes(a.name)} onClick={() => setAddOns(addOns.includes(a.name) ? addOns.filter((x) => x !== a.name) : [...addOns, a.name])}>
                  {addOns.includes(a.name) ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}{a.name}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        {est ? (
          <Card className="text-center">
            <p className="text-sm text-muted">Estimated</p>
            <p className="font-display text-4xl font-bold tabular">{fmt.int(est.kcal)} <span className="text-lg text-muted">kcal</span></p>
            <p className="text-sm text-muted">Likely range {fmt.int(est.range.kcalLow)}–{fmt.int(est.range.kcalHigh)} kcal · {fmt.dec(est.proteinG)} g protein · {fmt.int(est.grams)} g</p>
          </Card>
        ) : <Skeleton className="h-28" />}
        <Notice tone="warn">{est?.basis ?? "Estimated from a restaurant-style recipe."}</Notice>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select value={meal} onChange={(e) => setMeal(e.target.value)} aria-label="Meal">
            {Object.entries(MEAL_LABEL).filter(([k]) => k !== "custom").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Button onClick={log} loading={saving} disabled={!est}>Log</Button>
        </div>
      </div>
    </Sheet>
  );
}
