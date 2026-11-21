/**
 * Historical fitness-data imports. A web app/PWA cannot read Android Health Connect (on-device API
 * for native apps only) and the Google Fit REST API is deprecated, so this module imports exported
 * FILES only — it never claims live synchronisation.
 *
 * Supported:
 *  - Google Takeout → Fit: "Daily activity metrics.csv" (daily steps/distance/move minutes/HR/calories)
 *  - Google Takeout → Fit: "All Sessions/*.json" (workout sessions)
 *  - A .zip of the Takeout export containing either of the above
 *  - Generic CSV (date, steps, distance_km|distance_m, calories, active_minutes, sleep_minutes, avg_heart_rate)
 *    — the format produced by most Health Connect exporter apps after column mapping
 *  - Generic JSON array of { date|startTime, endTime?, type, value }
 */
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { logActivity, setSteps } from "./activity";
import { recomputeDailySummary } from "./summary";

export interface ParsedRecord {
  recordType: "steps" | "distance" | "session" | "heart_rate" | "sleep" | "calories" | "active_minutes";
  date: string;
  startTime: string;
  endTime?: string | null;
  value: number | null;
  unit: string | null;
  activityName?: string | null;
  durationMin?: number | null;
  distanceKm?: number | null;
  steps?: number | null;
  dedupeKey: string;
}

export interface ParseResult {
  provider: string;
  records: ParsedRecord[];
  errors: string[];
}

const MAX_BYTES = 25 * 1024 * 1024;

function localDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

const num = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

function findCol(headers: string[], ...patterns: RegExp[]) {
  return headers.find((h) => patterns.some((p) => p.test(h.toLowerCase().trim())));
}

/** Google Takeout "Daily activity metrics.csv" or generic daily CSV. */
function parseDailyCsv(text: string, provider: string, errors: string[]): ParsedRecord[] {
  const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true, trim: true }) as Record<string, string>[];
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]!);
  const cDate = findCol(headers, /^date$/, /^day$/, /^start ?date/);
  if (!cDate) {
    errors.push(`CSV has no Date column (found: ${headers.slice(0, 8).join(", ")})`);
    return [];
  }
  const cSteps = findCol(headers, /^step count$/, /^steps?$/);
  const cDistM = findCol(headers, /^distance \(m\)$/, /^distance_m$/);
  const cDistKm = findCol(headers, /^distance_km$/, /^distance \(km\)$/);
  const cCal = findCol(headers, /^calories \(kcal\)$/, /^calories$/, /^active_?calories/);
  const cMove = findCol(headers, /^move minutes count$/, /^active_?minutes$/);
  const cHr = findCol(headers, /^average heart rate \(bpm\)$/, /^avg_?heart_?rate$/);
  const cSleep = findCol(headers, /^sleep_?minutes$/, /^sleep duration \(min/);
  const out: ParsedRecord[] = [];
  rows.forEach((r, i) => {
    const date = (r[cDate] ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (i < 5) errors.push(`Row ${i + 2}: unrecognised date "${r[cDate]}" (expected YYYY-MM-DD)`);
      return;
    }
    const start = `${date}T00:00:00.000Z`;
    const push = (recordType: ParsedRecord["recordType"], value: number | null, unit: string) => {
      if (value == null) return;
      if (value < 0) return errors.push(`Row ${i + 2}: negative ${recordType} ignored`) as unknown as void;
      out.push({ recordType, date, startTime: start, value, unit, dedupeKey: `${provider}:${recordType}:${date}` });
    };
    const steps = cSteps ? num(r[cSteps]) : null;
    if (steps != null && steps > 150_000) errors.push(`Row ${i + 2}: ${steps} steps looks implausible — skipped`);
    else push("steps", steps, "count");
    const dist = cDistKm ? num(r[cDistKm]) : cDistM ? (num(r[cDistM]) ?? 0) / 1000 || null : null;
    push("distance", dist, "km");
    push("calories", cCal ? num(r[cCal]) : null, "kcal");
    push("active_minutes", cMove ? num(r[cMove]) : null, "min");
    push("heart_rate", cHr ? num(r[cHr]) : null, "bpm");
    push("sleep", cSleep ? num(r[cSleep]) : null, "min");
  });
  return out;
}

/** Google Takeout Fit session JSON. */
function parseSessionJson(json: unknown, tz: string, errors: string[], name: string): ParsedRecord[] {
  const sessions = Array.isArray(json) ? json : [json];
  const out: ParsedRecord[] = [];
  for (const sRaw of sessions) {
    const ses = sRaw as Record<string, unknown>;
    const start = (ses.startTime ?? ses.start_time ?? ses.startDate ?? ses.date) as string | undefined;
    if (!start || Number.isNaN(Date.parse(start))) {
      errors.push(`${name}: session without a valid start time`);
      continue;
    }
    const end = (ses.endTime ?? ses.end_time ?? null) as string | null;
    const aggregates = (ses.aggregate as { metricName: string; floatValue?: number; intValue?: number }[] | undefined) ?? [];
    const metric = (k: string) => aggregates.find((a) => a.metricName.includes(k));
    const durationSec = typeof ses.duration === "string" ? parseFloat(ses.duration) : end ? (Date.parse(end) - Date.parse(start)) / 1000 : null;
    const type = String(ses.fitnessActivity ?? ses.type ?? ses.activity ?? "other").toLowerCase();
    if (type === "sleep" || type.startsWith("sleep")) {
      out.push({ recordType: "sleep", date: localDate(end ?? start, tz), startTime: start, endTime: end, value: durationSec ? durationSec / 60 : null, unit: "min", dedupeKey: `session:sleep:${start}` });
      continue;
    }
    if (!durationSec || durationSec < 60) continue;
    out.push({
      recordType: "session",
      date: localDate(start, tz),
      startTime: start,
      endTime: end,
      value: metric("calories")?.floatValue ?? null,
      unit: "kcal (device)",
      activityName: type,
      durationMin: Math.round(durationSec / 60),
      distanceKm: metric("distance") ? (metric("distance")!.floatValue ?? 0) / 1000 : (num(ses.distance_km) ?? null),
      steps: metric("step_count")?.intValue ?? null,
      dedupeKey: `session:${type}:${start}`,
    });
  }
  return out;
}

export function parseImportFile(filename: string, buf: Buffer, tz: string): ParseResult {
  if (buf.length > MAX_BYTES) throw new ApiError(413, "File is larger than 25 MB — export a shorter date range or upload the Fit folder files individually");
  const errors: string[] = [];
  const records: ParsedRecord[] = [];
  const lower = filename.toLowerCase();
  let provider = "csv";
  const handle = (name: string, data: Buffer) => {
    const n = name.toLowerCase();
    if (n.endsWith(".csv")) {
      // Per-day interval files in Takeout ("2024-01-15.csv") duplicate the daily summary — skip them.
      if (/\d{4}-\d{2}-\d{2}\.csv$/.test(n)) return;
      if (n.includes("daily activity metrics")) provider = "google_fit_takeout";
      records.push(...parseDailyCsv(data.toString("utf8"), provider, errors));
    } else if (n.endsWith(".json")) {
      if (n.includes("all sessions") || n.includes("sessions")) provider = "google_fit_takeout";
      try {
        records.push(...parseSessionJson(JSON.parse(data.toString("utf8")), tz, errors, name));
      } catch {
        errors.push(`${name}: invalid JSON`);
      }
    }
  };
  if (lower.endsWith(".zip")) {
    let zip: AdmZip;
    try {
      zip = new AdmZip(buf);
    } catch {
      throw new ApiError(400, "Could not open the ZIP file");
    }
    const entries = zip.getEntries().filter((e) => !e.isDirectory && /fit|health|activity|session|steps/i.test(e.entryName));
    let total = 0;
    const tooBig = () => new ApiError(413, "ZIP expands to more than 200 MB");
    // Check the declared size first, then the real one: a forged header can claim 0 bytes.
    if (entries.reduce((a, e) => a + e.header.size, 0) > 200 * 1024 * 1024) throw tooBig();
    for (const e of entries) {
      const data = e.getData();
      total += data.length;
      if (total > 200 * 1024 * 1024) throw tooBig();
      handle(e.entryName, data);
    }
    if (!entries.length) errors.push("No Google Fit / health files found in the ZIP (looked for Fit/Daily activity metrics and All Sessions)");
  } else if (lower.endsWith(".csv") || lower.endsWith(".json")) handle(filename, buf);
  else throw new ApiError(400, "Upload a .csv, .json or .zip export");

  // In-file de-duplication.
  const seen = new Set<string>();
  const unique = records.filter((r) => (seen.has(r.dedupeKey) ? false : (seen.add(r.dedupeKey), true)));
  return { provider, records: unique, errors: errors.slice(0, 50) };
}

/** Maps exported activity names to 2024 Compendium codes. */
const ACTIVITY_MAP: [RegExp, string][] = [
  [/run|jog/, "12050"],
  [/walk/, "17190"],
  [/hik/, "17080"],
  [/bik|cycl/, "01016"],
  [/swim/, "18310"],
  [/yoga/, "02150"],
  [/strength|weight|gym/, "02054"],
  [/hiit|interval|circuit/, "02214"],
  [/elliptical/, "02048"],
  [/row/, "02071"],
  [/danc|zumba/, "02310"],
  [/badminton/, "15030"],
  [/cricket/, "15150"],
  [/football|soccer/, "15610"],
  [/tennis/, "15675"],
];

async function activityTypeFor(db: Db, name: string) {
  const code = ACTIVITY_MAP.find(([re]) => re.test(name))?.[1] ?? "02035";
  const [t] = await db.select().from(s.activityTypes).where(and(eq(s.activityTypes.code, code), isNull(s.activityTypes.ownerUserId)));
  return t ?? null;
}

async function existingKeys(db: Db, userId: string, keys: string[]) {
  const found = new Set<string>();
  for (let i = 0; i < keys.length; i += 500) {
    const batch = keys.slice(i, i + 500);
    const rows = rowsOf<{ dedupe_key: string }>(
      await db.execute(sql`SELECT dedupe_key FROM imported_activity_records WHERE user_id = ${userId} AND dedupe_key IN (${sql.join(batch.map((k) => sql`${k}`), sql`, `)})`),
    );
    rows.forEach((r) => found.add(r.dedupe_key));
  }
  return found;
}

export async function previewImport(db: Db, userId: string, filename: string, parsed: ParseResult, range: { from?: string; to?: string }) {
  const inRange = parsed.records.filter((r) => (!range.from || r.date >= range.from) && (!range.to || r.date <= range.to));
  const existing = await existingKeys(db, userId, inRange.map((r) => r.dedupeKey));
  const fresh = inRange.filter((r) => !existing.has(r.dedupeKey));
  const byType: Record<string, number> = {};
  for (const r of fresh) byType[r.recordType] = (byType[r.recordType] ?? 0) + 1;
  const dates = inRange.map((r) => r.date).sort();
  const [job] = await db
    .insert(s.activityImportJobs)
    .values({
      userId,
      provider: parsed.provider,
      filename: filename.slice(0, 200),
      status: "previewed",
      dateFrom: range.from ?? dates[0] ?? null,
      dateTo: range.to ?? dates.at(-1) ?? null,
      stats: { total: parsed.records.length, inRange: inRange.length, duplicates: inRange.length - fresh.length, new: fresh.length, ...byType },
      errors: parsed.errors,
    })
    .returning();
  return {
    jobId: job!.id,
    provider: parsed.provider,
    dateRange: { from: dates[0] ?? null, to: dates.at(-1) ?? null },
    counts: { total: parsed.records.length, inRange: inRange.length, duplicates: inRange.length - fresh.length, new: fresh.length, byType },
    sample: fresh.slice(0, 15),
    errors: parsed.errors,
    note: "Historical file import — this does not connect to Google Fit or Health Connect live.",
  };
}

/**
 * Commits parsed records. Steps/distance become daily step logs (an imported value never overwrites a
 * manual entry), sessions become activity logs with our MET estimate (device calories are stored
 * alongside, never added), sleep becomes sleep logs. Device "calories" daily totals are kept as raw
 * records for reference only, so expenditure is never double counted.
 */
export async function commitImport(db: Db, userId: string, jobId: number, parsed: ParseResult, range: { from?: string; to?: string }) {
  const [job] = await db.select().from(s.activityImportJobs).where(and(eq(s.activityImportJobs.id, jobId), eq(s.activityImportJobs.userId, userId)));
  if (!job) throw new ApiError(404, "Import job not found");
  if (job.status === "committed") throw new ApiError(409, "This import was already committed");
  const records = parsed.records.filter((r) => (!range.from || r.date >= range.from) && (!range.to || r.date <= range.to));
  const stats = { imported: 0, duplicates: 0, sessions: 0, stepDays: 0, sleep: 0, skippedManual: 0 };
  const touched = new Set<string>();
  const daily = new Map<string, { steps?: number; distanceKm?: number; activeMinutes?: number }>();

  for (const r of records) {
    const [row] = await db
      .insert(s.importedActivityRecords)
      .values({ userId, jobId, provider: parsed.provider, recordType: r.recordType, startTime: new Date(r.startTime), endTime: r.endTime ? new Date(r.endTime) : null, value: r.value, unit: r.unit, activityName: r.activityName ?? null, dedupeKey: r.dedupeKey, raw: r as unknown as Record<string, unknown> })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      stats.duplicates++;
      continue;
    }
    stats.imported++;
    if (r.recordType === "steps" || r.recordType === "distance" || r.recordType === "active_minutes") {
      const d = daily.get(r.date) ?? {};
      if (r.recordType === "steps") d.steps = r.value ?? undefined;
      if (r.recordType === "distance") d.distanceKm = r.value ?? undefined;
      daily.set(r.date, d);
    } else if (r.recordType === "session") {
      const type = await activityTypeFor(db, r.activityName ?? "");
      if (type && r.durationMin) {
        await logActivity(db, userId, { activityTypeId: type.id, date: r.date, durationMin: r.durationMin, distanceKm: r.distanceKm, startedAt: r.startTime, source: "import", importedRecordId: row.id, deviceKcal: r.value, steps: r.steps, notes: `Imported: ${r.activityName}` });
        stats.sessions++;
      }
    } else if (r.recordType === "sleep" && r.value && r.value >= 30) {
      await db
        .insert(s.sleepLogs)
        .values({ userId, date: r.date, durationMin: Math.round(r.value), source: "import", bedtime: r.endTime ? new Date(r.startTime) : null, wakeTime: r.endTime ? new Date(r.endTime) : null })
        .onConflictDoNothing();
      touched.add(r.date);
      stats.sleep++;
    }
  }
  for (const [date, d] of daily) {
    if (d.steps == null) continue;
    const [existing] = await db.select().from(s.stepLogs).where(and(eq(s.stepLogs.userId, userId), eq(s.stepLogs.date, date)));
    if (existing?.source === "manual") {
      stats.skippedManual++;
      continue;
    }
    await setSteps(db, userId, date, Math.round(d.steps), d.distanceKm ?? null, "import");
    stats.stepDays++;
  }
  for (const date of touched) await recomputeDailySummary(db, userId, date);
  await db.update(s.activityImportJobs).set({ status: "committed", stats: { ...job.stats, ...stats }, updatedAt: new Date() }).where(eq(s.activityImportJobs.id, jobId));
  await db
    .insert(s.fitnessIntegrations)
    .values({ userId, provider: parsed.provider, status: "file_import", lastImportAt: new Date() })
    .onConflictDoUpdate({ target: [s.fitnessIntegrations.userId, s.fitnessIntegrations.provider], set: { lastImportAt: new Date(), status: "file_import" } });
  return stats;
}

export async function importHistory(db: Db, userId: string) {
  return db.select().from(s.activityImportJobs).where(eq(s.activityImportJobs.userId, userId)).orderBy(desc(s.activityImportJobs.createdAt)).limit(30);
}
