import { ApiError, route } from "@/lib/server/api";
import { formData, readAndStoreImages } from "@/lib/server/uploads";
import { lookupBarcode } from "@/lib/services/scans";
import { aiConfigured } from "@/lib/ai/client";
import { readBarcodePhoto } from "@/lib/ai/vision";

export const maxDuration = 60;

/** Photo of a barcode → digits (read by the vision model) → product lookup. */
export const POST = route(
  async ({ db, user, req }) => {
    if (!aiConfigured()) throw new ApiError(503, "Reading barcodes from photos needs AI, which isn't configured. Type the number under the barcode instead.");
    const form = await formData(req);
    const { images } = await readAndStoreImages(form, user.id, "labels", 1);
    const { data } = await readBarcodePhoto(images);
    const digits = data.digits?.replace(/\D/g, "") ?? "";
    if (!/^\d{8,14}$/.test(digits)) {
      return { found: false, barcode: null, message: "Couldn't read the barcode number in that photo. Get closer so the digits under the bars are sharp, or type them below." };
    }
    return { ...(await lookupBarcode(db, user.id, digits)), barcode: digits };
  },
  { limit: 20 },
);
