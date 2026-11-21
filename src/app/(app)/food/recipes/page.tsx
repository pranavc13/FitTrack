"use client";

import { BookOpen, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Chip, EmptyState, ErrorState, Skeleton } from "@/components/ui/primitives";
import { useApi } from "@/lib/client/api";
import { fmt } from "@/lib/utils";

interface RecipeRow {
  id: number;
  name: string;
  nameHi: string | null;
  region: string | null;
  style: string;
  servingLabel: string;
  dietTags: string[];
  tags: string[];
  variantLabel: string | null;
  ownerUserId: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  perServing: { kcal: number | null; proteinG: number | null; fibreG: number | null; grams: number };
}

export default function RecipesPage() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "favorites" | "highProtein" | "restaurant">("all");
  const [diet, setDiet] = useState(false);
  const me = useApi<{ profile: { dietPreference: string } | null }>("/auth/me");
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const params = new URLSearchParams();
  if (dq) params.set("q", dq);
  if (region) params.set("region", region);
  if (filter === "mine") params.set("mine", "1");
  if (filter === "favorites") params.set("favorites", "1");
  if (filter === "highProtein") params.set("highProtein", "1");
  if (filter === "restaurant") params.set("style", "restaurant");
  if (diet && me.data?.profile) params.set("diet", me.data.profile.dietPreference);
  const { data, error, mutate } = useApi<{ recipes: RecipeRow[]; regions: { region: string; n: number }[] }>(`/recipes?${params}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Recipes</h1>
          <p className="text-sm text-muted">Nutrition calculated from ingredients — not guessed per dish.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/food/recipes/new"><Plus className="h-4 w-4" /> New</Link>
        </Button>
      </div>

      <Link href="/food/recipes/new?ai=1">
        <Card className="flex items-center gap-3 border-lime/30 bg-lime/5 hover:bg-lime/10">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime/15 text-lime"><Sparkles className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold">Describe what you cooked</p>
            <p className="text-sm text-muted">&ldquo;Paneer bhurji with 150 g paneer, 1 onion, 2 tomatoes, 1 tsp oil&rdquo; → full nutrition</p>
          </div>
        </Card>
      </Link>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes: rajma, dosa, biryani…" aria-label="Search recipes" className="h-12 w-full rounded-2xl border border-line bg-surface-2 pl-12 pr-4 focus:border-lime/60 focus:outline-none" />
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {([["all", "All"], ["highProtein", "High protein"], ["restaurant", "Restaurant style"], ["favorites", "Favourites"], ["mine", "My recipes"]] as const).map(([v, l]) => (
          <Chip key={v} active={filter === v} onClick={() => setFilter(v)}>{l}</Chip>
        ))}
        <Chip active={diet} onClick={() => setDiet(!diet)}>Fits my diet</Chip>
      </div>
      {data?.regions.length ? (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={!region} onClick={() => setRegion(null)}>All regions</Chip>
          {data.regions.map((r) => (
            <Chip key={r.region} active={region === r.region} onClick={() => setRegion(region === r.region ? null : r.region)}>{r.region}</Chip>
          ))}
        </div>
      ) : null}

      {error ? <ErrorState error={error} onRetry={() => mutate()} /> : null}
      {!data ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : data.recipes.length ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {data.recipes.map((r) => (
            <Link key={r.id} href={`/food/recipes/${r.id}`} prefetch={false}>
              <Card className="h-full p-3.5 hover:bg-surface-2 [contain-intrinsic-size:auto_92px] [content-visibility:auto]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">{r.name}</p>
                    <p className="truncate text-xs text-muted">{[r.nameHi, r.region].filter(Boolean).join(" · ")}</p>
                  </div>
                  {r.ownerUserId ? <Badge tone="purple">Mine</Badge> : r.style !== "home" ? <Badge tone="orange">{r.style}</Badge> : null}
                </div>
                <div className="mt-2.5 flex items-center gap-3 text-sm">
                  <span className="font-semibold tabular">{fmt.int(r.perServing.kcal)} kcal</span>
                  <span className="text-blue tabular">{fmt.dec(r.perServing.proteinG)} g P</span>
                  <span className="text-cyan tabular">{fmt.dec(r.perServing.fibreG)} g fibre</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-faint">per {r.servingLabel}</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={<BookOpen className="h-5 w-5" />} title="No recipes match" body="Try another name, clear filters, or create your own recipe from ingredients." action={<Button asChild><Link href="/food/recipes/new">Create recipe</Link></Button>} />
      )}
    </div>
  );
}
