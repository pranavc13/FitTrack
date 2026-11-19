import { route } from "@/lib/server/api";
import { getProfileBundle } from "@/lib/services/profile";
import { aiConfigured } from "@/lib/ai/client";
import { userToday } from "@/lib/server/context";

export const GET = route(async ({ db, user }) => {
  const [bundle, ctx] = await Promise.all([getProfileBundle(db, user.id), userToday(db, user.id)]);
  return { ...bundle, today: ctx.today, timezone: ctx.tz, aiEnabled: aiConfigured(), pushEnabled: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) };
});
