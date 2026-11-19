import { route, zId } from "@/lib/server/api";
import { suggestSubstitutions } from "@/lib/services/recipes";

export const GET = route<{ id: string }>(async ({ db, user, params }) => ({ suggestions: await suggestSubstitutions(db, user.id, zId.parse(params.id)) }));
