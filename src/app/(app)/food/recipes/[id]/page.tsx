"use client";

import { ArrowLeft, Copy, Droplet, Heart, Minus, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AddFoodSheet } from "@/components/food/add-food-sheet";
import { Badge, Bar, Button, Card, CardHeader, ErrorState, Notice, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";
import { cn, fmt, mealForHour } from "@/lib/utils";

interface Detail {
  recipe: { id: number; name: string; nameHi: string | null; region: string | null; description: string | null; instructions: string[]; servings: number; servingLabel: string; style: string; ownerUserId: string | null; foodId: number; variantKey: string | null; variantLabel: string | null; sourceNote: string | null; cookingMethod: string | null; prepMinutes: number | null; cookMinutes: number | null; version: number; dietTags: string[] };
  scale: { factor: number; servings: number };
  ingredients: { id: number; name: string; foodName: string | null; grams: number; display: string | null; role: string; isEstimated: boolean; note: string | null; kcal: number; proteinG: number; kcalShare: number }[];
  nutrition: { rawWeightG: number; cookedWeightG: number; cookedWeightIsAssumed: boolean; yieldFactor: number; servingWeightG: number; total: Record<string, number>; perServing: Record<string, number>; per100g: Record<string, number>; addedFatKcal: number; addedSugarKcal: number; coverage: number };
  variants: { id: number; name: string; variantLabel: string | null; style: string }[];
  isFavorite: boolean;
  versions: { id: number; version: number; updatedAt: string }[];
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [servings, setServings] = useState<number | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [fav, setFav] = useState<boolean | null>(null);
  const { data, error, mutate } = useApi<Detail>(`/recipes/${id}${servings ? `?servings=${servings}` : ""}`);
  const me = useApi<{ today: string; user: { id: string } }>("/auth/me");
  const subs = useApi<{ suggestions: { ingredient: string; swapTo: string; why: string; goal: string; deltaPerServing: { kcal: number; proteinG: number; fibreG: number } }[] }>(showSubs ? `/recipes/${id}/substitutions` : null);
  const compare = useApi<{ recipes: { id: number; name: string; variantLabel: string | null; perServing: Record<string, number>; servingWeightG: number; addedFatKcalPerServing: number }[] }>(data && data.variants.length > 1 ? `/recipes/compare?ids=${data.variants.map((v) => v.id).join(",")}` : null);

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (!data) return <div className="space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  const r = data.recipe;
  const n = data.nutrition;
  const sv = data.scale.servings;
  const isMine = Boolean(r.ownerUserId);
  const isFav = fav ?? data.isFavorite;

  async function fork() {
    try {
      const res = await api.post<{ recipe: { id: number } }>(`/recipes/${id}/fork`, {});
      toast("Copied to your recipes — edit quantities to match how you cook");
      router.push(`/food/recipes/new?from=${res.recipe.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted"><ArrowLeft className="h-4 w-4" /> Recipes</button>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight">{r.name}</h1>
          <p className="text-sm text-muted">{[r.nameHi, r.region, r.cookingMethod].filter(Boolean).join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.style !== "home" ? <Badge tone="orange">{r.style}</Badge> : null}
            {r.dietTags.includes("vegan") ? <Badge tone="lime">Vegan</Badge> : r.dietTags.includes("vegetarian") ? <Badge tone="lime">Vegetarian</Badge> : r.dietTags.includes("eggetarian") ? <Badge tone="lime">Eggetarian</Badge> : <Badge>Non-veg</Badge>}
            {isMine ? <Badge tone="purple">My recipe · v{r.version}</Badge> : null}
          </div>
        </div>
        <button
          onClick={async () => { const next = !isFav; setFav(next); await api.put(`/recipes/${id}/favorite`, { on: next }).catch(() => setFav(!next)); }}
          className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2", isFav ? "text-red" : "text-faint")}
          aria-label={isFav ? "Remove favourite" : "Add favourite"}
          aria-pressed={isFav}
        >
          <Heart className={cn("h-5 w-5", isFav && "fill-current")} />
        </button>
      </div>

      {data.variants.length > 1 ? (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {data.variants.map((v) => (
            <Link key={v.id} href={`/food/recipes/${v.id}`} className={cn("shrink-0 rounded-full border px-3.5 py-2 text-sm", v.id === r.id ? "border-lime bg-lime/15 text-lime" : "border-line text-muted")}>
              {v.variantLabel ?? v.name}
            </Link>
          ))}
        </div>
      ) : null}

      <Card className="card-gradient">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Per {r.servingLabel}</p>
            <p className="font-display text-3xl font-bold tabular">{fmt.int(n.perServing.kcal)} <span className="text-base text-muted">kcal</span></p>
            <p className="text-xs text-faint">≈ {fmt.int(n.servingWeightG)} g cooked</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-1">
            <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-surface-3" onClick={() => setServings(Math.max(1, sv - 1))} aria-label="Fewer servings"><Minus className="h-4 w-4" /></button>
            <div className="w-14 text-center"><p className="font-bold tabular">{fmt.dec(sv)}</p><p className="text-[10px] text-faint">servings</p></div>
            <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-surface-3" onClick={() => setServings(sv + 1)} aria-label="More servings"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[["Protein", n.perServing.proteinG, "text-blue"], ["Carbs", n.perServing.carbsG, "text-orange"], ["Fat", n.perServing.fatG, "text-purple"], ["Fibre", n.perServing.fibreG, "text-cyan"]].map(([l, v, c]) => (
            <div key={l as string} className="rounded-2xl bg-surface-2 p-2.5">
              <p className={cn("font-semibold tabular", c as string)}>{fmt.dec(v as number)} g</p>
              <p className="text-[11px] text-faint">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-muted">
          <div><span className="block font-semibold text-ink tabular">{fmt.int(n.rawWeightG)} g</span>raw ingredients</div>
          <div><span className="block font-semibold text-ink tabular">{fmt.int(n.cookedWeightG)} g</span>{n.cookedWeightIsAssumed ? "cooked (assumed = raw)" : "cooked weight"}</div>
          <div><span className="block font-semibold text-ink tabular">{fmt.int(n.per100g.kcal)}</span>kcal / 100 g</div>
        </div>
        {n.addedFatKcal > 0 ? (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-orange/10 px-3 py-2 text-sm text-orange">
            <Droplet className="h-4 w-4" /> {fmt.int(n.addedFatKcal / sv)} kcal per serving comes from oil/ghee/butter
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => setLogOpen(true)}>Log a serving</Button>
          {isMine ? (
            <Button variant="secondary" asChild><Link href={`/food/recipes/new?from=${r.id}`}><Pencil className="h-4 w-4" /> Edit</Link></Button>
          ) : (
            <Button variant="secondary" onClick={fork}><Copy className="h-4 w-4" /> Make my version</Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Ingredients" subtitle={`for ${fmt.dec(sv)} servings · tap a bar to see its share of calories`} />
        <ul className="space-y-2.5">
          {data.ingredients.map((i) => (
            <li key={i.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium capitalize">{i.name}</span>
                  {i.display ? <span className="text-faint"> · {i.display}</span> : null}
                  {i.isEstimated ? <Badge tone="orange" className="ml-1.5">proxy data</Badge> : null}
                </span>
                <span className="shrink-0 tabular text-muted">{fmt.int(i.grams)} g · {fmt.int(i.kcal)} kcal</span>
              </div>
              <Bar value={i.kcalShare / 100} color={i.role === "fat" ? "bg-orange" : i.role === "sugar" ? "bg-red" : "bg-lime"} className="mt-1 h-1.5" />
              {i.note ? <p className="mt-0.5 text-[11px] text-faint">{i.note}</p> : null}
            </li>
          ))}
        </ul>
        {n.coverage < 1 ? <p className="mt-3 text-xs text-orange">{Math.round((1 - n.coverage) * 100)}% of ingredient weight has no nutrition record.</p> : null}
      </Card>

      {compare.data && compare.data.recipes.length > 1 ? (
        <Card>
          <CardHeader title="Compare preparations" subtitle="Per serving" />
          <div className="space-y-2">
            {compare.data.recipes.map((c) => (
              <Link key={c.id} href={`/food/recipes/${c.id}`} className={cn("flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5", c.id === r.id ? "bg-lime/10" : "bg-surface-2")}>
                <span className="min-w-0 truncate text-sm">{c.variantLabel ?? c.name}</span>
                <span className="shrink-0 text-sm tabular"><b>{fmt.int(c.perServing.kcal)}</b> kcal · {fmt.dec(c.perServing.proteinG)} g P · {fmt.int(c.addedFatKcalPerServing)} kcal fat added</span>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Healthier swaps" subtitle="Lower-calorie, higher-protein or higher-fibre versions" icon={<Repeat className="h-5 w-5" />} action={!showSubs ? <Button size="sm" variant="secondary" onClick={() => setShowSubs(true)}>Show</Button> : null} />
        {showSubs ? (
          subs.data ? (
            subs.data.suggestions.length ? (
              <ul className="space-y-2">
                {subs.data.suggestions.map((s, i) => (
                  <li key={i} className="rounded-2xl bg-surface-2 p-3 text-sm">
                    <p><span className="capitalize">{s.ingredient}</span> → <span className="font-semibold">{s.swapTo}</span></p>
                    <p className="text-xs text-muted">{s.why}</p>
                    <p className="mt-1 text-xs tabular">
                      <span className={s.deltaPerServing.kcal <= 0 ? "text-lime" : "text-orange"}>{s.deltaPerServing.kcal > 0 ? "+" : ""}{s.deltaPerServing.kcal} kcal</span>
                      {" · "}<span className="text-blue">{s.deltaPerServing.proteinG > 0 ? "+" : ""}{s.deltaPerServing.proteinG} g protein</span>
                      {" · "}<span className="text-cyan">{s.deltaPerServing.fibreG > 0 ? "+" : ""}{s.deltaPerServing.fibreG} g fibre</span> per serving
                    </p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No obvious swaps for this recipe.</p>
          ) : <Skeleton className="h-24" />
        ) : null}
      </Card>

      {r.instructions.length ? (
        <Card>
          <CardHeader title="Method" subtitle={r.prepMinutes != null ? `Prep ${r.prepMinutes >= 120 ? `${Math.round(r.prepMinutes / 60)} h (incl. soaking)` : `${r.prepMinutes} min`} · Cook ${r.cookMinutes ?? "—"} min` : undefined} />
          <ol className="space-y-2">
            {r.instructions.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold">{i + 1}</span><span className="pt-0.5">{s}</span></li>
            ))}
          </ol>
        </Card>
      ) : null}

      {r.sourceNote ? <Notice>{r.sourceNote} Nutrient data: USDA FoodData Central (public domain).</Notice> : null}

      {isMine ? (
        <Button variant="danger" className="w-full" onClick={async () => { if (!confirm("Delete this recipe? Logged meals keep their nutrition.")) return; await api.del(`/recipes/${id}`); invalidate("/recipes"); router.replace("/food/recipes"); }}>
          <Trash2 className="h-4 w-4" /> Delete recipe
        </Button>
      ) : null}

      {me.data ? <AddFoodSheet open={logOpen} onOpenChange={setLogOpen} date={me.data.today} defaultMeal={mealForHour()} preselected={{ id: r.foodId, name: r.name, kcal: n.per100g.kcal ?? null, proteinG: n.per100g.proteinG ?? null }} /> : null}
    </div>
  );
}
