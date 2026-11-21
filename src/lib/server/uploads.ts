import "server-only";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { MAX_IMAGE_BYTES, saveImage, sniffImageType, storageAvailable } from "@/lib/storage";
import type { ImageInput } from "@/lib/ai/client";

export async function formData(req: NextRequest) {
  try {
    return await req.formData();
  } catch {
    throw new ApiError(400, "Expected multipart form data");
  }
}

/**
 * Reads up to `max` images from a multipart field, validates them and stores them privately.
 * Without image storage, scans still work (photos are analysed in memory and not kept); progress photos,
 * which only make sense stored, are refused with a clear message.
 */
export async function readAndStoreImages(form: FormData, userId: string, folder: "scans" | "progress" | "labels", max = 3, opts: { store?: boolean } = {}) {
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) throw new ApiError(400, "Attach at least one photo");
  const persist = opts.store !== false && storageAvailable();
  if (!persist && folder === "progress") throw new ApiError(503, "Photo storage isn't set up on this server yet, so progress photos can't be saved. Scans still work.");
  if (files.length > max) throw new ApiError(400, `At most ${max} photos`);
  const keys: string[] = [];
  const images: ImageInput[] = [];
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) throw new ApiError(413, "Each photo must be under 8 MB");
    const buf = Buffer.from(await file.arrayBuffer());
    const type = sniffImageType(buf);
    if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") {
      throw new ApiError(415, "Use JPEG, PNG or WebP photos (the app converts camera photos automatically)");
    }
    if (persist) keys.push((await saveImage(userId, folder, buf)).key);
    images.push({ mediaType: type, base64: buf.toString("base64") });
  }
  return { keys, images };
}

export function fieldStr(form: FormData, name: string): string | null {
  const v = form.get(name);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function fieldNum(form: FormData, name: string): number | null {
  const v = fieldStr(form, name);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
