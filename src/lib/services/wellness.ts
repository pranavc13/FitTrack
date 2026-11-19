import { and, desc, eq, gte, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { ApiError, notFound } from "@/lib/errors";
import { recomputeDailySummary } from "./summary";

export async function addWater(db: Db, userId: string, date: string, ml: number, clientId?: string | null) {
  if (!(ml > 0 && ml <= 5000)) throw new ApiError(400, "Amount must be 1–5000 ml");
  if (clientId) {
    const [dupe] = await db.select().from(s.hydrationLogs).where(and(eq(s.hydrationLogs.userId, userId), eq(s.hydrationLogs.clientId, clientId)));
    if (dupe) return dupe;
  }
  const [row] = await db.insert(s.hydrationLogs).values({ userId, date, ml, clientId: clientId ?? null }).returning();
  await recomputeDailySummary(db, userId, date);
  return row!;
}

export async function waterForDay(db: Db, userId: string, date: string) {
  return db.select().from(s.hydrationLogs).where(and(eq(s.hydrationLogs.userId, userId), eq(s.hydrationLogs.date, date))).orderBy(desc(s.hydrationLogs.loggedAt));
}

export async function deleteWater(db: Db, userId: string, id: number) {
  const [row] = await db.delete(s.hydrationLogs).where(and(eq(s.hydrationLogs.id, id), eq(s.hydrationLogs.userId, userId))).returning();
  if (!row) throw notFound("Water entry");
  await recomputeDailySummary(db, userId, row.date);
}

export async function logSleep(
  db: Db,
  userId: string,
  input: { date: string; bedtime?: string | null; wakeTime?: string | null; durationMin?: number | null; quality?: number | null },
) {
  let duration = input.durationMin ?? null;
  if (input.bedtime && input.wakeTime) {
    const ms = Date.parse(input.wakeTime) - Date.parse(input.bedtime);
    if (!(ms > 0)) throw new ApiError(400, "Wake time must be after bedtime");
    duration = Math.round(ms / 60000);
  }
  if (!duration || duration < 30 || duration > 20 * 60) throw new ApiError(400, "Sleep duration must be between 30 minutes and 20 hours");
  if (input.quality != null && (input.quality < 1 || input.quality > 5)) throw new ApiError(400, "Quality must be 1–5");
  const values = {
    userId,
    date: input.date,
    bedtime: input.bedtime ? new Date(input.bedtime) : null,
    wakeTime: input.wakeTime ? new Date(input.wakeTime) : null,
    durationMin: duration,
    quality: input.quality ?? null,
    source: "manual" as const,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(s.sleepLogs)
    .values(values)
    .onConflictDoUpdate({ target: [s.sleepLogs.userId, s.sleepLogs.date, s.sleepLogs.source], set: values })
    .returning();
  await recomputeDailySummary(db, userId, input.date);
  return row!;
}

export async function sleepHistory(db: Db, userId: string, from: string) {
  return db.select().from(s.sleepLogs).where(and(eq(s.sleepLogs.userId, userId), gte(s.sleepLogs.date, from))).orderBy(desc(s.sleepLogs.date));
}

export async function deleteSleep(db: Db, userId: string, id: number) {
  const [row] = await db.delete(s.sleepLogs).where(and(eq(s.sleepLogs.id, id), eq(s.sleepLogs.userId, userId))).returning();
  if (!row) throw notFound("Sleep entry");
  await recomputeDailySummary(db, userId, row.date);
}

/* ---- Fasting (optional, non-extreme) ---- */
export const MAX_FAST_HOURS = 24;

export async function startFast(db: Db, userId: string, targetHours: number) {
  if (!(targetHours >= 10 && targetHours <= MAX_FAST_HOURS)) {
    throw new ApiError(400, `Fasting windows are limited to 10–${MAX_FAST_HOURS} hours in this app. Longer fasts should be medically supervised.`);
  }
  const [active] = await db.select().from(s.fastingLogs).where(and(eq(s.fastingLogs.userId, userId), isNull(s.fastingLogs.endedAt)));
  if (active) throw new ApiError(409, "A fast is already in progress");
  const [row] = await db.insert(s.fastingLogs).values({ userId, startedAt: new Date(), targetHours }).returning();
  return row!;
}

export async function endFast(db: Db, userId: string) {
  const [row] = await db
    .update(s.fastingLogs)
    .set({ endedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(s.fastingLogs.userId, userId), isNull(s.fastingLogs.endedAt)))
    .returning();
  if (!row) throw notFound("Active fast");
  return row;
}

export async function fastingHistory(db: Db, userId: string) {
  return db.select().from(s.fastingLogs).where(eq(s.fastingLogs.userId, userId)).orderBy(desc(s.fastingLogs.startedAt)).limit(30);
}

/* ---- Supplements (log only — no recommendations or claims) ---- */
export async function logSupplement(
  db: Db,
  userId: string,
  input: { date: string; name: string; dose: number; unit: string; kcal?: number | null; proteinG?: number | null; notes?: string | null },
) {
  if (!(input.dose > 0)) throw new ApiError(400, "Dose must be positive");
  const [row] = await db.insert(s.supplementLogs).values({ userId, ...input }).returning();
  return row!;
}

export async function supplementsForDay(db: Db, userId: string, date: string) {
  return db.select().from(s.supplementLogs).where(and(eq(s.supplementLogs.userId, userId), eq(s.supplementLogs.date, date)));
}

export async function deleteSupplement(db: Db, userId: string, id: number) {
  const [row] = await db.delete(s.supplementLogs).where(and(eq(s.supplementLogs.id, id), eq(s.supplementLogs.userId, userId))).returning();
  if (!row) throw notFound("Supplement entry");
}
