import { route, zId } from "@/lib/server/api";
import { deleteMeasurement } from "@/lib/services/body";

export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  await deleteMeasurement(db, user.id, zId.parse(params.id));
  return { ok: true };
});
