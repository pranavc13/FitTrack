"use client";

/**
 * Downscales and re-encodes a photo to JPEG before upload (≈150–400 KB instead of 3–8 MB), which keeps
 * scans fast on 4G and converts HEIC/other camera formats the browser can decode.
 */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") return file;
    throw new Error("This photo format isn't supported by your browser. Try a JPEG or PNG.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality));
}

/** Grabs the current frame of a <video> element as a JPEG blob. */
export function captureFrame(video: HTMLVideoElement, maxSide = 1600): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Capture failed"))), "image/jpeg", 0.85));
}
