import { z } from "zod/v4";
import { ApiError, body, route } from "@/lib/server/api";
import { coachReply, listConversations } from "@/lib/ai/coach";
import { aiConfigured } from "@/lib/ai/client";

export const maxDuration = 120;

export const GET = route(async ({ db, user }) => ({ conversations: await listConversations(db, user.id), enabled: aiConfigured() }));
export const POST = route(
  async ({ db, user, req }) => {
    if (!aiConfigured()) throw new ApiError(503, "The AI coach is not configured on this server (missing GEMINI_API_KEY).");
    return coachReply(db, user.id, await body(req, z.object({ conversationId: z.number().int().positive().nullable().optional(), message: z.string().trim().min(1).max(2000) })));
  },
  { limit: 15 },
);
