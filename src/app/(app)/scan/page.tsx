"use client";

import { AlertTriangle, Barcode, Check, Loader2, Plus, RefreshCcw, ScanLine, Search, Sparkles, Tag, Trash2, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { CameraCapture, type Shot } from "@/components/scan/camera";
import { FoodPicker } from "@/components/food/food-picker";
import { AddFoodSheet, type FoodHit } from "@/components/food/add-food-sheet";
import { useAppState } from "@/components/providers";
import { Badge, Bar, Button, Card, Chip, Field, Input, Notice, NumberInput, Segmented, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";
import { cn, fmt, mealForHour, MEAL_LABEL } from "@/lib/utils";

type Mode = "meal" | "label" | "barcode";

interface Macros100 {
  kcal100: number | null;
  protein100: number | null;
  carbs100?: number | null;
  fat100?: number | null;
  fibre100?: number | null;
}
interface ScanItem {
  id: number;
  detectedName: string;
  cookingStyle: string;
  count?: number;
  householdMeasure?: string;
  container?: string;
  portionBasis?: string | null;
  pieceGrams?: number | null;
  estimatedGrams: number;
  gramsLow: number;
  gramsHigh: number;
  recognitionConfidence: number;
  quantityConfidence: number;
  nutritionConfidence: number;
  reasoning: string;
  match: (Macros100 & { id: number; name: string; dataQuality: string; source: string | null }) | null;
  alternatives: (Macros100 & { id: number; name: string })[];
}
interface MealScanResult {
  scanId: number;
  isFood: boolean;
  plateNotes: string;
  questions: string[];
  items: ScanItem[];
  disclaimer: string;
}

export default function ScanPage() {
  return (
    <Suspense>
      <Scanner />
    </Suspense>
  );
}

function Scanner() {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "meal");
  // Barcode → label hand-off, so a product that isn't in the database gets saved under its barcode.
  const [prefill, setPrefill] = useState<LabelPrefill>(() => ({ manual: params.get("manual") === "1", name: params.get("name") ?? "" }));
  const me = useApi<{ today: string; aiEnabled: boolean }>("/auth/me");
  const { online } = useAppState();
  const meal = params.get("meal") ?? mealForHour();
  const toLabel = (p: LabelPrefill) => {
    setPrefill(p);
    setMode("label");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Scan</h1>
        {me.data && !me.data.aiEnabled ? <Badge tone="orange">AI not configured</Badge> : null}
      </div>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "meal", label: <span className="inline-flex items-center gap-1.5"><ScanLine className="h-4 w-4" /> Meal</span> },
          { value: "label", label: <span className="inline-flex items-center gap-1.5"><Tag className="h-4 w-4" /> Label</span> },
          { value: "barcode", label: <span className="inline-flex items-center gap-1.5"><Barcode className="h-4 w-4" /> Barcode</span> },
        ]}
      />
      {!online && mode !== "barcode" ? (
        <Notice tone="warn"><WifiOff className="mr-1 inline h-3.5 w-3.5" /> You&apos;re offline. AI photo analysis needs internet — you can still search and log foods manually from the Food tab.</Notice>
      ) : null}
      {me.data ? (
        mode === "meal" ? <MealScanner date={me.data.today} initialMeal={meal} aiEnabled={me.data.aiEnabled} /> : mode === "label" ? <LabelScanner key={JSON.stringify(prefill)} date={me.data.today} aiEnabled={me.data.aiEnabled} prefill={prefill} /> : <BarcodeScanner date={me.data.today} aiEnabled={me.data.aiEnabled} onScanLabel={toLabel} />
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Meal photo                                                       */
/* ---------------------------------------------------------------- */

function ConfidenceRow({ label, value }: { label: string; value: number }) {
  const tone = value >= 0.75 ? "bg-lime" : value >= 0.5 ? "bg-yellow" : "bg-orange";
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted">
      <span className="w-20 shrink-0">{label}</span>
      <Bar value={value} color={tone} className="h-1.5" />
      <span className="w-8 text-right tabular">{Math.round(value * 100)}%</span>
    </div>
  );
}

const pickMacros = (m: Macros100 & { id: number; name: string; dataQuality?: string }) => ({ id: m.id, name: m.name, kcal100: m.kcal100, protein100: m.protein100, carbs100: m.carbs100 ?? null, fat100: m.fat100 ?? null, fibre100: m.fibre100 ?? null, estimated: m.dataQuality === "estimated" });

interface EditableItem extends ScanItem {
  grams: number;
  food: (Macros100 & { id: number; name: string; estimated?: boolean }) | null;
  removed?: boolean;
}

function MealScanner({ date, initialMeal, aiEnabled }: { date: string; initialMeal: string; aiEnabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [shots, setShots] = useState<Shot[]>([]);
  // Detailed by default: portion accuracy matters more than a few seconds of speed.
  const [detailed, setDetailed] = useState(true);
  const [plate, setPlate] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MealScanResult | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [meal, setMeal] = useState(initialMeal);
  const [picker, setPicker] = useState<{ index: number | null; query: string } | null>(null);
  const [logging, setLogging] = useState(false);

  async function analyse() {
    if (!shots.length) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      shots.forEach((s, i) => form.append("images", s.blob, `meal-${i}.jpg`));
      form.set("mode", detailed ? "detailed" : "quick");
      if (plate) form.set("plateDiameterCm", plate);
      if (reference) form.set("referenceObject", reference);
      if (note) form.set("note", note);
      const r = await api.upload<MealScanResult>("/scan/meal", form);
      setResult(r);
      setItems(r.items.map((it) => ({ ...it, grams: it.estimatedGrams, food: it.match ? pickMacros(it.match) : null })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const active = items.filter((i) => !i.removed);
  const part = (i: EditableItem, k: keyof Macros100) => ((i.food?.[k] ?? 0) * i.grams) / 100;
  const total = active.reduce((a, i) => ({ kcal: a.kcal + part(i, "kcal100"), protein: a.protein + part(i, "protein100"), carbs: a.carbs + part(i, "carbs100"), fat: a.fat + part(i, "fat100"), fibre: a.fibre + part(i, "fibre100") }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });

  async function logMeal() {
    const valid = active.filter((i) => i.food && i.grams > 0);
    if (!valid.length) return;
    setLogging(true);
    try {
      await api.post("/scan/log", { date, mealType: meal, scanId: result?.scanId ?? null, items: valid.map((i) => ({ foodId: i.food!.id, grams: i.grams, name: i.food!.name, confidence: Math.min(i.recognitionConfidence, i.quantityConfidence, i.nutritionConfidence) })) });
      toast(`Logged ${valid.length} items to ${MEAL_LABEL[meal]}`);
      invalidate("/diary", "/dashboard", "/insights", "/foods/recent");
      router.push("/food");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLogging(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        {!result.isFood ? (
          <Card className="flex gap-3 border-orange/30">
            <AlertTriangle className="h-5 w-5 shrink-0 text-orange" />
            <p className="text-sm">No food was detected in this photo. Try again with the plate clearly in frame, or add items manually.</p>
          </Card>
        ) : null}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {shots.map((s) => (
            <img key={s.url} src={s.url} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
          ))}
        </div>
        {result.plateNotes ? <p className="text-sm text-muted">{result.plateNotes}</p> : null}

        <div className="space-y-3">
          {items.map((it, idx) =>
            it.removed ? null : (
              <Card key={it.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold capitalize">{it.detectedName}</p>
                    {it.householdMeasure ? <p className="text-sm font-medium text-lime">≈ {it.householdMeasure} · {it.estimatedGrams} g</p> : null}
                    <p className="truncate text-xs text-muted">{it.food ? (it.food.estimated ? "AI estimate — no close database match (tap an option below to swap)" : `Matched: ${it.food.name}`) : "No database match — choose a food"}{it.cookingStyle && it.cookingStyle !== "unknown" ? ` · ${it.cookingStyle}` : ""}</p>
                  </div>
                  <button onClick={() => setItems(items.map((x, i) => (i === idx ? { ...x, removed: true } : x)))} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted hover:text-red" aria-label={`Remove ${it.detectedName}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                  <Field label="Grams" hint={`AI range ${it.gramsLow}–${it.gramsHigh} g`}>
                    <NumberInput suffix="g" value={it.grams} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, grams: Number(e.target.value) } : x)))} />
                  </Field>
                  <div className="pb-6 text-right">
                    <p className="font-display text-xl font-bold tabular">{it.food ? fmt.int(((it.food.kcal100 ?? 0) * it.grams) / 100) : "—"}</p>
                    <p className="text-[11px] text-muted">kcal · {it.food ? fmt.dec(part(it, "protein100")) : "—"} g P</p>
                    {it.food?.carbs100 != null ? <p className="text-[11px] text-faint">C {fmt.dec(part(it, "carbs100"))} · F {fmt.dec(part(it, "fat100"))} · Fib {fmt.dec(part(it, "fibre100"))}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {it.pieceGrams ? (
                    <>
                      <Chip onClick={() => setItems(items.map((x, i) => (i === idx ? { ...x, grams: Math.max(it.pieceGrams!, x.grams - it.pieceGrams!) } : x)))}>− 1 piece</Chip>
                      <Chip onClick={() => setItems(items.map((x, i) => (i === idx ? { ...x, grams: x.grams + it.pieceGrams! } : x)))}>+ 1 piece (~{it.pieceGrams} g)</Chip>
                    </>
                  ) : null}
                  {[0.75, 1.25, 1.5].map((f) => (
                    <Chip key={f} onClick={() => setItems(items.map((x, i) => (i === idx ? { ...x, grams: Math.round(x.grams * f) } : x)))}>{f < 1 ? "Less" : f === 1.25 ? "More" : "Much more"}</Chip>
                  ))}
                  <Chip onClick={() => setPicker({ index: idx, query: it.detectedName })}><Search className="mr-1 inline h-3.5 w-3.5" />Replace food</Chip>
                </div>
                {it.alternatives.length ? (
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                    {it.alternatives.map((a) => (
                      <button key={a.id} onClick={() => setItems(items.map((x, i) => (i === idx ? { ...x, food: pickMacros(a) } : x)))} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs", it.food?.id === a.id ? "border-lime text-lime" : "border-line text-muted")}>
                        {a.name.length > 32 ? a.name.slice(0, 30) + "…" : a.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="space-y-1 rounded-2xl bg-surface-2 p-3">
                  <ConfidenceRow label="Recognition" value={it.recognitionConfidence} />
                  <ConfidenceRow label="Quantity" value={it.quantityConfidence} />
                  <ConfidenceRow label="Nutrition data" value={it.nutritionConfidence} />
                  {it.portionBasis ? <p className="pt-1 text-[11px] text-faint">Measured: {it.portionBasis}</p> : it.container ? <p className="pt-1 text-[11px] text-faint">Scale: {it.container}</p> : null}
                  {it.reasoning ? <p className="pt-1 text-[11px] text-faint">{it.reasoning}</p> : null}
                </div>
              </Card>
            ),
          )}
        </div>

        <Button variant="secondary" className="w-full" onClick={() => setPicker({ index: null, query: "" })}>
          <Plus className="h-4 w-4" /> Add a missing item
        </Button>

        {result.questions.length ? (
          <Card>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-lime" /> Worth checking</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {result.questions.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </Card>
        ) : null}
        <Notice tone="warn">{result.disclaimer}</Notice>

        <div className="sticky bottom-24 z-10 space-y-3 rounded-3xl border border-line bg-surface/95 p-4 backdrop-blur lg:bottom-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-2xl font-bold tabular">{fmt.int(total.kcal)} kcal</p>
              <p className="text-xs text-muted">P {fmt.dec(total.protein)} g · C {fmt.dec(total.carbs)} g · F {fmt.dec(total.fat)} g · Fibre {fmt.dec(total.fibre)} g · {active.length} items</p>
            </div>
            <Select value={meal} onChange={(e) => setMeal(e.target.value)} className="w-40" aria-label="Meal">
              {Object.entries(MEAL_LABEL).filter(([k]) => k !== "custom").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button variant="secondary" onClick={() => { setResult(null); setItems([]); setShots([]); }} aria-label="Scan again"><RefreshCcw className="h-4 w-4" /></Button>
            <Button onClick={logMeal} loading={logging} disabled={!active.some((i) => i.food && i.grams > 0)}>
              <Check className="h-4 w-4" /> Log to {MEAL_LABEL[meal]}
            </Button>
          </div>
        </div>

        <FoodPicker
          open={picker !== null}
          onOpenChange={(o) => !o && setPicker(null)}
          initialQuery={picker?.query ?? ""}
          title={picker?.index == null ? "Add missing item" : "Replace food"}
          onPick={(f: FoodHit) => {
            const food = { id: f.id, name: f.name, kcal100: f.kcal, protein100: f.proteinG, carbs100: f.carbsG ?? null, fat100: f.fatG ?? null, fibre100: f.fibreG ?? null };
            if (picker?.index == null) {
              setItems([...items, { id: -Date.now(), detectedName: f.name, cookingStyle: "", estimatedGrams: f.defaultServing?.grams ?? 100, gramsLow: 0, gramsHigh: 0, recognitionConfidence: 1, quantityConfidence: 0.6, nutritionConfidence: 0.9, reasoning: "Added manually", match: null, alternatives: [], grams: f.defaultServing?.grams ?? 100, food }]);
            } else setItems(items.map((x, i) => (i === picker.index ? { ...x, food, nutritionConfidence: 0.9 } : x)));
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CameraCapture shots={shots} setShots={setShots} max={3} overlay="plate" />
      <details className="rounded-2xl border border-line bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold">Improve accuracy (optional)</summary>
        <div className="mt-3 space-y-3">
          <Segmented size="sm" value={detailed ? "detailed" : "quick"} onChange={(v) => setDetailed(v === "detailed")} options={[{ value: "quick", label: "Quick scan" }, { value: "detailed", label: "Detailed scan" }]} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plate size">
              <Select value={plate} onChange={(e) => setPlate(e.target.value)}>
                <option value="">Unknown</option>
                <option value="20">Quarter plate (~20 cm)</option>
                <option value="25">Dinner plate (~25 cm)</option>
                <option value="28">Large plate (~28 cm)</option>
                <option value="30">Thali (~30 cm)</option>
              </Select>
            </Field>
            <Field label="Reference in photo">
              <Select value={reference} onChange={(e) => setReference(e.target.value)}>
                <option value="">None</option>
                <option value="credit/debit card (8.56 × 5.4 cm)">Card</option>
                <option value="₹10 coin (2.7 cm)">₹10 coin</option>
                <option value="adult hand">Hand</option>
                <option value="tablespoon">Tablespoon</option>
              </Select>
            </Field>
          </div>
          <Field label="Note for the AI">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. made with 1 tsp ghee, no sugar in chai" maxLength={300} />
          </Field>
          <p className="text-xs text-muted">Tip: add a second photo from the side so bowl depth is visible.</p>
        </div>
      </details>
      {error ? <Notice tone="warn">{error}</Notice> : null}
      {!aiEnabled ? <Notice tone="warn">AI recognition isn&apos;t configured on this server. You can still <Link href="/food?add=1" className="font-semibold underline">search and log manually</Link>.</Notice> : null}
      <Button size="lg" className="w-full" disabled={!shots.length || loading || !aiEnabled} onClick={analyse}>
        {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Analysing your meal…</> : <><Sparkles className="h-5 w-5" /> Analyse {shots.length > 1 ? `${shots.length} photos` : "photo"}</>}
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Label OCR                                                        */
/* ---------------------------------------------------------------- */

interface LabelResult {
  scanId: number;
  isLabel: boolean;
  productName: string | null;
  brand: string | null;
  barcode: string | null;
  servingSizeG: number | null;
  servingLabel: string | null;
  isLiquid: boolean;
  per100: Record<string, number | null>;
  basis: string;
  ingredientsText: string | null;
  allergens: string[];
  unreadableFields: string[];
  readConfidence: number;
  validation: string[];
  indicators: { warnings: { key: string; level: string; text: string }[]; allergens: { declared: string[]; detectedInIngredients: string[] }; note: string };
}

const LABEL_FIELDS: [string, string, string][] = [
  ["kcal", "Energy", "kcal"],
  ["proteinG", "Protein", "g"],
  ["carbsG", "Carbohydrate", "g"],
  ["sugarG", "Total sugars", "g"],
  ["addedSugarG", "Added sugars", "g"],
  ["fatG", "Total fat", "g"],
  ["satFatG", "Saturated fat", "g"],
  ["transFatG", "Trans fat", "g"],
  ["fibreG", "Fibre", "g"],
  ["sodiumMg", "Sodium", "mg"],
];

interface LabelPrefill {
  manual?: boolean;
  barcode?: string;
  name?: string;
  brand?: string;
}

const MANUAL_LABEL: LabelResult = { scanId: 0, isLabel: true, productName: null, brand: null, barcode: null, servingSizeG: null, servingLabel: null, isLiquid: false, per100: {}, basis: "per_100", ingredientsText: null, allergens: [], unreadableFields: [], readConfidence: 1, validation: [], indicators: { warnings: [], allergens: { declared: [], detectedInIngredients: [] }, note: "" } };

function LabelScanner({ date, aiEnabled, prefill = {} }: { date: string; aiEnabled: boolean; prefill?: LabelPrefill }) {
  const toast = useToast();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<LabelResult | null>(prefill.manual ? MANUAL_LABEL : null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState({ name: prefill.name ?? "", brand: prefill.brand ?? "", barcode: prefill.barcode ?? "", servingSizeG: "", servingLabel: "", ingredients: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ foodId: number; name: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function read() {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      shots.forEach((s, i) => form.append("images", s.blob, `label-${i}.jpg`));
      const r = await api.upload<LabelResult>("/scan/label", form);
      setLabel(r);
      setVals(Object.fromEntries(LABEL_FIELDS.map(([k]) => [k, r.per100[k] == null ? "" : String(r.per100[k])])));
      setMeta({ name: r.productName || meta.name, brand: r.brand || meta.brand, barcode: r.barcode || meta.barcode, servingSizeG: r.servingSizeG ? String(r.servingSizeG) : "", servingLabel: r.servingLabel ?? "", ingredients: r.ingredientsText ?? "" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function manual() {
    setLabel(MANUAL_LABEL);
    setVals({});
  }

  async function save() {
    setSaving(true);
    try {
      const num = (k: string) => (vals[k] === "" || vals[k] == null ? null : Number(vals[k]));
      const r = await api.post<{ food: { id: number; name: string } }>("/products", {
        name: meta.name || "Packaged product",
        brand: meta.brand || null,
        barcode: /^\d{8,14}$/.test(meta.barcode) ? meta.barcode : null,
        servingSizeG: meta.servingSizeG ? Number(meta.servingSizeG) : null,
        servingLabel: meta.servingLabel || null,
        isLiquid: label?.isLiquid ?? false,
        per100: { kcal: num("kcal") ?? 0, proteinG: num("proteinG"), carbsG: num("carbsG"), fatG: num("fatG"), fibreG: num("fibreG"), sugarG: num("sugarG"), satFatG: num("satFatG"), sodiumMg: num("sodiumMg") },
        addedSugarG: num("addedSugarG"),
        transFatG: num("transFatG"),
        ingredientsText: meta.ingredients || null,
        allergens: label?.allergens ?? [],
        scanId: label?.scanId || null,
        userConfirmed: confirmed,
      });
      setSaved({ foodId: r.food.id, name: r.food.name });
      toast("Product saved to your foods");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (label) {
    return (
      <div className="space-y-4">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">Nutrition label</p>
            <Badge tone={confirmed ? "purple" : "orange"}>{confirmed ? "User-checked" : label.scanId ? "OCR estimate — check values" : "Manual entry"}</Badge>
          </div>
          {label.scanId && !label.isLabel ? <Notice tone="warn">No readable nutrition table was found. Enter values manually or retake the photo.</Notice> : null}
          {label.unreadableFields.length ? <Notice tone="warn">Couldn&apos;t read: {label.unreadableFields.join(", ")}. Please fill these in.</Notice> : null}
          {label.basis === "per_serving_converted" ? <Notice>Only per-serving values were printed; converted to per 100 {label.isLiquid ? "ml" : "g"} using the serving size.</Notice> : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Product name"><Input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} /></Field>
            <Field label="Brand"><Input value={meta.brand} onChange={(e) => setMeta({ ...meta, brand: e.target.value })} /></Field>
            <Field label={`Serving (${label.isLiquid ? "ml" : "g"})`}><NumberInput value={meta.servingSizeG} onChange={(e) => setMeta({ ...meta, servingSizeG: e.target.value })} /></Field>
            <Field label="Barcode"><Input inputMode="numeric" value={meta.barcode} onChange={(e) => setMeta({ ...meta, barcode: e.target.value.replace(/\D/g, "") })} /></Field>
          </div>
          <p className="pt-1 text-sm font-semibold">Per 100 {label.isLiquid ? "ml" : "g"}</p>
          <div className="divide-y divide-line rounded-2xl border border-line">
            {LABEL_FIELDS.map(([k, l, unit]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <span className={cn("text-sm", ["sugarG", "addedSugarG", "satFatG", "transFatG"].includes(k) && "pl-3 text-muted")}>{l}</span>
                <div className="w-32"><NumberInput suffix={unit} value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} className="h-10" aria-label={l} /></div>
              </div>
            ))}
          </div>
          <Field label="Ingredients"><textarea value={meta.ingredients} onChange={(e) => setMeta({ ...meta, ingredients: e.target.value })} className="min-h-20 w-full rounded-2xl border border-line bg-surface-2 p-3 text-sm" /></Field>
        </Card>
        {label.indicators.warnings.length || label.allergens.length || label.indicators.allergens.detectedInIngredients.length ? (
          <Card className="space-y-2">
            {label.indicators.warnings.map((w) => (
              <p key={w.key} className={cn("flex items-center gap-2 text-sm", w.level === "high" ? "text-orange" : "text-muted")}><AlertTriangle className="h-4 w-4" /> {w.text}</p>
            ))}
            {label.allergens.length ? <p className="text-sm"><span className="font-semibold">Declared allergens:</span> {label.allergens.join(", ")}</p> : null}
            {label.indicators.allergens.detectedInIngredients.length ? <p className="text-sm text-muted">Ingredient list mentions: {label.indicators.allergens.detectedInIngredients.join(", ")}</p> : null}
            <p className="text-[11px] text-faint">{label.indicators.note || "Indicators are informational, not a safety assessment."}</p>
          </Card>
        ) : null}
        <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-lime)]" />
          <span className="text-sm">I&apos;ve checked these values against the pack. <span className="text-muted">(Unchecked products stay marked as OCR estimates.)</span></span>
        </label>
        {saved ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { setLabel(null); setShots([]); setSaved(null); setConfirmed(false); }}>Scan another</Button>
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add to meal</Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" loading={saving} disabled={!vals.kcal} onClick={save}>Save product</Button>
        )}
        {saved ? <AddFoodSheet open={addOpen} onOpenChange={setAddOpen} date={date} defaultMeal={mealForHour()} preselected={{ id: saved.foodId, name: saved.name, kcal: null, proteinG: null }} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meta.barcode ? <Notice>Saving for barcode {meta.barcode}{meta.name ? ` · ${meta.name}` : ""} — next time the barcode scan finds it instantly.</Notice> : null}
      <CameraCapture shots={shots} setShots={setShots} max={3} overlay="label" />
      <p className="text-sm text-muted">Photograph the nutrition table (and optionally the ingredient list and front of pack — up to 3 photos).</p>
      {error ? <Notice tone="warn">{error}</Notice> : null}
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button variant="secondary" size="lg" onClick={manual}>Enter manually</Button>
        <Button size="lg" disabled={!shots.length || loading || !aiEnabled} onClick={read}>
          {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Reading label…</> : "Read label"}
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Barcode                                                          */
/* ---------------------------------------------------------------- */

interface BarcodeResult {
  found: boolean;
  barcode?: string | null;
  message?: string;
  offline?: boolean;
  source?: string;
  productName?: string | null;
  brand?: string | null;
  validation?: string[];
  product?: {
    foodId: number;
    name: string;
    brand: string | null;
    servingSizeG: number | null;
    servingLabel: string | null;
    verification: string;
    per100: Record<string, number | null>;
    indicators: { warnings: { key: string; level: string; text: string }[]; allergens: { declared: string[]; detectedInIngredients: string[] }; note: string };
    allergens: string[];
    ingredientsText: string | null;
    isLiquid: boolean;
  };
}

function BarcodeScanner({ date, aiEnabled, onScanLabel }: { date: string; aiEnabled: boolean; onScanLabel: (p: LabelPrefill) => void }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const run = useCallback(async (fn: () => Promise<BarcodeResult>) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fn();
      setResult(r);
      if (r.barcode) setCode(r.barcode);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setShots([]);
    }
  }, []);
  const lookup = useCallback((value: string) => run(() => api.get<BarcodeResult>(`/products/barcode/${value}`)), [run]);

  // A photo of the barcode (any browser): the AI reads the digits printed under the bars.
  const onShots = (next: Shot[]) => {
    setShots(next);
    if (!next[0]) return;
    if (!aiEnabled) {
      setError("Reading a barcode photo needs AI. Type the number printed under the barcode instead.");
      return;
    }
    const form = new FormData();
    form.append("images", next[0].blob, "barcode.jpg");
    run(() => api.upload<BarcodeResult>("/scan/barcode", form));
  };

  const p = result?.product;
  const prefill = { barcode: result?.barcode ?? (code || undefined), name: result?.productName ?? undefined, brand: result?.brand ?? undefined };
  return (
    <div className="space-y-4">
      {!result ? <CameraCapture shots={shots} setShots={onShots} max={1} overlay="barcode" onBarcode={lookup} /> : null}
      {loading ? <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Looking up the product…</p> : null}
      <form onSubmit={(e) => { e.preventDefault(); if (/^\d{8,14}$/.test(code)) lookup(code); }} className="flex gap-2">
        <Input inputMode="numeric" placeholder="Or type the number under the barcode" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label="Barcode number" />
        <Button type="submit" loading={loading} disabled={!/^\d{8,14}$/.test(code)}>Look up</Button>
      </form>
      {error ? <Notice tone="warn">{error}</Notice> : null}
      {result && !result.found ? (
        <Card className="space-y-3">
          <p className="text-sm">{result.message}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => onScanLabel({ ...prefill, manual: true })}>Enter manually</Button>
            <Button onClick={() => onScanLabel(prefill)}><Tag className="h-4 w-4" /> Scan label</Button>
          </div>
          <button onClick={() => setResult(null)} className="w-full text-center text-sm text-muted underline-offset-2 hover:underline">Try another barcode</button>
        </Card>
      ) : null}
      {p ? (
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-muted">{p.brand ?? ""} {p.servingLabel ? `· ${p.servingLabel}` : ""}</p>
            </div>
            <Badge tone={p.verification === "crowdsourced" ? "blue" : p.verification === "user_confirmed" ? "purple" : "orange"}>
              {p.verification === "crowdsourced" ? "Open Food Facts" : p.verification === "user_confirmed" ? "User-checked" : "OCR estimate"}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {([["kcal", "kcal"], ["proteinG", "Protein"], ["carbsG", "Carbs"], ["fatG", "Fat"]] as const).map(([k, l]) => (
              <div key={k} className="rounded-2xl bg-surface-2 p-2">
                <p className="font-semibold tabular">{p.per100[k] == null ? "—" : fmt.dec(p.per100[k] as number)}</p>
                <p className="text-[11px] text-faint">{l}/100{p.isLiquid ? "ml" : "g"}</p>
              </div>
            ))}
          </div>
          {p.indicators.warnings.map((w) => (
            <p key={w.key} className={cn("flex items-center gap-2 text-sm", w.level === "high" ? "text-orange" : "text-muted")}><AlertTriangle className="h-4 w-4" /> {w.text}</p>
          ))}
          {result?.validation?.map((v) => <p key={v} className="text-xs text-muted">{v}</p>)}
          {p.allergens.length ? <p className="text-sm"><span className="font-semibold">Allergens:</span> {p.allergens.join(", ")}</p> : null}
          {result?.source === "openfoodfacts" ? <p className="text-[11px] text-faint">Data from Open Food Facts contributors (ODbL). Check the pack if values look off.</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { setResult(null); setCode(""); }}>Scan another</Button>
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add to meal</Button>
          </div>
          <AddFoodSheet open={addOpen} onOpenChange={setAddOpen} date={date} defaultMeal={mealForHour()} preselected={{ id: p.foodId, name: p.name, kcal: p.per100.kcal ?? null, proteinG: p.per100.proteinG ?? null }} />
        </Card>
      ) : null}
    </div>
  );
}
