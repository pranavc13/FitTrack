/**
 * Checks the configured Gemini key: lists the models it can use and times a small request on each
 * candidate (with low thinking, as the app uses for quick scans).
 * Usage: npx tsx scripts/check-gemini.ts [model ...]
 */
import { config } from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

config({ path: ".env.local" });
const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY is not set in .env.local");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: key });

try {
  const names: string[] = [];
  const pager = await ai.models.list({ config: { pageSize: 200 } });
  for await (const m of pager) if (m.name && (m.supportedActions ?? []).includes("generateContent")) names.push(m.name.replace(/^models\//, ""));
  console.log("Flash models available to this key:", names.filter((m) => /flash/.test(m)).join(", "));
} catch (e) {
  console.log("Model listing failed:", (e as Error).message.slice(0, 300));
}

const candidates = process.argv.slice(2).length ? process.argv.slice(2) : ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"];
for (const model of candidates) {
  for (const attempt of [1, 2]) {
    const t = Date.now();
    try {
      const r = await ai.models.generateContent({
        model,
        contents: "Reply with exactly: OK",
        config: { maxOutputTokens: 300, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      });
      console.log(`✓ ${model} #${attempt}: "${(r.text ?? "").trim().slice(0, 20)}" in ${((Date.now() - t) / 1000).toFixed(1)} s`);
    } catch (e) {
      console.log(`✗ ${model} #${attempt}: ${(e as Error).message.replace(/\s+/g, " ").slice(0, 200)}`);
      break;
    }
  }
}
