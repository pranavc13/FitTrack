import { ApiError, route } from "@/lib/server/api";
import { fieldNum, fieldStr, formData, readAndStoreImages } from "@/lib/server/uploads";
import { scanMeal } from "@/lib/services/scans";
import { aiConfigured } from "@/lib/ai/client";

export const maxDuration = 150;

export const POST = route(
  async ({ db, user, req }) => {
    if (!aiConfigured()) throw new ApiError(503, "AI food recognition is not configured on this server. Search and log the food manually instead.");
    const form = await formData(req);
    const { keys, images } = await readAndStoreImages(form, user.id, "scans", 3);
    const mode = fieldStr(form, "mode") === "detailed" ? "detailed" : "quick";
    return scanMeal(db, user.id, { imageKeys: keys, images, mode, plateDiameterCm: fieldNum(form, "plateDiameterCm"), referenceObject: fieldStr(form, "referenceObject")?.slice(0, 80) ?? null, note: fieldStr(form, "note")?.slice(0, 300) ?? null });
  },
  { limit: 12 },
);
