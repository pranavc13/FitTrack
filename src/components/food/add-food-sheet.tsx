"use client";

import { ArrowLeft, Heart, Plus, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Badge, Button, Chip, EmptyState, NumberInput, Select, Spinner } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, offlineCapable, useApi } from "@/lib/client/api";
import { cn, fmt, MEAL_LABEL, QUALITY_LABEL } from "@/lib/utils";

export interface FoodHit {
  id: number;
  name: string;
  nameHi?: string | null;
  brand?: string | null;
  kcal: number | null;
  proteinG: number | null;
  dataQuality?: string;
  matchedSynonym?: string | null;
  defaultServing?: { label: string; grams: number } | null;
  foodType?: string;
  lastQuantity?: number;
  lastUnit?: string;
}

interface FoodDetail {
  id: number;
  name: string;
  nameHi: string | null;
  brand: string | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  dataQuality: string;
  confidence: number;
  state: string;
  recipeId: number | null;
  densityGPerMl: number | null;
  servings: { id: number; label: string; unit: string; amount: number; grams: number; isDefault: boolean }[];
  source: { name: string; license: string } | null;
  isFavorite: boolean;
  validation: string[];
}

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function AddFoodSheet({ open, onOpenChange, date, defaultMeal, preselected }: { open: boolean; onOpenChange: (o: boolean) => void; date: string; defaultMeal: string; preselected?: FoodHit | null }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"recent" | "favorites">("recent");
  const [selected, setSelected] = useState<FoodHit | null>(null);
  const dq = useDebounced(q.trim());
  const search = useApi<{ results: FoodHit[] }>(open && dq.length >= 2 ? `/foods/search?q=${encodeURIComponent(dq)}` : null);
  const recent = useApi<{ recent: FoodHit[]; favorites: FoodHit[] }>(open ? "/foods/recent" : null);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setQ("");
    } else if (preselected) setSelected(preselected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on id: callers pass fresh objects each render
  }, [open, preselected?.id]);

  const list = dq.length >= 2 ? search.data?.results : tab === "recent" ? recent.data?.recent : recent.data?.favorites;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={selected ? "Add to diary" : "Add food"} size="full">
      {selected ? (
        <PortionPanel food={selected} date={date} defaultMeal={defaultMeal} onBack={() => setSelected(null)} onDone={() => onOpenChange(false)} />
      ) : (
        <div className="space-y-3">
          <div className="sticky top-0 z-10 -mx-1 bg-surface px-1 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search: roti, दाल, paneer, idli…"
                className="h-12 w-full rounded-2xl border border-line bg-surface-2 pl-12 pr-4 placeholder:text-faint focus:border-lime/60 focus:outline-none"
                enterKeyHint="search"
                aria-label="Search foods"
              />
            </div>
            {dq.length < 2 ? (
              <div className="mt-3 flex gap-2">
                <Chip active={tab === "recent"} onClick={() => setTab("recent")}>Recent</Chip>
                <Chip active={tab === "favorites"} onClick={() => setTab("favorites")}>
                  <Heart className="mr-1 inline h-3.5 w-3.5" /> Favourites
                </Chip>
              </div>
            ) : null}
          </div>
          {(dq.length >= 2 ? search.isLoading : recent.isLoading) && !list ? (
            <div className="grid place-items-center py-10"><Spinner /></div>
          ) : list && list.length ? (
            <ul className="space-y-1.5">
              {list.map((f) => (
                <li key={f.id}>
                  <button onClick={() => setSelected(f)} className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3 text-left hover:bg-surface-3 active:scale-[0.99]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{f.name}</p>
                      <p className="truncate text-xs text-muted">
                        {f.matchedSynonym && f.matchedSynonym.toLowerCase() !== f.name.toLowerCase() ? `"${f.matchedSynonym}" · ` : ""}
                        {f.defaultServing ? `${f.defaultServing.label} · ${fmt.int(((f.kcal ?? 0) * f.defaultServing.grams) / 100)} kcal` : `${fmt.int(f.kcal)} kcal / 100 g`}
                        {f.brand ? ` · ${f.brand}` : ""}
                      </p>
                    </div>
                    {f.dataQuality && f.dataQuality !== "verified" ? <Badge tone={f.dataQuality === "calculated" ? "cyan" : "orange"}>{f.dataQuality === "calculated" ? "recipe" : f.dataQuality}</Badge> : null}
                    <Plus className="h-5 w-5 shrink-0 text-lime" />
                  </button>
                </li>
              ))}
            </ul>
          ) : dq.length >= 2 ? (
            <EmptyState title={`No match for "${dq}"`} body="Try another spelling or the Hindi name, build it as a recipe, or scan the pack label." icon={<Search className="h-5 w-5" />} />
          ) : (
            <EmptyState title={tab === "recent" ? "No recent foods yet" : "No favourites yet"} body="Search above — results include Indian dishes calculated from their ingredients, USDA foods and your own foods." />
          )}
        </div>
      )}
    </Sheet>
  );
}

function PortionPanel({ food, date, defaultMeal, onBack, onDone }: { food: FoodHit; date: string; defaultMeal: string; onBack: () => void; onDone: () => void }) {
  const toast = useToast();
  const detail = useApi<FoodDetail>(`/foods/${food.id}`);
  const [quantity, setQuantity] = useState<string>(food.lastQuantity ? String(food.lastQuantity) : "1");
  const [unit, setUnit] = useState<string>("");
  const [meal, setMeal] = useState(defaultMeal);
  const [saving, setSaving] = useState(false);
  const [fav, setFav] = useState<boolean | null>(null);

  const units = useMemo(() => {
    const d = detail.data;
    if (!d) return [] as { value: string; label: string; grams?: number }[];
    const fromServings = d.servings.map((s) => ({ value: `serving:${s.id}`, label: `${s.label.replace(/^[\d.\/]+\s+/, "")} (${Math.round(s.grams / (s.amount || 1))} g)`, grams: s.grams / (s.amount || 1) }));
    const seen = new Set<string>();
    const opts = [...fromServings, { value: "g", label: "grams" }, ...(d.densityGPerMl || d.state !== "raw" ? [{ value: "ml", label: "ml" }] : [])].filter((o) => (seen.has(o.value) ? false : (seen.add(o.value), true)));
    return opts;
  }, [detail.data]);

  useEffect(() => {
    if (!unit && units.length) {
      const first = units[0]!;
      setUnit(first.value);
      if (first.value === "g") setQuantity("100");
    }
  }, [units, unit]);

  const qn = Number(quantity);
  const preview = useApi<{ grams: number; isEstimate: boolean; basis: string; nutrients: Record<string, number | null> }>(unit && qn > 0 ? `/foods/portion?foodId=${food.id}&quantity=${qn}&unit=${encodeURIComponent(unit)}` : null);
  const d = detail.data;
  const isFav = fav ?? d?.isFavorite ?? false;

  async function add() {
    setSaving(true);
    try {
      const r = await offlineCapable("POST", "/diary/entries", { date, mealType: meal, foodId: food.id, quantity: qn, unit }, food.name);
      toast(r.state === "queued" ? "Saved offline — will sync when you're back online" : `Added ${food.name}`, r.state === "queued" ? "queued" : "success");
      invalidate("/diary", "/dashboard", "/foods/recent", "/insights");
      onDone();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFav() {
    const next = !isFav;
    setFav(next);
    await api.put(`/foods/${food.id}/favorite`, { on: next }).catch(() => setFav(!next));
    invalidate("/foods/recent");
  }

  const n = preview.data?.nutrients;
  const q = QUALITY_LABEL[d?.dataQuality ?? "verified"];
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2" aria-label="Back to search">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{food.name}</p>
          {d?.nameHi ? <p className="text-sm text-muted">{d.nameHi}</p> : null}
          {d ? <p className={cn("mt-0.5 text-xs", q?.tone)}>{q?.label}{d.source ? ` · ${d.source.name}` : ""}</p> : null}
        </div>
        <button onClick={toggleFav} className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2", isFav ? "text-red" : "text-faint")} aria-label={isFav ? "Remove from favourites" : "Add to favourites"} aria-pressed={isFav}>
          <Star className={cn("h-5 w-5", isFav && "fill-current")} />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_1.4fr] gap-3">
        <NumberInput value={quantity} onChange={(e) => setQuantity(e.target.value)} min={0} aria-label="Quantity" />
        <Select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
          {units.map((u) => (
            <option key={u.value + u.label} value={u.value}>{u.label}</option>
          ))}
          <option value="katori">katori (≈150 ml, estimate)</option>
          <option value="bowl">bowl (≈250 ml, estimate)</option>
          <option value="tbsp">tablespoon</option>
          <option value="tsp">teaspoon</option>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        {[0.5, 1, 1.5, 2, 3].map((v) => (
          <Chip key={v} active={qn === v} onClick={() => setQuantity(String(v))}>{v}×</Chip>
        ))}
      </div>

      <div className="rounded-3xl border border-line bg-surface-2 p-4">
        {preview.error ? (
          <p className="text-sm text-orange">{(preview.error as Error).message}</p>
        ) : n ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-3xl font-bold tabular">{fmt.int(n.kcal)} <span className="text-base font-medium text-muted">kcal</span></span>
              <span className="text-sm text-muted tabular">{fmt.int(preview.data!.grams)} g</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[["Protein", n.proteinG, "text-blue"], ["Carbs", n.carbsG, "text-orange"], ["Fat", n.fatG, "text-purple"], ["Fibre", n.fibreG, "text-cyan"]].map(([l, v, c]) => (
                <div key={l as string} className="rounded-2xl bg-surface p-2">
                  <p className={cn("font-semibold tabular", c as string)}>{v == null ? "—" : fmt.dec(v as number)}</p>
                  <p className="text-[11px] text-faint">{l}</p>
                </div>
              ))}
            </div>
            {preview.data!.isEstimate ? <p className="mt-2 text-xs text-orange">Generic portion conversion — weigh it or pick a listed serving for accuracy.</p> : null}
          </>
        ) : (
          <div className="grid h-24 place-items-center"><Spinner /></div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-muted">Meal</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {Object.entries(MEAL_LABEL).filter(([k]) => k !== "custom").map(([k, l]) => (
            <Chip key={k} active={meal === k} onClick={() => setMeal(k)}>{l}</Chip>
          ))}
        </div>
      </div>
      {d?.validation?.length ? <p className="text-xs text-orange">Data check: {d.validation.join("; ")}</p> : null}
      <Button size="lg" className="w-full" onClick={add} loading={saving} disabled={!(qn > 0) || !unit}>
        Add to {MEAL_LABEL[meal]}
      </Button>
    </div>
  );
}
