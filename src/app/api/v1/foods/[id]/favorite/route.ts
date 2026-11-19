import { z } from "zod/v4";
import { body, route, zId } from "@/lib/server/api";
import { setFavorite } from "@/lib/services/foods";

export const PUT = route<{ id: string }>(async ({ db, user, params, req }) => {
  const { on } = await body(req, z.object({ on: z.boolean() }));
  await setFavorite(db, user.id, zId.parse(params.id), on);
  return { ok: true };
});
