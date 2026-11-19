import { route, zId } from "@/lib/server/api";
import { deleteActivity } from "@/lib/services/activity";

export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  await deleteActivity(db, user.id, zId.parse(params.id));
  return { ok: true };
});
