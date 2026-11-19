import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";
import { ApiError } from "@/lib/errors";

export const AI_MODEL = process.env.AI_MODEL || "claude-opus-5-5";
/** Server-side refusal fallback (routes declined requests to Anthropic's recommended fallback model). */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function getAnthropic(): Anthropic {
  if (!aiConfigured()) throw new ApiError(503, "AI features are not configured on this server (missing ANTHROPIC_API_KEY). Manual logging still works.");
  client ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return client;
}

export type ImageInput = { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };

export function imageBlocks(images: ImageInput[]): Anthropic.Beta.BetaImageBlockParam[] {
  return images.map((img) => ({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } }));
}

/** Maps SDK errors to user-facing API errors (most specific first). */
export function mapAiError(e: unknown): never {
  if (e instanceof ApiError) throw e;
  if (e instanceof Anthropic.AuthenticationError) throw new ApiError(503, "The AI service rejected the server's API key.");
  if (e instanceof Anthropic.RateLimitError) throw new ApiError(429, "The AI service is busy — try again in a minute.");
  if (e instanceof Anthropic.BadRequestError) throw new ApiError(400, "The AI service could not process this request (image too large or unsupported?).");
  if (e instanceof Anthropic.APIConnectionError) throw new ApiError(503, "Could not reach the AI service. Check your internet connection.");
  if (e instanceof Anthropic.APIError) throw new ApiError(502, `AI service error (${e.status ?? "unknown"}).`);
  throw e;
}

/**
 * One structured-output call. Returns the parsed object or throws a user-facing error when the model
 * refuses, truncates or returns something that does not match the schema.
 */
export async function structuredCall<T extends z.ZodType>(opts: {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: T;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<{ data: z.infer<T>; model: string }> {
  try {
    const res = await getAnthropic().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
      output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
    });
    if (res.stop_reason === "refusal") throw new ApiError(422, "The AI declined to analyse this input. Please log it manually.");
    if (res.stop_reason === "max_tokens") throw new ApiError(502, "The AI response was cut off — try fewer items or images.");
    if (!res.parsed_output) throw new ApiError(502, "The AI returned an unreadable result. Please try again.");
    return { data: res.parsed_output as z.infer<T>, model: res.model };
  } catch (e) {
    mapAiError(e);
  }
}
