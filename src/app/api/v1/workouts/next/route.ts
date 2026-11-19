import { route } from "@/lib/server/api";
import { nextWorkoutSuggestion, personalRecords, trainingCalendar } from "@/lib/services/workouts";
import { addDays } from "@/lib/dates";
import { userToday } from "@/lib/server/context";
import { schema as s } from "@/db";
import { and, eq, isNull } from "drizzle-orm";

export const GET = route(async ({ db, user }) => {
  const { today } = await userToday(db, user.id);
  const [next, calendar, records, open] = await Promise.all([
    nextWorkoutSuggestion(db, user.id, today),
    trainingCalendar(db, user.id, addDays(today, -27), today),
    personalRecords(db, user.id),
    db.select().from(s.workouts).where(and(eq(s.workouts.userId, user.id), isNull(s.workouts.endedAt))),
  ]);
  return { ...next, calendar, records, openWorkoutId: open[0]?.id ?? null };
});
