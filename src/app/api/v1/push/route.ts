import { z } from "zod/v4";
import { body, route } from "@/lib/server/api";
import { pushConfigured, removeSubscription, saveSubscription, sendToUser } from "@/lib/services/push";

const Sub = z.object({ endpoint: z.url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export const POST = route(async ({ db, user, req }) => {
  await saveSubscription(db, user.id, await body(req, Sub));
  return { ok: true, configured: pushConfigured() };
});
export const DELETE = route(async ({ db, user, req }) => {
  await removeSubscription(db, user.id, (await body(req, z.object({ endpoint: z.string().max(1000) }))).endpoint);
  return { ok: true };
});
/** Sends a test notification to the current user's devices. */
export const PUT = route(async ({ db, user }) => ({ sent: await sendToUser(db, user.id, { title: "FitTrack AI", body: "Notifications are working ✅", url: "/home" }) }), { limit: 5 });
