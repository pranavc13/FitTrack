import { route } from "@/lib/server/api";
import { getExercise } from "@/lib/services/workouts";

export const GET = route<{ slug: string }>(async ({ db, user, params }) => getExercise(db, user.id, params.slug));
