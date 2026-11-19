"use client";

import { BookOpen, Copy, Lightbulb, MoreHorizontal, Plus, ScanBarcode, ScanLine, ShoppingBasket, Store, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AddFoodSheet } from "@/components/food/add-food-sheet";
import { DateStrip } from "@/components/food/date-strip";
import { Badge, Button, Card, EmptyState, ErrorState, MacroStat, NumberInput, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";
import { addDays } from "@/lib/dates";
import { cn, fmt, mealForHour, MEAL_LABEL, QUALITY_LABEL } from "@/lib/utils";

interface Entry {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number | null;
  dataQuality: string;
  confidence: number;
  source: string;
  addedFatKcal: number | null;
}
interface Day {
  date: string;
  meals: { mealId: number; mealType: string; name: string; entries: Entry[]; totals: { kcal: number; proteinG: number } }[];
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; addedFatKcal: number; count: number; missing: Record<string, number> };
}
interface Me {
  today: string;
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number } | null;
}

export default function FoodPage() {
  return (
    <Suspense>
      <FoodDiary />
    </Suspense>
  );
}

function FoodDiary() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const me = useApi<Me>("/auth/me");
  const today = me.data?.today;
  const [date, setDate] = useState<string | null>(params.get("date"));
  const [addOpen, setAddOpen] = useState(params.get("add") === "1");
  const [addMeal, setAddMeal] = useState(mealForHour());
  const [editing, setEditing] = useState<Entry | null>(null);
  const current = date ?? today ?? null;
  const day = useApi<Day>(current ? `/diary?date=${current}` : null);

  useEffect(() => {
    if (params.get("add") === "1") router.replace("/food");
  }, [params, router]);

  async function copyYesterday() {
    if (!current) return;
    try {
      const r = await api.post<{ copied: number }>("/diary/copy", { from: addDays(current, -1), to: current });
      toast(r.copied ? `Copied ${r.copied} items from the previous day` : "Nothing logged the previous day", r.copied ? "success" : "info");
      invalidate("/diary", "/dashboard");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const t = me.data?.targets;
  const totals = day.data?.totals;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Food</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add food
        </Button>
      </div>

      {today && current ? <DateStrip date={current} today={today} onChange={setDate} /> : <Skeleton className="h-14" />}

      {/* Quick actions */}
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
        {[
          { href: "/scan", icon: ScanLine, label: "Photo", tone: "text-lime" },
          { href: "/scan?mode=label", icon: ScanBarcode, label: "Label / barcode", tone: "text-blue" },
          { href: "/food/recipes", icon: BookOpen, label: "Recipes", tone: "text-orange" },
          { href: "/food/restaurant", icon: Store, label: "Eating out", tone: "text-purple" },
          { href: "/food/insights", icon: Lightbulb, label: "Insights", tone: "text-cyan" },
          { href: "/food/plan", icon: ShoppingBasket, label: "Plan & grocery", tone: "text-yellow" },
        ].map(({ href, icon: Icon, label, tone }) => (
          <Link key={href} href={href} className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3 text-xs font-semibold hover:bg-surface-2">
            <Icon className={cn("h-5 w-5", tone)} />
            {label}
          </Link>
        ))}
      </div>

      {day.error && !day.data ? <ErrorState error={day.error} onRetry={() => day.mutate()} /> : null}

      {totals ? (
        <Card className="card-gradient">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-sm text-muted">Total</p>
              <p className="font-display text-3xl font-bold tabular">{fmt.int(totals.kcal)} <span className="text-base font-medium text-muted">/ {t ? fmt.int(t.calories) : "—"} kcal</span></p>
            </div>
            {totals.addedFatKcal > 0 ? <Badge tone="orange">{fmt.int(totals.addedFatKcal)} kcal from oil/ghee</Badge> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
            <MacroStat label="Protein" value={totals.proteinG} target={t?.proteinG} color="bg-blue" />
            <MacroStat label="Carbs" value={totals.carbsG} target={t?.carbsG} color="bg-orange" />
            <MacroStat label="Fat" value={totals.fatG} target={t?.fatG} color="bg-purple" />
            <MacroStat label="Fibre" value={totals.fibreG} target={t?.fibreG} color="bg-cyan" />
          </div>
          {totals.missing?.fibreG ? <p className="mt-2 text-[11px] text-faint">{totals.missing.fibreG} item(s) have no fibre data in their source — totals may be slightly low.</p> : null}
        </Card>
      ) : (
        <Skeleton className="h-40" />
      )}

      {day.data ? (
        <div className="space-y-3">
          {(["breakfast", "morning_snack", "lunch", "evening_snack", "dinner", "pre_workout", "post_workout", "custom"] as const)
            .map((type) => ({ type, groups: day.data!.meals.filter((m) => m.mealType === type) }))
            .filter(({ type, groups }) => groups.length || ["breakfast", "lunch", "dinner", "evening_snack"].includes(type))
            .map(({ type, groups }) => {
              const entries = groups.flatMap((g) => g.entries);
              const kcal = entries.reduce((a, e) => a + e.kcal, 0);
              return (
                <Card key={type} className="p-0">
                  <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
                    <div>
                      <p className="font-semibold">{MEAL_LABEL[type]}</p>
                      <p className="text-xs text-muted">{entries.length ? `${fmt.int(kcal)} kcal · ${fmt.int(entries.reduce((a, e) => a + e.proteinG, 0))} g protein` : "Nothing logged"}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Link href={`/scan?meal=${type}`} className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted hover:text-lime" aria-label={`Scan ${MEAL_LABEL[type]}`}>
                        <ScanLine className="h-5 w-5" />
                      </Link>
                      <button onClick={() => { setAddMeal(type); setAddOpen(true); }} className="grid h-10 w-10 place-items-center rounded-xl bg-lime/15 text-lime" aria-label={`Add to ${MEAL_LABEL[type]}`}>
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  {entries.length ? (
                    <ul className="divide-y divide-line border-t border-line">
                      {entries.map((e) => (
                        <li key={e.id}>
                          <button onClick={() => setEditing(e)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px]">{e.name}</p>
                              <p className="truncate text-xs text-muted">
                                {e.unit === "g" ? `${fmt.int(e.grams)} g` : `${fmt.dec(e.quantity)} ${e.unit} · ${fmt.int(e.grams)} g`} · P {fmt.dec(e.proteinG)} g
                                {e.source === "scan" ? " · 📷" : ""}
                              </p>
                            </div>
                            {e.dataQuality !== "verified" && e.dataQuality !== "calculated" ? <Badge tone="orange">{QUALITY_LABEL[e.dataQuality]?.label ?? e.dataQuality}</Badge> : null}
                            <span className="font-semibold tabular">{fmt.int(e.kcal)}</span>
                            <MoreHorizontal className="h-4 w-4 text-faint" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              );
            })}
          {!day.data.totals.count ? (
            <EmptyState
              title="Nothing logged for this day"
              body="Snap a photo, search the food database, or copy the previous day's meals."
              action={<Button variant="secondary" onClick={copyYesterday}><Copy className="h-4 w-4" /> Copy previous day</Button>}
            />
          ) : (
            <Button variant="ghost" className="w-full" onClick={copyYesterday}><Copy className="h-4 w-4" /> Copy previous day&apos;s meals here</Button>
          )}
        </div>
      ) : (
        <Skeleton className="h-60" />
      )}

      {current ? <AddFoodSheet open={addOpen} onOpenChange={setAddOpen} date={current} defaultMeal={addMeal} /> : null}
      {editing && current ? <EntrySheet entry={editing} date={current} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function EntrySheet({ entry, date, onClose }: { entry: Entry; date: string; onClose: () => void }) {
  const toast = useToast();
  const [qty, setQty] = useState(String(entry.quantity));
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => invalidate("/diary", "/dashboard", "/insights");

  async function run(kind: string, fn: () => Promise<unknown>, msg: string) {
    setBusy(kind);
    try {
      await fn();
      toast(msg);
      refresh();
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={entry.name} description={`${fmt.int(entry.kcal)} kcal · ${fmt.int(entry.grams)} g · ${QUALITY_LABEL[entry.dataQuality]?.label ?? entry.dataQuality}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[["Protein", entry.proteinG], ["Carbs", entry.carbsG], ["Fat", entry.fatG], ["Fibre", entry.fibreG]].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl bg-surface-2 p-2.5">
              <p className="font-semibold tabular">{v == null ? "—" : fmt.dec(v as number)}</p>
              <p className="text-[11px] text-faint">{l} g</p>
            </div>
          ))}
        </div>
        {entry.addedFatKcal ? <p className="text-xs text-orange">≈{fmt.int(entry.addedFatKcal)} kcal of this comes from added oil/ghee/butter in the recipe.</p> : null}
        {entry.confidence < 0.8 ? <p className="text-xs text-muted">Confidence {Math.round(entry.confidence * 100)}% — portion or nutrition data is estimated.</p> : null}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <p className="mb-1.5 text-sm text-muted">Quantity ({entry.unit})</p>
            <NumberInput value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <Button loading={busy === "save"} disabled={!(Number(qty) > 0)} onClick={() => run("save", () => api.patch(`/diary/entries/${entry.id}`, { quantity: Number(qty) }), "Updated")}>
            Save
          </Button>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted">Move to</p>
          <div className="flex flex-wrap gap-2">
            {["breakfast", "morning_snack", "lunch", "evening_snack", "dinner"].map((m) => (
              <button key={m} className="h-9 rounded-full border border-line px-3 text-sm hover:bg-surface-2" onClick={() => run("move", () => api.patch(`/diary/entries/${entry.id}`, { mealType: m }), `Moved to ${MEAL_LABEL[m]}`)}>
                {MEAL_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" loading={busy === "dup"} onClick={() => run("dup", () => api.post(`/diary/entries/${entry.id}/duplicate`, {}), "Duplicated")}>
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          <Button variant="secondary" loading={busy === "tmrw"} onClick={() => run("tmrw", () => api.post(`/diary/entries/${entry.id}/duplicate`, { date: addDays(date, 1) }), "Copied to next day")}>
            Copy to next day
          </Button>
        </div>
        <Button variant="danger" className="w-full" loading={busy === "del"} onClick={() => run("del", () => api.del(`/diary/entries/${entry.id}`), "Deleted")}>
          <Trash2 className="h-4 w-4" /> Delete entry
        </Button>
      </div>
    </Sheet>
  );
}
