import { NextResponse } from "next/server";
import { destroySession } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/api";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
