import { NextResponse } from "next/server";
import { ApiError, route } from "@/lib/server/api";
import { readImage } from "@/lib/storage";

/** Serves private images to their owner only. */
export const GET = route<{ key: string[] }>(async ({ user, params }) => {
  const key = params.key.join("/");
  if (!key.startsWith(user.id + "/")) throw new ApiError(404, "File not found");
  const { data, contentType } = await readImage(key);
  return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}, { limit: 600 });
