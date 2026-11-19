import { route, zId } from "@/lib/server/api";
import { deleteWorkout, getWorkout } from "@/lib/services/workouts";

export const GET = route<{ id: string }>(async ({ db, user, params }) => getWorkout(db, user.id, zId.parse(params.id)));
export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  await deleteWorkout(db, user.id, zId.parse(params.id));
  return { ok: true };
});
