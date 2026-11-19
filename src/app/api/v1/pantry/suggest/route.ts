import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { schema as s } from "@/db";
import { body, route } from "@/lib/server/api";
import { suggestFromIngredients } from "@/lib/services/mealplan";
import { userToday } from "@/lib/server/context";

export const POST = route(async ({ db, user, req }) => {
  const b = await body(req, z.object({ ingredients: z.array(z.string().max(40)).max(30).optional(), usePantry: z.boolean().optional() }));
  const { today } = await userToday(db, user.id);
  const [p] = await db.select({ d: s.userProfiles.dietPreference }).from(s.userProfiles).where(eq(s.userProfiles.userId, user.id));
  return suggestFromIngredients(db, user.id, { ...b, today, diet: p?.d });
});
