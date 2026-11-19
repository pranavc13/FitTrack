import { route, zId } from "@/lib/server/api";
import { deleteWater } from "@/lib/services/wellness";

export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  await deleteWater(db, user.id, zId.parse(params.id));
  return { ok: true };
});
