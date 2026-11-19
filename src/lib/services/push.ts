import webpush from "web-push";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { ApiError } from "@/lib/errors";

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function init() {
  if (!pushConfigured()) throw new ApiError(503, "Push notifications are not configured on this server");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
}

export async function saveSubscription(db: Db, userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  await db
    .insert(s.pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({ target: s.pushSubscriptions.endpoint, set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
}

export async function removeSubscription(db: Db, userId: string, endpoint: string) {
  await db.delete(s.pushSubscriptions).where(and(eq(s.pushSubscriptions.userId, userId), eq(s.pushSubscriptions.endpoint, endpoint)));
}

export async function sendToUser(db: Db, userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  init();
  const subs = await db.select().from(s.pushSubscriptions).where(eq(s.pushSubscriptions.userId, userId));
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.id, sub.id)); // expired
    }
  }
  return sent;
}

export const REMINDER_TEXT: Record<string, { title: string; body: string; url: string }> = {
  water: { title: "Hydration check 💧", body: "Time for a glass of water.", url: "/wellness" },
  meal: { title: "Log your meal 🍽️", body: "Snap a photo of what you're eating.", url: "/scan" },
  weigh_in: { title: "Morning weigh-in ⚖️", body: "Weigh in before breakfast for the cleanest trend.", url: "/progress" },
  measurement: { title: "Weekly measurements 📏", body: "Log waist and body measurements to track your transformation.", url: "/progress" },
  workout: { title: "Training time 🏋️", body: "Your next session is ready.", url: "/activity/workout" },
  sleep: { title: "Wind down 😴", body: "Aim for 7–9 hours of sleep tonight.", url: "/wellness" },
};

/** Sends reminders that are due (called by a scheduled job, e.g. Vercel Cron every 15 minutes). */
export async function sendDueReminders(db: Db, now = new Date()) {
  if (!pushConfigured()) return { sent: 0, skipped: "push not configured" };
  const rows = await db
    .select({ r: s.reminders, tz: s.userPreferences.timezone })
    .from(s.reminders)
    .leftJoin(s.userPreferences, eq(s.userPreferences.userId, s.reminders.userId))
    .where(eq(s.reminders.enabled, true));
  let sent = 0;
  for (const { r, tz } of rows) {
    const zone = tz ?? "Asia/Kolkata";
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(now);
    const hh = Number(parts.find((p) => p.type === "hour")?.value);
    const mm = Number(parts.find((p) => p.type === "minute")?.value);
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")?.value ?? "");
    const [rh, rm] = r.timeOfDay.split(":").map(Number);
    const minutesLate = hh * 60 + mm - (rh! * 60 + rm!);
    if (!r.weekdays.includes(wd) || minutesLate < 0 || minutesLate >= 15) continue;
    if (r.lastSentAt && now.getTime() - r.lastSentAt.getTime() < 60 * 60 * 1000) continue;
    const text = REMINDER_TEXT[r.kind];
    if (!text) continue;
    sent += await sendToUser(db, r.userId, { ...text, tag: `reminder-${r.kind}` });
    await db.update(s.reminders).set({ lastSentAt: now }).where(eq(s.reminders.id, r.id));
  }
  return { sent };
}
