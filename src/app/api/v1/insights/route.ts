import { z } from "zod/v4";
import { query, route, zDate } from "@/lib/server/api";
import { fibreGap, foodVariety, hiddenCalories, mealTiming, nutritionScore, proteinGap, weeklyBudget } from "@/lib/services/insights";
import { addDays, weekStart } from "@/lib/dates";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user, req }) => {
  const { today } = await userToday(db, user.id);
  const q = query(req, z.object({ date: zDate.optional() }));
  const date = q.date ?? today;
  const from = addDays(date, -6);
  const [protein, fibre, score, hidden, budget, timing, variety] = await Promise.all([
    proteinGap(db, user.id, date),
    fibreGap(db, user.id, date),
    nutritionScore(db, user.id, date),
    hiddenCalories(db, user.id, from, date),
    weeklyBudget(db, user.id, weekStart(date)),
    mealTiming(db, user.id, from, date),
    foodVariety(db, user.id, from, date),
  ]);
  return { date, protein, fibre, score, hidden, budget, timing, variety };
});
