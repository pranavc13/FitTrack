import { ApiError as GenAIApiError, FinishReason, GoogleGenAI, ThinkingLevel, type GenerateContentResponse, type Part } from "@google/genai";
import { z } from "zod/v4";
import { ApiError } from "@/lib/errors";

/** Default: current stable Gemini Flash (fast, low-cost, multimodal). Override with GEMINI_MODEL. */
export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

let client: GoogleGenAI | null = null;

const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

export function aiConfigured() {
  return Boolean(apiKey());
}

export function getGenAI(): GoogleGenAI {
  if (!aiConfigured()) throw new ApiError(503, "AI features are not configured on this server (missing GEMINI_API_KEY). Manual logging still works.");
  client ??= new GoogleGenAI({ apiKey: apiKey() });
  return client;
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
  let res: GenerateContentResponse;
  try {
    res = await getGenAI().models.generateContent({
      model: AI_MODEL,
      contents: [{ role: "user", parts: opts.parts }],
      config: {
        systemInstruction: opts.system,
        responseMimeType: "application/json",
        responseJsonSchema: toGeminiSchema(opts.schema),
        maxOutputTokens: opts.maxTokens ?? 16000,
        thinkingConfig: { thinkingLevel: thinkingLevel(opts.effort ?? "medium") },
      },
    });
  } catch (e) {
    mapAiError(e);
  }
  checkFinish(res);
  let json: unknown;
  try {
    json = JSON.parse(res.text ?? "");
  } catch {
    throw new ApiError(502, "The AI returned an unreadable result. Please try again.");
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) throw new ApiError(502, "The AI returned an incomplete result. Please try again.");
  return { data: parsed.data, model: res.modelVersion ?? AI_MODEL };
}
