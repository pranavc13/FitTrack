import { route, zId } from "@/lib/server/api";
import { groceryFromPlan } from "@/lib/services/mealplan";

export const POST = route<{ id: string }>(async ({ db, user, params }) => groceryFromPlan(db, user.id, zId.parse(params.id)));
