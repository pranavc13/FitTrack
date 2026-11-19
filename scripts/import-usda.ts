/**
 * Imports USDA FoodData Central (public domain, CC0) into the food catalogue:
 *   - SR Legacy (2018-04): ~7,800 foundational ingredient/food records
 *   - FNDDS survey foods (2021–2023 release, 2024-10-31): ~5,400 foods "as eaten", incl. mixed dishes
 * Usage: npm run db:import:usda [-- --only=sr|fndds]
 * Downloads are cached in data/raw/. Re-running applies dataset updates in place (upsert by fdc_id).
 */
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse";
import { eq } from "drizzle-orm";
import * as s from "../src/db/schema";
import { emptyNutrients, type NutrientKey } from "../src/lib/nutrition/engine";
import { closeDb, inferState, normalizeName, openDb, upsertSource, writeFoods, type ImportStats, type NormalizedFood } from "./lib/ingest";

const RAW = path.join(process.cwd(), "data", "raw");

const DATASETS = {
  sr: {
    code: "usda_sr_legacy",
    name: "USDA FoodData Central — SR Legacy",
    version: "2018-04",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip",
    dir: "FoodData_Central_sr_legacy_food_csv_2018-04",
    confidence: 0.95,
  },
  fndds: {
    code: "usda_fndds",
    name: "USDA FoodData Central — FNDDS (survey foods)",
    version: "2024-10-31",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_csv_2024-10-31.zip",
    dir: "FoodData_Central_survey_food_csv_2024-10-31",
    confidence: 0.9,
  },
} as const;

/** USDA nutrient id → core column. */
const CORE: Record<string, NutrientKey> = {
  "1008": "kcal",
  "1003": "proteinG",
  "1005": "carbsG",
  "1004": "fatG",
  "1079": "fibreG",
  "2000": "sugarG",
  "1258": "satFatG",
  "1093": "sodiumMg",
  "1092": "potassiumMg",
  "1087": "calciumMg",
  "1089": "ironMg",
};
/** Extended micronutrients kept in food_nutrients. */
const EXTRA: Record<string, { code: string; unit: string }> = {
  "1051": { code: "water_g", unit: "g" },
  "1090": { code: "magnesium_mg", unit: "mg" },
  "1091": { code: "phosphorus_mg", unit: "mg" },
  "1095": { code: "zinc_mg", unit: "mg" },
  "1106": { code: "vitamin_a_rae_ug", unit: "µg" },
  "1109": { code: "vitamin_e_mg", unit: "mg" },
  "1114": { code: "vitamin_d_ug", unit: "µg" },
  "1162": { code: "vitamin_c_mg", unit: "mg" },
  "1175": { code: "vitamin_b6_mg", unit: "mg" },
  "1177": { code: "folate_ug", unit: "µg" },
  "1178": { code: "vitamin_b12_ug", unit: "µg" },
  "1185": { code: "vitamin_k_ug", unit: "µg" },
  "1235": { code: "added_sugar_g", unit: "g" },
  "1253": { code: "cholesterol_mg", unit: "mg" },
  "1257": { code: "trans_fat_g", unit: "g" },
};

async function ensureDataset(key: keyof typeof DATASETS): Promise<string> {
  const ds = DATASETS[key];
  const dir = path.join(RAW, ds.dir);
  if (fs.existsSync(path.join(dir, "food.csv"))) return dir;
  fs.mkdirSync(RAW, { recursive: true });
  const zipPath = path.join(RAW, `${key}.zip`);
  if (!fs.existsSync(zipPath)) {
    console.log(`↓ downloading ${ds.url}`);
    const res = await fetch(ds.url, { headers: { "User-Agent": "FitTrackAI-ingest/1.0" } });
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  }
  console.log(`⇢ extracting ${zipPath}`);
  new AdmZip(zipPath).extractAllTo(RAW, true);
  return dir;
}

async function readCsv(file: string, onRow: (r: Record<string, string>) => void) {
  const parser = fs.createReadStream(file).pipe(parse({ columns: true, bom: true, relax_quotes: true }));
  for await (const r of parser) onRow(r as Record<string, string>);
}

async function loadDataset(key: keyof typeof DATASETS): Promise<NormalizedFood[]> {
  const dir = await ensureDataset(key);
  const isFndds = key === "fndds";

  const categories = new Map<string, string>();
  if (isFndds) {
    await readCsv(path.join(dir, "wweia_food_category.csv"), (r) => categories.set(r.wweia_food_category!, r.wweia_food_category_description!));
  } else {
    await readCsv(path.join(dir, "food_category.csv"), (r) => categories.set(r.id!, r.description!));
  }
  const fnddsCategory = new Map<string, string>();
  if (isFndds) await readCsv(path.join(dir, "survey_fndds_food.csv"), (r) => fnddsCategory.set(r.fdc_id!, r.wweia_category_number!));

  const units = new Map<string, string>();
  await readCsv(path.join(dir, "measure_unit.csv"), (r) => units.set(r.id!, r.name!));

  const foods = new Map<string, NormalizedFood>();
  const wantedType = isFndds ? "survey_fndds_food" : "sr_legacy_food";
  await readCsv(path.join(dir, "food.csv"), (r) => {
    if (r.data_type !== wantedType) return;
    const catKey = isFndds ? fnddsCategory.get(r.fdc_id!) : r.food_category_id;
    const category = (catKey && categories.get(catKey)) || "Uncategorized";
    const lc = category.toLowerCase();
    const foodType = /beverage|juice|coffee|tea|soft drink|water|drink|alcohol|beer|wine|liquor/.test(lc)
      ? "beverage"
      : /restaurant/.test(lc)
        ? "restaurant"
        : isFndds || /meals|entree|fast food|soup/.test(lc)
          ? "dish"
          : "ingredient";
    foods.set(r.fdc_id!, {
      sourceRef: r.fdc_id!,
      name: r.description!.trim(),
      category,
      foodType,
      state: inferState(r.description!, isFndds),
      core: emptyNutrients(),
      extra: [],
      portions: [],
    });
  });

  // FNDDS stores the legacy nutrient *number* (e.g. 208 = energy) in food_nutrient.nutrient_id;
  // SR Legacy stores the FDC nutrient id (1008). Normalise both to the FDC id.
  const nbrToId = new Map<string, string>();
  await readCsv(path.join(dir, "nutrient.csv"), (r) => {
    const nbr = String(Number(r.nutrient_nbr));
    if (r.nutrient_nbr && !nbrToId.has(nbr)) nbrToId.set(nbr, r.id!);
  });
  const kj = new Map<string, number>();
  await readCsv(path.join(dir, "food_nutrient.csv"), (r) => {
    const food = foods.get(r.fdc_id!);
    if (!food) return;
    const amount = Number(r.amount);
    if (!Number.isFinite(amount)) return;
    const nid = Number(r.nutrient_id) < 1000 ? (nbrToId.get(String(Number(r.nutrient_id))) ?? r.nutrient_id!) : r.nutrient_id!;
    const core = CORE[nid];
    if (core) food.core[core] = amount;
    else if (nid === "1062") kj.set(r.fdc_id!, amount);
    else {
      const extra = EXTRA[nid];
      if (extra) food.extra.push({ code: extra.code, amount, unit: extra.unit });
    }
  });
  // A few SR records report energy only in kJ: convert (1 kcal = 4.184 kJ) rather than leave it empty.
  for (const [id, v] of kj) {
    const f = foods.get(id);
    if (f && f.core.kcal == null) f.core.kcal = Math.round((v / 4.184) * 10) / 10;
  }

  await readCsv(path.join(dir, "food_portion.csv"), (r) => {
    const food = foods.get(r.fdc_id!);
    const grams = Number(r.gram_weight);
    if (!food || !(grams > 0)) return;
    let label: string;
    let unit: string;
    let amount = Number(r.amount) || 1;
    if (isFndds) {
      label = r.portion_description!.trim();
      if (!label || /not specified/i.test(label)) return;
      const m = /^([\d./]+)\s+(.*)$/.exec(label);
      amount = m ? Number(eval_fraction(m[1]!)) || 1 : 1;
      unit = unitFromText(m ? m[2]! : label);
    } else {
      const unitName = units.get(r.measure_unit_id!) ?? "";
      const modifier = (r.modifier ?? "").trim();
      const u = unitName === "undetermined" ? "" : unitName;
      label = `${amount} ${[u, modifier].filter(Boolean).join(", ")}`.trim();
      unit = unitFromText(u || modifier);
    }
    food.portions.push({ label, unit, amount, grams });
  });

  return [...foods.values()];
}

function eval_fraction(s: string): number {
  if (s.includes("/")) {
    const [a, b] = s.split("/").map(Number);
    return a! / b!;
  }
  return Number(s);
}

function unitFromText(t: string): string {
  const s = t.toLowerCase();
  const map: [RegExp, string][] = [
    [/\bcups?\b/, "cup"], [/tablespoon|tbsp/, "tbsp"], [/teaspoon|tsp/, "tsp"], [/\bslices?\b/, "slice"],
    [/fl oz/, "fl oz"], [/\boz\b/, "oz"], [/\bml\b|milliliter/, "ml"], [/\bbowl/, "bowl"], [/\bglass/, "glass"],
    [/\b(piece|medium|large|small|whole|item|each|fruit|egg|roll|bar|patty|cookie|biscuit|muffin|tortilla|sandwich|burger|fillet|breast|thigh|drumstick|wing|leg|nugget|stick|link|ear|pod|clove|leaf|serving)\b/, "piece"],
  ];
  for (const [re, u] of map) if (re.test(s)) return u;
  return "serving";
}

async function main() {
  const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
  const db = await openDb();
  const srNames = new Set<string>();
  try {
    for (const key of ["sr", "fndds"] as const) {
      if (only && only !== key) continue;
      const ds = DATASETS[key];
      const sourceId = await upsertSource(db, {
        code: ds.code,
        name: ds.name,
        version: ds.version,
        url: "https://fdc.nal.usda.gov/",
        license: "Public domain (CC0 1.0)",
        attribution: "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central.",
      });
      const [job] = await db.insert(s.foodImportJobs).values({ sourceId, status: "running" }).returning();
      const stats: ImportStats = { read: 0, inserted: 0, updated: 0, skippedDuplicates: 0, flagged: 0, nutrientRows: 0, portionRows: 0 };
      try {
        let foods = await loadDataset(key);
        stats.read = foods.length;
        if (key === "sr") foods.forEach((f) => srNames.add(normalizeName(f.name)));
        else {
          // Deduplicate: FNDDS repeats many single ingredients ("Onions, raw") already in SR Legacy.
          if (!srNames.size) {
            const rows = await db.select({ name: s.foods.name }).from(s.foods).innerJoin(s.foodSources, eq(s.foods.sourceId, s.foodSources.id)).where(eq(s.foodSources.code, "usda_sr_legacy"));
            rows.forEach((r) => srNames.add(normalizeName(r.name)));
          }
          const before = foods.length;
          foods = foods.filter((f) => !srNames.has(normalizeName(f.name)));
          stats.skippedDuplicates = before - foods.length;
        }
        // Records with no energy value can't be logged meaningfully; skip rather than invent.
        const usable = foods.filter((f) => f.core.kcal != null);
        await writeFoods(db, sourceId, usable, ds.confidence, stats);
        await db.update(s.foodImportJobs).set({ status: "completed", stats: { ...stats, missingEnergy: foods.length - usable.length }, finishedAt: new Date() }).where(eq(s.foodImportJobs.id, job!.id));
        console.log(`✓ ${ds.name}:`, stats);
      } catch (e) {
        await db.update(s.foodImportJobs).set({ status: "failed", error: String(e), finishedAt: new Date() }).where(eq(s.foodImportJobs.id, job!.id));
        throw e;
      }
    }
  } finally {
    await closeDb(db);
  }
}

await main();
