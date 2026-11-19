import { route, zId } from "@/lib/server/api";
import { deleteSleep } from "@/lib/services/wellness";

export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  await deleteSleep(db, user.id, zId.parse(params.id));
  return { ok: true };
});
