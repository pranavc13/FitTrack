import { eq } from "drizzle-orm";
import { schema as s } from "@/db";
import { ApiError, route } from "@/lib/server/api";
import { fieldNum, fieldStr, formData, readAndStoreImages } from "@/lib/server/uploads";
import { listPhotos } from "@/lib/services/body";
import { deleteImage } from "@/lib/storage";

export const GET = route(async ({ db, user }) => ({ photos: await listPhotos(db, user.id) }));

/** Progress photos are private: stored under the user's key prefix, served only to the owner. */
export const POST = route(async ({ db, user, req }) => {
  const form = await formData(req);
  const date = fieldStr(form, "date");
  const pose = fieldStr(form, "pose") ?? "front";
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, "date is required (YYYY-MM-DD)");
  if (!["front", "side", "back", "other"].includes(pose)) throw new ApiError(400, "pose must be front, side, back or other");
  const { keys } = await readAndStoreImages(form, user.id, "progress", 1);
  const [photo] = await db
    .insert(s.progressPhotos)
    .values({ userId: user.id, date, pose: pose as "front", imageKey: keys[0]!, weightKg: fieldNum(form, "weightKg"), waistCm: fieldNum(form, "waistCm"), notes: fieldStr(form, "notes")?.slice(0, 300) ?? null })
    .returning();
  return { photo };
});

/** Deletes the entire transformation photo history. */
export const DELETE = route(async ({ db, user }) => {
  const photos = await db.select().from(s.progressPhotos).where(eq(s.progressPhotos.userId, user.id));
  for (const p of photos) await deleteImage(p.imageKey);
  await db.delete(s.progressPhotos).where(eq(s.progressPhotos.userId, user.id));
  return { deleted: photos.length };
});
