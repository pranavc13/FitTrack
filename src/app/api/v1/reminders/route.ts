import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { schema as s } from "@/db";
import { body, route } from "@/lib/server/api";

export const GET = route(async ({ db, user }) => ({ reminders: await db.select().from(s.reminders).where(eq(s.reminders.userId, user.id)) }));

/** Replaces the user's reminder set. */
export const PUT = route(async ({ db, user, req }) => {
  const { reminders } = await body(
    req,
    z.object({
      reminders: z.array(z.object({ kind: z.enum(["water", "meal", "weigh_in", "measurement", "workout", "sleep"]), timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7), enabled: z.boolean() })).max(20),
    }),
  );
  await db.delete(s.reminders).where(eq(s.reminders.userId, user.id));
  if (reminders.length) await db.insert(s.reminders).values(reminders.map((r) => ({ ...r, userId: user.id })));
  return { reminders: await db.select().from(s.reminders).where(eq(s.reminders.userId, user.id)) };
});
