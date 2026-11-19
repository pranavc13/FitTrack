import { route, zId } from "@/lib/server/api";
import { forkRecipe } from "@/lib/services/recipes";

export const POST = route<{ id: string }>(async ({ db, user, params }) => ({ recipe: await forkRecipe(db, user.id, zId.parse(params.id)) }));
