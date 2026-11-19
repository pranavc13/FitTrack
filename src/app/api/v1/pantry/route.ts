import { z } from "zod/v4";
import { body, route, zDate } from "@/lib/server/api";
import { addPantryItem, deletePantryItem, listPantry } from "@/lib/services/mealplan";

export const GET = route(async ({ db, user }) => ({ items: await listPantry(db, user.id) }));
export const POST = route(async ({ db, user, req }) => ({ item: await addPantryItem(db, user.id, await body(req, z.object({ name: z.string().trim().min(1).max(80), quantityG: z.number().positive().max(100000).nullable().optional(), expiresOn: zDate.nullable().optional() }))) }));
export const DELETE = route(async ({ db, user, req }) => {
  await deletePantryItem(db, user.id, (await body(req, z.object({ id: z.number().int().positive() }))).id);
  return { ok: true };
});
