import { route, zId } from "@/lib/server/api";
import { getFood } from "@/lib/services/foods";

export const GET = route<{ id: string }>(async ({ db, user, params }) => getFood(db, user.id, zId.parse(params.id)));
