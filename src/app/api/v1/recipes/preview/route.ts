import { body, route } from "@/lib/server/api";
import { previewRecipe } from "@/lib/services/recipes";
import { RecipeInput } from "@/lib/server/schemas";

export const POST = route(async ({ db, user, req }) => previewRecipe(db, user.id, await body(req, RecipeInput.extend({ name: RecipeInput.shape.name.optional().default("Preview") }))), { limit: 240 });
