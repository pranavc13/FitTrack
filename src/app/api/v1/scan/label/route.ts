import { ApiError, route } from "@/lib/server/api";
import { formData, readAndStoreImages } from "@/lib/server/uploads";
import { scanLabel } from "@/lib/services/scans";
import { aiConfigured } from "@/lib/ai/client";

export const maxDuration = 150;

export const POST = route(
  async ({ db, user, req }) => {
    if (!aiConfigured()) throw new ApiError(503, "Label reading (OCR) is not configured on this server. Enter the label values manually instead.");
    const form = await formData(req);
    const { keys, images } = await readAndStoreImages(form, user.id, "labels", 3);
    return scanLabel(db, user.id, { imageKeys: keys, images });
  },
  { limit: 12 },
);
