import { route, zId } from "@/lib/server/api";
import { getMealPlan } from "@/lib/services/mealplan";

export const GET = route<{ id: string }>(async ({ db, user, params }) => getMealPlan(db, user.id, zId.parse(params.id)));
