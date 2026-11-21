import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { ApiError } from "@/lib/errors";

/**
 * Private image storage. Keys are always prefixed with the owner's user id and are only served through
 * the authenticated /api/v1/files route, which checks that prefix — nothing is publicly readable.
 * Drivers: "local" (./uploads, dev only — serverless filesystems are ephemeral) and "s3" (any S3-compatible).
 */
const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const driver = () => (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3";

/** Whether images can be kept: S3 configured, or local disk outside serverless (Vercel's filesystem is ephemeral). */
export function storageAvailable() {
  if (driver() === "s3") return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
  return !process.env.VERCEL;
}
const LOCAL_ROOT = path.join(process.cwd(), "uploads");

function s3() {
  const { S3_BUCKET, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) throw new Error("S3 storage is not configured");
  const client = new AwsClient({ accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, region: S3_REGION || "auto", service: "s3" });
  const base = (S3_ENDPOINT ? S3_ENDPOINT.replace(/\/$/, "") + `/${S3_BUCKET}` : `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`);
  return { client, url: (key: string) => `${base}/${key.split("/").map(encodeURIComponent).join("/")}` };
}

/** Sniffs the real image type from magic bytes (never trust the client's content-type). */
export function sniffImageType(buf: Uint8Array): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70 && /heic|heix|mif1/.test(Buffer.from(buf.slice(8, 12)).toString())) return "image/heic";
  return null;
}

export async function saveImage(userId: string, folder: "scans" | "progress" | "labels", data: Buffer): Promise<{ key: string; contentType: string }> {
  if (data.length > MAX_IMAGE_BYTES) throw new ApiError(413, "Image is larger than 8 MB");
  const contentType = sniffImageType(data);
  if (!contentType || !ALLOWED[contentType]) throw new ApiError(415, "Only JPEG, PNG, WebP or HEIC images are accepted");
  const key = `${userId}/${folder}/${randomUUID()}.${ALLOWED[contentType]}`;
  if (driver() === "s3") {
    const { client, url } = s3();
    const res = await client.fetch(url(key), { method: "PUT", body: new Uint8Array(data), headers: { "Content-Type": contentType } });
    if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
  } else {
    const file = path.join(LOCAL_ROOT, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }
  return { key, contentType };
}

export async function readImage(key: string): Promise<{ data: Buffer; contentType: string }> {
  if (!/^[0-9a-f-]{36}\/(scans|progress|labels)\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/.test(key)) throw new ApiError(400, "Bad file key");
  let data: Buffer;
  if (driver() === "s3") {
    const { client, url } = s3();
    const res = await client.fetch(url(key));
    if (res.status === 404) throw new ApiError(404, "File not found");
    if (!res.ok) throw new Error(`S3 read failed: ${res.status}`);
    data = Buffer.from(await res.arrayBuffer());
  } else {
    try {
      data = await fs.readFile(path.join(LOCAL_ROOT, key));
    } catch {
      throw new ApiError(404, "File not found");
    }
  }
  return { data, contentType: sniffImageType(data) ?? "application/octet-stream" };
}

export async function deleteImage(key: string) {
  if (driver() === "s3") {
    const { client, url } = s3();
    await client.fetch(url(key), { method: "DELETE" });
  } else {
    await fs.rm(path.join(LOCAL_ROOT, key), { force: true });
  }
}

export async function deleteAllForUser(userId: string, keys: string[]) {
  if (driver() === "local") await fs.rm(path.join(LOCAL_ROOT, userId), { recursive: true, force: true });
  else for (const k of keys) await deleteImage(k);
}
