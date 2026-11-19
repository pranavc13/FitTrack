"use client";

import { AlertTriangle, ArrowLeft, Loader2, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FoodPicker } from "@/components/food/food-picker";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, NumberInput, Select, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, invalidate, useApi } from "@/lib/client/api";
import { cn, fmt } from "@/lib/utils";

interface Row {
  key: string;
  foodId: number | null;
  foodName: string | null;
  name: string;
  grams: number;
  role: "main" | "fat" | "sugar" | "water" | "spice";
  isEstimated?: boolean;
  assumption?: string | null;
  stated?: string | null;
  candidates?: { id: number; name: string; kcal100: number | null }[];
}
interface Preview {
  rawWeightG: number;
  cookedWeightG: number;
  servingWeightG: number;
  total: Record<string, number>;
  perServing: Record<string, number>;
  addedFatKcal: number;
  coverage: number;
  unmatched: string[];
}

const newKey = () => Math.random().toString(36).slice(2);

export default function NewRecipePage() {
  return (
    <Suspense>
      <Builder />
    </Suspense>
  );
}

function Builder() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const fromId = params.get("from");
  const [aiOpen, setAiOpen] = useState(params.get("ai") === "1");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [servings, setServings] = useState("2");
  const [servingLabel, setServingLabel] = useState("serving");
  const [cooked, setCooked] = useState("");
  const [method, setMethod] = useState("");
  const [instructions, setInstructions] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [picker, setPicker] = useState<{ key: string | null; query: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [saving, setSaving] = useState(false);
  const me = useApi<{ aiEnabled: boolean }>("/auth/me");

  // Edit mode: load an existing (own) recipe.
  const existing = useApi<{ recipe: { name: string; servings: number; servingLabel: string; cookedWeightG: number | null; cookingMethod: string | null; instructions: string[]; ownerUserId: string | null }; ingredients: { foodId: number | null; foodName: string | null; name: string; grams: number; role: Row["role"]; isEstimated: boolean }[] }>(fromId ? `/recipes/${fromId}` : null);
  useEffect(() => {
    const d = existing.data;
    if (!d) return;
    setName(d.recipe.name);
    setServings(String(d.recipe.servings));
    setServingLabel(d.recipe.servingLabel);
    setCooked(d.recipe.cookedWeightG ? String(d.recipe.cookedWeightG) : "");
    setMethod(d.recipe.cookingMethod ?? "");
    setInstructions(d.recipe.instructions.join("\n"));
    setRows(d.ingredients.map((i) => ({ key: newKey(), foodId: i.foodId, foodName: i.foodName, name: i.name, grams: i.grams, role: i.role, isEstimated: i.isEstimated })));
  }, [existing.data]);

  const payload = useMemo(
    () => ({
      name: name || "Untitled recipe",
      servings: Number(servings) || 1,
      servingLabel: servingLabel || "serving",
      cookedWeightG: Number(cooked) > 0 ? Number(cooked) : null,
      cookingMethod: method || null,
      instructions: instructions.split("\n").map((s) => s.trim()).filter(Boolean),
      ingredients: rows.filter((r) => r.grams > 0).map((r) => ({ foodId: r.foodId, name: r.name, grams: r.grams, role: r.role, isEstimated: Boolean(r.isEstimated || r.assumption) })),
    }),
    [name, servings, servingLabel, cooked, method, instructions, rows],
  );

  // Live preview (computed by the backend engine).
  useEffect(() => {
    if (!payload.ingredients.length) {
      setPreview(null);
      return;
    }
    const t = setTimeout(() => {
      api.post<Preview>("/recipes/preview", payload).then(setPreview).catch(() => setPreview(null));
    }, 400);
    return () => clearTimeout(t);
  }, [payload]);

  async function parse() {
    setParsing(true);
    try {
      const r = await api.post<{ dishName: string; servings: number; cookingMethod: string; questions: string[]; ingredients: (Omit<Row, "key">)[] }>("/recipes/parse", { text });
      setName(r.dishName);
      setServings(String(r.servings));
      setMethod(r.cookingMethod);
      setQuestions(r.questions);
      setRows(r.ingredients.map((i) => ({ ...i, key: newKey() })));
      setAiOpen(false);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setParsing(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = fromId && existing.data?.recipe.ownerUserId
        ? await api.put<{ recipe: { id: number } }>(`/recipes/${fromId}`, payload)
        : await api.post<{ recipe: { id: number } }>("/recipes", payload);
      toast(fromId ? "Saved as a new version" : "Recipe saved");
      invalidate("/recipes", "/foods");
      router.replace(`/food/recipes/${res.recipe.id}`);
    } catch (e) {
      const err = e as Error & { details?: unknown };
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const unmatched = rows.filter((r) => !r.foodId && r.role !== "water");
  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted"><ArrowLeft className="h-4 w-4" /> Back</button>
      <h1 className="font-display text-2xl font-bold">{fromId ? "Edit recipe" : "New recipe"}</h1>

      <Card className={cn("space-y-3", aiOpen && "border-lime/40")}>
        <CardHeader title="Describe it in your own words" subtitle="The AI extracts ingredients; the app's database computes nutrition" icon={<Sparkles className="h-5 w-5" />} action={!aiOpen ? <Button size="sm" variant="secondary" onClick={() => setAiOpen(true)}>Use AI</Button> : null} />
        {aiOpen ? (
          <>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="I made paneer bhurji using 150 g paneer, one onion, two tomatoes and one teaspoon oil. Served 2." maxLength={2000} />
            {me.data && !me.data.aiEnabled ? <Notice tone="warn">AI parsing isn&apos;t configured on this server — add ingredients below instead.</Notice> : null}
            <Button className="w-full" onClick={parse} disabled={text.trim().length < 5 || parsing || !me.data?.aiEnabled}>
              {parsing ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading recipe…</> : "Extract ingredients"}
            </Button>
          </>
        ) : null}
      </Card>

      {questions.length ? (
        <Card className="border-orange/30">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-orange"><AlertTriangle className="h-4 w-4" /> Please confirm</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{questions.map((q) => <li key={q}>{q}</li>)}</ul>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <Field label="Dish name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mom's rajma" maxLength={120} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Servings made"><NumberInput value={servings} onChange={(e) => setServings(e.target.value)} /></Field>
          <Field label="Serving name"><Input value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="katori, piece…" /></Field>
        </div>
        <Field label="Cooked weight (optional)" hint="Weigh the finished dish to account for water lost or absorbed. Leave blank to assume cooked = raw weight.">
          <NumberInput suffix="g" value={cooked} onChange={(e) => setCooked(e.target.value)} />
        </Field>
      </Card>

      <Card>
        <CardHeader title="Ingredients" subtitle="Raw weights" action={<Button size="sm" variant="secondary" onClick={() => setPicker({ key: null, query: "" })}><Plus className="h-4 w-4" /> Add</Button>} />
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key} className="rounded-2xl bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium capitalize">{r.name}</p>
                  {r.foodName ? <p className="truncate text-xs text-muted">↳ {r.foodName}</p> : r.role === "water" ? <p className="text-xs text-muted">Water (0 kcal)</p> : <p className="text-xs text-orange">Not matched — choose a food</p>}
                  {r.stated ? <p className="text-[11px] text-faint">You said: {r.stated}</p> : null}
                  {r.assumption ? <Badge tone="orange" className="mt-1">Assumed: {r.assumption}</Badge> : null}
                </div>
                <button onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:text-red" aria-label={`Remove ${r.name}`}><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                <NumberInput suffix="g" value={r.grams} onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, grams: Number(e.target.value), assumption: null } : x)))} aria-label={`${r.name} grams`} className="h-11" />
                <Select value={r.role} onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, role: e.target.value as Row["role"] } : x)))} className="h-11" aria-label="Role">
                  <option value="main">Ingredient</option>
                  <option value="fat">Oil / ghee / butter</option>
                  <option value="sugar">Sugar / sweetener</option>
                  <option value="spice">Spice</option>
                  <option value="water">Water</option>
                </Select>
                <button onClick={() => setPicker({ key: r.key, query: r.name.replace(/\(.*?\)/g, "") })} className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-3 text-muted" aria-label={`Match ${r.name}`}><Search className="h-4 w-4" /></button>
              </div>
              {r.candidates && r.candidates.length > 0 ? (
                <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
                  {r.candidates.slice(0, 4).map((c) => (
                    <button key={c.id} onClick={() => setRows(rows.map((x) => (x.key === r.key ? { ...x, foodId: c.id, foodName: c.name } : x)))} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px]", r.foodId === c.id ? "border-lime text-lime" : "border-line text-muted")}>
                      {c.name.length > 30 ? c.name.slice(0, 28) + "…" : c.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
          {!rows.length ? <p className="text-sm text-muted">Add ingredients, or describe the dish above.</p> : null}
        </ul>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setRows([...rows, { key: newKey(), foodId: null, foodName: null, name: "water", grams: 200, role: "water" }])}>+ Add water</Button>
      </Card>

      <Card className="space-y-3">
        <Field label="Cooking method"><Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="pressure-cooked, sautéed…" /></Field>
        <Field label="Steps (one per line)"><Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} /></Field>
      </Card>

      {preview ? (
        <Card className="sticky bottom-24 z-10 border-lime/30 bg-surface/95 backdrop-blur lg:bottom-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Per serving (≈{fmt.int(preview.servingWeightG)} g)</p>
              <p className="font-display text-2xl font-bold tabular">{fmt.int(preview.perServing.kcal)} kcal</p>
              <p className="text-xs text-muted tabular">P {fmt.dec(preview.perServing.proteinG)} · C {fmt.dec(preview.perServing.carbsG)} · F {fmt.dec(preview.perServing.fatG)} · Fibre {fmt.dec(preview.perServing.fibreG)} g</p>
              {preview.addedFatKcal ? <p className="text-[11px] text-orange">{fmt.int(preview.addedFatKcal / (Number(servings) || 1))} kcal/serving from added fat</p> : null}
            </div>
            <Button onClick={save} loading={saving} disabled={!name.trim() || unmatched.length > rows.length / 2}>Save</Button>
          </div>
          {unmatched.length ? <p className="mt-2 text-xs text-orange">{unmatched.length} ingredient(s) unmatched — they&apos;re excluded from the totals.</p> : null}
        </Card>
      ) : null}

      <FoodPicker
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        initialQuery={picker?.query ?? ""}
        title={picker?.key ? "Match ingredient" : "Add ingredient"}
        onPick={(f) => {
          if (picker?.key) setRows(rows.map((x) => (x.key === picker.key ? { ...x, foodId: f.id, foodName: f.name } : x)));
          else setRows([...rows, { key: newKey(), foodId: f.id, foodName: f.name, name: f.name.split(",")[0]!.toLowerCase(), grams: 100, role: /^oil|ghee|butter/i.test(f.name) ? "fat" : /^sugars?/i.test(f.name) ? "sugar" : "main" }]);
        }}
      />
    </div>
  );
}
