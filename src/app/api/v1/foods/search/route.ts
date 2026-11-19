import { z } from "zod/v4";
import { query, route } from "@/lib/server/api";
import { searchFoods } from "@/lib/services/foods";

export const GET = route(
  async ({ db, user, req }) => {
    const q = query(req, z.object({ q: z.string().max(100), type: z.string().max(20).optional(), offset: z.coerce.number().int().min(0).max(200).optional() }));
    return { results: await searchFoods(db, user.id, q.q, { type: q.type, offset: q.offset }) };
  },
  { limit: 240 },
);
