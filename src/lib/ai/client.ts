import { ApiError as GenAIApiError, FinishReason, GoogleGenAI, ThinkingLevel, type GenerateContentResponse, type Part } from "@google/genai";
import { z } from "zod/v4";
import { ApiError } from "@/lib/errors";

/**
 * Models tried in order. Google's full Flash models are often overloaded (HTTP 503/504), while the
 * Flash-Lite models stay responsive, so a request falls through best → most available. Override with
 * GEMINI_MODEL (comma-separated). gemini-1.5/2.x are retired or closed to new API keys.
 */
export const MODEL_CHAIN = (process.env.GEMINI_MODEL || "gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
export const AI_MODEL = MODEL_CHAIN[0]!;
const ATTEMPT_TIMEOUT_MS = 30_000;

let client: GoogleGenAI | null = null;

const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

export function aiConfigured() {
  return Boolean(apiKey());
}

export function getGenAI(): GoogleGenAI {
  if (!aiConfigured()) throw new ApiError(503, "AI features are not configured on this server (missing GEMINI_API_KEY). Manual logging still works.");
  // No SDK-internal retries: the fallback chain below decides what to try next.
  client ??= new GoogleGenAI({ apiKey: apiKey(), httpOptions: { timeout: ATTEMPT_TIMEOUT_MS, retryOptions: { attempts: 1 } } });
  return client;
}

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

/** Overloaded, rate-limited, missing or timed-out → try the next model. */
function isRetryable(e: unknown) {
  if (e instanceof GenAIApiError) return [404, 408, 429, 500, 502, 503, 504].includes(e.status);
  const name = (e as { name?: string })?.name ?? "";
  return /abort|timeout/i.test(name) || /timed? ?out|ECONNRESET|fetch failed/i.test((e as Error)?.message ?? "");
}

/** Models that just failed are tried last for a while, so later requests don't wait on them again. */
const COOLDOWN_MS = 2 * 60_000;
const cooldownUntil = new Map<string, number>();

/**
 * generateContent with model fallback: tries `prefer` (if given), then healthy models, then models on
 * cooldown — one pass, each attempt capped at ATTEMPT_TIMEOUT_MS. Returns the response and the model
 * that answered.
 */
export async function generateWithFallback(params: Omit<GenerateParams, "model">, prefer?: string): Promise<{ res: GenerateContentResponse; model: string }> {
  const ai = getGenAI();
  const now = Date.now();
  const healthy = (m: string) => (cooldownUntil.get(m) ?? 0) <= now;
  const ordered = [...MODEL_CHAIN.filter(healthy), ...MODEL_CHAIN.filter((m) => !healthy(m))];
  const models = prefer ? [prefer, ...ordered.filter((m) => m !== prefer)] : ordered;
  let last: unknown;
  for (const model of models) {
    try {
      const res = await ai.models.generateContent({ ...params, model });
      cooldownUntil.delete(model);
      return { res, model };
    } catch (e) {
      last = e;
      if (!isRetryable(e)) mapAiError(e);
      cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
      console.warn(`[ai] ${model} unavailable (${e instanceof GenAIApiError ? e.status : (e as Error)?.name}); trying next`);
    }
  }
  if (last instanceof GenAIApiError && (last.status === 503 || last.status === 429)) {
    throw new ApiError(503, "Google's AI models are busy right now. Please try again in a minute — or log this manually.");
  }
  mapAiError(last);
}

export type ImageInput = { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };

export function imageParts(images: ImageInput[]): Part[] {
  return images.map((img) => ({ inlineData: { mimeType: img.mediaType, data: img.base64 } }));
}

export type Effort = "low" | "medium" | "high";
export const thinkingLevel = (e: Effort) => (e === "high" ? ThinkingLevel.HIGH : e === "medium" ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW);

/**
 * Converts a Zod schema to the JSON Schema subset Gemini accepts: drops `$schema`, and rewrites
 * `anyOf: [X, {type: "null"}]` (Zod's encoding of nullable) into `type: [X, "null"]`.
 */
export function toGeminiSchema(schema: z.ZodType): unknown {
  const clean = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(clean);
    if (!node || typeof node !== "object") return node;
    const obj = { ...(node as Record<string, unknown>) };
    delete obj.$schema;
    const anyOf = obj.anyOf as Record<string, unknown>[] | undefined;
    if (anyOf?.length === 2 && anyOf.some((s) => s.type === "null")) {
      const other = anyOf.find((s) => s.type !== "null")!;
      delete obj.anyOf;
      Object.assign(obj, clean(other) as Record<string, unknown>);
      obj.type = [other.type as string, "null"];
    }
    for (const [k, v] of Object.entries(obj)) if (k !== "type") obj[k] = clean(v);
    return obj;
  };
  return clean(z.toJSONSchema(schema));
}

/** Maps SDK/HTTP errors to user-facing API errors. */
export function mapAiError(e: unknown): never {
  if (e instanceof ApiError) throw e;
  if (e instanceof GenAIApiError) {
    if (e.status === 401 || e.status === 403) throw new ApiError(503, "The AI service rejected the server's Gemini API key.");
    if (e.status === 429) throw new ApiError(429, "The AI service is busy or the free quota is used up — try again shortly.");
    if (e.status === 400) throw new ApiError(400, "The AI service could not process this request (image too large or unsupported?).");
    throw new ApiError(502, `AI service error (${e.status}).`);
  }
  if (e instanceof TypeError && /fetch/i.test(e.message)) throw new ApiError(503, "Could not reach the AI service. Check your internet connection.");
  throw e;
}

const BLOCKED = new Set<string>([FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.BLOCKLIST, FinishReason.SPII, FinishReason.RECITATION]);

/** Throws a user-facing error when Gemini blocked or truncated a response. */
export function checkFinish(res: GenerateContentResponse) {
  if (res.promptFeedback?.blockReason) throw new ApiError(422, "The AI declined to analyse this input. Please log it manually.");
  const reason = res.candidates?.[0]?.finishReason;
  if (reason && BLOCKED.has(reason)) throw new ApiError(422, "The AI declined to analyse this input. Please log it manually.");
  if (reason === FinishReason.MAX_TOKENS) throw new ApiError(502, "The AI response was cut off — try fewer items or images.");
}

/**
 * One structured-output call (JSON mode with a response schema). The JSON is re-validated with Zod,
 * so callers always get schema-correct data or a clear error.
 */
export async function structuredCall<T extends z.ZodType>(opts: {
  system: string;
  parts: Part[];
  schema: T;
  effort?: Effort;
  maxTokens?: number;
}): Promise<{ data: z.infer<T>; model: string }> {
  const { res, model } = await generateWithFallback({
    contents: [{ role: "user", parts: opts.parts }],
    config: {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseJsonSchema: toGeminiSchema(opts.schema),
      maxOutputTokens: opts.maxTokens ?? 16000,
      thinkingConfig: { thinkingLevel: thinkingLevel(opts.effort ?? "medium") },
    },
  });
  checkFinish(res);
  let json: unknown;
  try {
    json = JSON.parse(res.text ?? "");
  } catch {
    throw new ApiError(502, "The AI returned an unreadable result. Please try again.");
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) throw new ApiError(502, "The AI returned an incomplete result. Please try again.");
  return { data: parsed.data, model: res.modelVersion ?? model };
}
