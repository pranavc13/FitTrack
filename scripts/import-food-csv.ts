/**
 * Generic food-composition CSV importer — use it for datasets that can't be redistributed with the app
 * (e.g. ICMR-NIN Indian Food Composition Tables 2017, which you must obtain under its own licence) or for
 * your own lab/label data.
 *
 * Usage:
 *   npm run db:import:csv -- --file=path/to/foods.csv --source=ifct_2017 \
 *     --source-name="ICMR-NIN Indian Food Composition Tables 2017" --license="Licensed copy — not redistributable" [--dry-run]
 *
 * Expected columns (header names are case-insensitive; per 100 g edible portion):
 *   source_ref (unique code, e.g. IFCT "A001"), name, [name_hi], [category], [state: raw|cooked|prepared],
 *   kcal OR energy_kj, protein_g, carbs_g, fat_g, [fibre_g], [sugar_g], [sat_fat_g], [sodium_mg],
 *   [potassium_mg], [calcium_mg], [iron_mg], [synonyms: "a;b;c"]
 * Blank cells stay NULL (never zero). Rows failing validation are reported and skipped.
 */
import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { eq } from "drizzle-orm";
import * as s from "../src/db/schema";
import { emptyNutrients, validatePer100g } from "../src/lib/nutrition/engine";
import { closeDb, normalizeName, openDb, upsertSource, writeFoods, type ImportStats, type NormalizedFood } from "./lib/ingest";

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
  const [k, ...v] = a.slice(2).split("=");
  return [k, v.join("=") || "true"];
}));
if (!args.file || !args.source) {
  console.error("Required: --file=<csv> --source=<code>   (see header comment for columns)");
  process.exit(1);
}

const rows = parse(fs.readFileSync(args.file, "utf8"), { columns: (h: string[]) => h.map((x) => x.trim().toLowerCase()), skip_empty_lines: true, bom: true, trim: true }) as Record<string, string>[];
const num = (v: string | undefined) => (v == null || v === "" || v === "-" ? null : Number(v.replace(/,/g, "")));
const foods: NormalizedFood[] = [];
const rejected: string[] = [];
const synonyms = new Map<string, string[]>();

rows.forEach((r, i) => {
  const ref = r.source_ref || r.code;
  if (!ref || !r.name) return rejected.push(`row ${i + 2}: missing source_ref or name`);
  const core = emptyNutrients();
  const kj = num(r.energy_kj);
  core.kcal = num(r.kcal) ?? (kj != null ? Math.round((kj / 4.184) * 10) / 10 : null);
  core.proteinG = num(r.protein_g);
  core.carbsG = num(r.carbs_g);
  core.fatG = num(r.fat_g);
  core.fibreG = num(r.fibre_g);
  core.sugarG = num(r.sugar_g);
  core.satFatG = num(r.sat_fat_g);
  core.sodiumMg = num(r.sodium_mg);
  core.potassiumMg = num(r.potassium_mg);
  core.calciumMg = num(r.calcium_mg);
  core.ironMg = num(r.iron_mg);
  if (Object.values(core).some((v) => v != null && Number.isNaN(v))) return rejected.push(`row ${i + 2} (${ref}): non-numeric value`);
  if (core.kcal == null) return rejected.push(`row ${i + 2} (${ref}): no energy value`);
  const problems = validatePer100g(core);
  if (problems.length) return rejected.push(`row ${i + 2} (${ref}): ${problems.join("; ")}`);
  const state = (["raw", "cooked", "prepared"].includes(r.state ?? "") ? r.state : "not_applicable") as NormalizedFood["state"];
  foods.push({ sourceRef: ref, name: r.name, category: r.category || "Imported foods", foodType: "ingredient", state, core, extra: [], portions: [] });
  const syn = [r.name_hi, ...(r.synonyms ?? "").split(";")].map((x) => x?.trim()).filter(Boolean) as string[];
  if (syn.length) synonyms.set(ref, syn);
});

console.log(`Parsed ${rows.length} rows: ${foods.length} valid, ${rejected.length} rejected`);
rejected.slice(0, 20).forEach((r) => console.log("  ✗", r));
if (args["dry-run"]) process.exit(0);

const db = await openDb();
try {
  const sourceId = await upsertSource(db, { code: args.source, name: args["source-name"] ?? args.source, license: args.license ?? "See dataset licence", version: args.version ?? null });
  const stats: ImportStats = { read: rows.length, inserted: 0, updated: 0, skippedDuplicates: 0, flagged: 0, nutrientRows: 0, portionRows: 0 };
  await writeFoods(db, sourceId, foods, Number(args.confidence ?? 0.95), stats);
  // Synonyms + search text.
  for (const [ref, names] of synonyms) {
    const [food] = await db.select().from(s.foods).where(eq(s.foods.sourceRef, ref));
    if (!food || food.sourceId !== sourceId) continue;
    await db.insert(s.foodSynonyms).values(names.map((n) => ({ foodId: food.id, name: n, language: /[ऀ-ॿ]/.test(n) ? "hi" : "en", kind: "alias" }))).onConflictDoNothing();
    await db.update(s.foods).set({ searchText: normalizeName([food.name, ...names].join(" ")), nameHi: names.find((n) => /[ऀ-ॿ]/.test(n)) ?? null }).where(eq(s.foods.id, food.id));
  }
  await db.insert(s.foodImportJobs).values({ sourceId, status: "completed", stats: { ...stats, rejected: rejected.length }, finishedAt: new Date() });
  console.log("✓ imported", stats);
} finally {
  await closeDb(db);
}
