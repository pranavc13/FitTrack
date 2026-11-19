import { z } from "zod/v4";
import { query, route } from "@/lib/server/api";
import { matchIngredient } from "@/lib/services/recipes";

export const GET = route(async ({ db, user, req }) => {
  const q = query(req, z.object({ name: z.string().min(1).max(100) }));
  return { candidates: await matchIngredient(db, user.id, q.name) };
}, { limit: 240 });
