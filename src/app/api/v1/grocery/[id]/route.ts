import { z } from "zod/v4";
import { body, route, zId } from "@/lib/server/api";
import { addGroceryItem, getGroceryList, toggleGroceryItem } from "@/lib/services/mealplan";

export const GET = route<{ id: string }>(async ({ db, user, params }) => getGroceryList(db, user.id, zId.parse(params.id)));
export const POST = route<{ id: string }>(async ({ db, user, params, req }) => {
  const b = await body(req, z.object({ name: z.string().trim().min(1).max(80), category: z.string().max(40).optional() }));
  return { item: await addGroceryItem(db, user.id, zId.parse(params.id), b.name, b.category) };
});
export const PATCH = route<{ id: string }>(async ({ db, user, req }) => {
  const b = await body(req, z.object({ itemId: z.number().int().positive(), checked: z.boolean() }));
  await toggleGroceryItem(db, user.id, b.itemId, b.checked);
  return { ok: true };
});
