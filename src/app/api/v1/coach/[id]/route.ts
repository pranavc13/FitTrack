import { route, zId } from "@/lib/server/api";
import { deleteConversation, getConversation } from "@/lib/ai/coach";

export const GET = route<{ id: string }>(async ({ db, user, params }) => getConversation(db, user.id, zId.parse(params.id)));
export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  await deleteConversation(db, user.id, zId.parse(params.id));
  return { ok: true };
});
