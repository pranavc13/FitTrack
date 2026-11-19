import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { schema as s } from "@/db";
import { ApiError, body, route } from "@/lib/server/api";
import { deleteAccount, exportAllData } from "@/lib/services/account";
import { verifyPassword, destroySession } from "@/lib/server/auth";

/** Full data export (JSON). */
export const GET = route(async ({ db, user }) => {
  const data = await exportAllData(db, user.id);
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="fittrack-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
}, { limit: 5 });

/** Permanent account deletion (requires password). */
export const DELETE = route(async ({ db, user, req }) => {
  const { password } = await body(req, z.object({ password: z.string().min(1) }));
  const [row] = await db.select().from(s.users).where(eq(s.users.id, user.id));
  if (!row || !(await verifyPassword(password, row.passwordHash))) throw new ApiError(403, "Password is incorrect");
  await deleteAccount(db, user.id);
  await destroySession();
  return { deleted: true };
}, { limit: 5 });
