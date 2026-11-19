import { route, zId } from "@/lib/server/api";
import { deleteWeight } from "@/lib/services/body";

export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  await deleteWeight(db, user.id, zId.parse(params.id));
  return { ok: true };
});
