import { route } from "@/lib/server/api";
import { listGroceryLists } from "@/lib/services/mealplan";

export const GET = route(async ({ db, user }) => ({ lists: await listGroceryLists(db, user.id) }));
