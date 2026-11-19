import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { schema as s } from "@/db";
import { todayIn } from "@/lib/dates";

/** The user's timezone and "today" in that timezone (diary dates are local dates). */
export async function userToday(db: Db, userId: string) {
  const [prefs] = await db.select({ tz: s.userPreferences.timezone }).from(s.userPreferences).where(eq(s.userPreferences.userId, userId));
  const tz = prefs?.tz ?? "Asia/Kolkata";
  const today = todayIn(tz);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return { tz, today, hour };
}
