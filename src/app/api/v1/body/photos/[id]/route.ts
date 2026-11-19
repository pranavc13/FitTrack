import { z } from "zod/v4";
import { and, eq } from "drizzle-orm";
import { schema as s } from "@/db";
import { body, notFound, route, zId } from "@/lib/server/api";
import { deleteImage } from "@/lib/storage";

export const PATCH = route<{ id: string }>(async ({ db, user, params, req }) => {
  const b = await body(req, z.object({ notes: z.string().max(300).nullable().optional(), weightKg: z.number().min(20).max(400).nullable().optional(), waistCm: z.number().positive().max(300).nullable().optional() }));
  const [row] = await db.update(s.progressPhotos).set({ ...b, updatedAt: new Date() }).where(and(eq(s.progressPhotos.id, zId.parse(params.id)), eq(s.progressPhotos.userId, user.id))).returning();
  if (!row) throw notFound("Photo");
  return { photo: row };
});

export const DELETE = route<{ id: string }>(async ({ db, user, params }) => {
  const [row] = await db.delete(s.progressPhotos).where(and(eq(s.progressPhotos.id, zId.parse(params.id)), eq(s.progressPhotos.userId, user.id))).returning();
  if (!row) throw notFound("Photo");
  await deleteImage(row.imageKey);
  return { ok: true };
});
