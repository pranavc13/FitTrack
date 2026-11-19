"use client";

import { Droplet, Gauge, PieChart, Plus, Salad, Wallet } from "lucide-react";
import { useState } from "react";
import { AddFoodSheet } from "@/components/food/add-food-sheet";
import { Bar, Card, CardHeader, ErrorState, Notice, ProgressRing, Skeleton } from "@/components/ui/primitives";
import { useApi } from "@/lib/client/api";
import { weekdayShort } from "@/lib/dates";
import { cn, fmt, mealForHour, MEAL_LABEL } from "@/lib/utils";

interface Insights {
  date: string;
  protein: { target: number | null; eaten: number; remaining: number | null; suggestions: { foodId: number; label: string; grams: number; proteinG: number; kcal: number }[] };
  fibre: { target: number; eaten: number; remaining: number; entriesMissingFibreData: number; suggestions: { foodId: number; label: string; grams: number; fibreG: number; kcal: number }[] };
  score: { score: number | null; reason: string; components: { key: string; label: string; weight: number; value: number; points: number }[] };
  hidden: { totalKcal: number; days: number; breakdown: { key: string; label: string; kcal: number }[]; note: string };
  budget: { budget: number; consumed: number; remaining: number; loggedDays: number; averageLogged: number | null; suggestedPerRemainingDay: number | null; days: { date: string; kcal: number; logged: boolean }[] };
  timing: { meals: { mealType: string; kcalShare: number; proteinShare: number; avgProteinG: number }[]; note: string };
  variety: { groups: { group: string; count: number }[]; distinctFoods: number };
}

const GROUP_LABEL: Record<string, string> = { vegetables: "Vegetables", fruits: "Fruits", grains: "Grains", pulses: "Pulses", dairy_eggs: "Dairy & eggs", meat_fish: "Meat & fish", nuts_seeds: "Nuts & seeds", fats_oils: "Fats & oils", beverages: "Drinks", prepared_dishes: "Dishes", sweets: "Sweets", snacks: "Snacks", spices_condiments: "Spices", other: "Other" };

export default function InsightsPage() {
  const { data, error, mutate } = useApi<Insights>("/insights");
  const [add, setAdd] = useState<{ id: number; name: string } | null>(null);
  if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (!data) return <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-60" /></div>;
  const hiddenMax = Math.max(1, ...data.hidden.breakdown.map((b) => b.kcal));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Nutrition insights</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Protein gap" subtitle={data.protein.target ? `${fmt.int(data.protein.eaten)} of ${data.protein.target} g today` : "Set a protein target"} icon={<Gauge className="h-5 w-5" />} />
          {data.protein.target ? <Bar value={data.protein.eaten / data.protein.target} color="bg-blue" className="mb-3 h-3" /> : null}
          {data.protein.remaining ? (
            <>
              <p className="mb-2 text-sm"><b className="text-blue">{fmt.int(data.protein.remaining)} g</b> to go. Best protein per calorie for your diet:</p>
              <SuggestionList items={data.protein.suggestions.map((s) => ({ id: s.foodId, label: s.label, main: `${fmt.dec(s.proteinG)} g protein`, sub: `${s.kcal} kcal` }))} onAdd={(i) => setAdd(i)} />
            </>
          ) : <p className="text-sm text-lime">Protein target reached today 🎯</p>}
        </Card>

        <Card>
          <CardHeader title="Fibre gap" subtitle={`${fmt.dec(data.fibre.eaten)} of ${data.fibre.target} g today`} icon={<Salad className="h-5 w-5" />} />
          <Bar value={data.fibre.eaten / data.fibre.target} color="bg-cyan" className="mb-3 h-3" />
          {data.fibre.remaining > 0 ? (
            <SuggestionList items={data.fibre.suggestions.map((s) => ({ id: s.foodId, label: s.label, main: `${fmt.dec(s.fibreG)} g fibre`, sub: `${s.kcal} kcal` }))} onAdd={(i) => setAdd(i)} />
          ) : <p className="text-sm text-lime">Fibre target reached 🌿</p>}
          {data.fibre.entriesMissingFibreData ? <p className="mt-2 text-[11px] text-faint">{data.fibre.entriesMissingFibreData} logged item(s) have no fibre value in their source data.</p> : null}
        </Card>
      </div>

      <Card>
        <CardHeader title="Daily nutrition score" subtitle={data.score.reason} icon={<PieChart className="h-5 w-5" />} />
        {data.score.score == null ? (
          <p className="text-sm text-muted">{data.score.reason}</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <ProgressRing value={data.score.score / 100} size={120} stroke={11}>
              <div><p className="font-display text-3xl font-bold">{data.score.score}</p><p className="text-[11px] text-faint">/ 100</p></div>
            </ProgressRing>
            <ul className="flex-1 space-y-2">
              {data.score.components.map((c) => (
                <li key={c.key}>
                  <div className="flex justify-between text-xs"><span className="text-muted">{c.label}</span><span className="tabular">{c.points}/{c.weight}</span></div>
                  <Bar value={c.value} className="mt-1 h-1.5" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Hidden calories (7 days)" subtitle={`${fmt.int(data.hidden.totalKcal)} kcal logged in total`} icon={<Droplet className="h-5 w-5" />} />
        <ul className="space-y-2.5">
          {data.hidden.breakdown.map((b) => (
            <li key={b.key}>
              <div className="flex justify-between text-sm"><span>{b.label}</span><span className="tabular text-muted">{fmt.int(b.kcal)} kcal · {fmt.int(b.kcal / data.hidden.days)}/day</span></div>
              <Bar value={b.kcal / hiddenMax} color="bg-orange" className="mt-1 h-1.5" />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-faint">{data.hidden.note} Every teaspoon of oil or ghee is about 40 kcal.</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Weekly calorie budget" subtitle="Your weekly average matters more than any single day" icon={<Wallet className="h-5 w-5" />} />
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold tabular">{fmt.int(data.budget.consumed)}</span>
            <span className="text-sm text-muted">of {fmt.int(data.budget.budget)} kcal</span>
          </div>
          <Bar value={data.budget.budget ? data.budget.consumed / data.budget.budget : 0} className="h-3" />
          <div className="mt-3 flex justify-between gap-1">
            {data.budget.days.map((d) => (
              <div key={d.date} className="flex-1 text-center">
                <p className={cn("text-xs font-semibold tabular", !d.logged && "text-faint")}>{d.logged ? fmt.int(d.kcal) : "—"}</p>
                <p className="text-[10px] text-faint">{weekdayShort(d.date)}</p>
              </div>
            ))}
          </div>
          {data.budget.suggestedPerRemainingDay ? <p className="mt-3 text-sm text-muted">≈{fmt.int(data.budget.suggestedPerRemainingDay)} kcal/day for the rest of the week keeps you on budget.</p> : null}
        </Card>

        <Card>
          <CardHeader title="Meal timing" subtitle="Share of calories and protein by meal (7 days)" />
          {data.timing.meals.length ? (
            <ul className="space-y-2.5">
              {data.timing.meals.map((m) => (
                <li key={m.mealType}>
                  <div className="flex justify-between text-sm"><span>{MEAL_LABEL[m.mealType] ?? m.mealType}</span><span className="tabular text-muted">{m.kcalShare}% kcal · {fmt.int(m.avgProteinG)} g P/day</span></div>
                  <Bar value={m.kcalShare / 100} className="mt-1 h-1.5" />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Log a few days to see your pattern.</p>}
          <p className="mt-3 text-[11px] text-faint">{data.timing.note}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Food variety (7 days)" subtitle={`${data.variety.distinctFoods} different foods & dishes`} />
        <div className="flex flex-wrap gap-2">
          {data.variety.groups.map((g) => (
            <span key={g.group} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm">{GROUP_LABEL[g.group] ?? g.group} <b className="tabular text-lime">{g.count}</b></span>
          ))}
        </div>
      </Card>
      <Notice>Insights are based on your own targets and logged data — they&apos;re guidance, not medical advice.</Notice>

      <AddFoodSheet open={!!add} onOpenChange={(o) => !o && setAdd(null)} date={data.date} defaultMeal={mealForHour()} preselected={add ? { id: add.id, name: add.name, kcal: null, proteinG: null } : null} />
    </div>
  );
}

function SuggestionList({ items, onAdd }: { items: { id: number; label: string; main: string; sub: string }[]; onAdd: (i: { id: number; name: string }) => void }) {
  return (
    <ul className="space-y-1.5">
      {items.slice(0, 6).map((s) => (
        <li key={s.id + s.label} className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{s.label}</p>
            <p className="text-xs text-muted">{s.main} · {s.sub}</p>
          </div>
          <button onClick={() => onAdd({ id: s.id, name: s.label })} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime/15 text-lime" aria-label={`Log ${s.label}`}><Plus className="h-4 w-4" /></button>
        </li>
      ))}
    </ul>
  );
}
