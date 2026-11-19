import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { addDays, todayIn } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { round } from "@/lib/nutrition/engine";
import { adaptiveTdee } from "@/lib/analytics/trends";
import { AI_MODEL, FALLBACK_BETA, getAnthropic, mapAiError } from "./client";
import { getDay } from "@/lib/services/diary";
import { getRange } from "@/lib/services/summary";
import { getProfileBundle } from "@/lib/services/profile";
import { weightAnalysis, weightHistory, measurementHistory } from "@/lib/services/body";
import { fibreGap, hiddenCalories, nutritionScore, proteinGap } from "@/lib/services/insights";
import { searchFoods } from "@/lib/services/foods";
import { listRecipes } from "@/lib/services/recipes";
import { listActivities } from "@/lib/services/activity";
import { nextWorkoutSuggestion, personalRecords, workoutHistory } from "@/lib/services/workouts";
import { activeGoal } from "@/lib/services/goals";

const SYSTEM = `You are FitTrack AI's coach: a knowledgeable, encouraging fitness and nutrition coach for an Indian user.

Grounding rules (critical):
- Every number about the user (calories, protein, weight, workouts, steps, sleep) MUST come from a tool result in this conversation. Never invent, estimate or assume logged data. If data is missing, say so and suggest logging it.
- Nutrition values for foods must come from the search_foods or find_recipes tools, not memory.
- Calculations are done by the backend tools; quote their results rather than recomputing.
- Distinguish estimates (calorie burn, BMR/TDEE, portion estimates) from measured values.

Safety:
- You are not a doctor. Do not diagnose conditions or recommend medication or supplements as treatment. For pain, injury, pregnancy, eating-disorder signs, diabetes/heart conditions or extreme fatigue, recommend a qualified professional.
- Never recommend crash diets, intakes below the user's BMR, fasting beyond 24 h, or dehydration. Spot reduction of fat is not possible.

Style: concise, practical, mobile-friendly (short paragraphs or bullets), metric units, Indian food examples that fit the user's diet preference. End with one clear next action when helpful.`;

export function coachTools(db: Db, userId: string, today: string) {
  const dateArg = z.string().describe("YYYY-MM-DD");
  return [
    betaZodTool({
      name: "get_profile_and_targets",
      description: "User profile (age, height, diet preference, allergies, goal) and current daily targets with how they were calculated (BMR, baseline, TDEE).",
      inputSchema: z.object({}),
      run: async () => {
        const b = await getProfileBundle(db, userId);
        const goal = await activeGoal(db, userId);
        return JSON.stringify({ today, name: b.user?.name, profile: b.profile, targets: b.targets, activeGoal: goal ? { type: goal.goal.type, startDate: goal.goal.startDate, startWeightKg: goal.goal.startWeightKg, targetWeightKg: goal.goal.targetWeightKg, progress: goal.progress, milestones: goal.milestones.map((m) => ({ title: m.title, achieved: Boolean(m.achievedAt) })) } : null });
      },
    }),
    betaZodTool({
      name: "get_day_log",
      description: "Everything logged on one day: meals with each food entry and nutrients, day totals, activities, steps, water and sleep.",
      inputSchema: z.object({ date: dateArg }),
      run: async ({ date }) => {
        const [day, range, acts] = await Promise.all([getDay(db, userId, date), getRange(db, userId, date, date), listActivities(db, userId, date, date)]);
        return JSON.stringify({
          date,
          meals: day.meals.map((m) => ({ meal: m.name, items: m.entries.map((e) => ({ name: e.name, grams: e.grams, kcal: round(e.kcal, 0), proteinG: round(e.proteinG, 1), dataQuality: e.dataQuality })), totals: m.totals })),
          totals: day.totals,
          activities: acts.map((a) => ({ name: a.name, minutes: a.durationMin, distanceKm: a.distanceKm, netKcalEstimate: round(a.netKcal, 0) })),
          summary: range[0],
        });
      },
    }),
    betaZodTool({
      name: "get_daily_summaries",
      description: "Per-day totals over a date range (max 120 days): intake, macros, fibre, exercise net kcal (estimate), steps, water, sleep, estimated expenditure, and whether food was logged.",
      inputSchema: z.object({ from: dateArg, to: dateArg }),
      run: async ({ from, to }) => {
        if (from > to) return "Error: from must be before to";
        const start = from < addDays(to, -120) ? addDays(to, -120) : from;
        const rows = await getRange(db, userId, start, to);
        const logged = rows.filter((r) => r.logged);
        const avg = (k: keyof (typeof rows)[number]) => (logged.length ? round(logged.reduce((a, r) => a + Number(r[k]), 0) / logged.length, 0) : null);
        return JSON.stringify({ from: start, to, daysLogged: logged.length, days: rows.length, averagesOnLoggedDays: { kcalIn: avg("kcalIn"), proteinG: avg("proteinG"), fibreG: avg("fibreG"), expenditure: avg("expenditure"), steps: avg("steps") }, rows });
      },
    }),
    betaZodTool({
      name: "get_weight_and_body_trends",
      description: "Weight history with smoothed trend weight, plateau analysis, estimated time-to-target range, body measurements, and an intake-based adaptive maintenance estimate when enough data exists.",
      inputSchema: z.object({ days: z.number().describe("History window in days, e.g. 90") }),
      run: async ({ days }) => {
        const [history, analysis, measures] = await Promise.all([weightHistory(db, userId, Math.min(days, 365)), weightAnalysis(db, userId), measurementHistory(db, userId)]);
        const intake = (await getRange(db, userId, addDays(today, -28), today)).filter((r) => r.logged).map((r) => ({ date: r.date, value: r.kcalIn }));
        const tdee = adaptiveTdee(intake, history.map((h) => ({ date: h.date, value: h.weightKg })));
        return JSON.stringify({ history: history.slice(-60), analysis, adaptiveMaintenance: tdee, measurements: measures.slice(-12) });
      },
    }),
    betaZodTool({
      name: "get_nutrition_insights",
      description: "For a date: remaining protein and fibre with diet-appropriate food suggestions (from the database), the transparent nutrition score, and hidden calories (oil/ghee/sugar/drinks) over the past 7 days.",
      inputSchema: z.object({ date: dateArg }),
      run: async ({ date }) => {
        const [p, f, sc, h] = await Promise.all([proteinGap(db, userId, date), fibreGap(db, userId, date), nutritionScore(db, userId, date), hiddenCalories(db, userId, addDays(date, -6), date)]);
        return JSON.stringify({ protein: p, fibre: f, score: sc, hiddenCaloriesLast7Days: h });
      },
    }),
    betaZodTool({
      name: "search_foods",
      description: "Search the food database (USDA-based + Indian recipe calculations) by English, Hindi or regional name. Returns per-100 g nutrition and default serving.",
      inputSchema: z.object({ query: z.string() }),
      run: async ({ query }) => JSON.stringify((await searchFoods(db, userId, query, { limit: 6 })).map((f) => ({ id: f.id, name: f.name, kcal100: f.kcal, protein100: f.proteinG, carbs100: f.carbsG, fat100: f.fatG, fibre100: f.fibreG, serving: f.defaultServing, dataQuality: f.dataQuality }))),
    }),
    betaZodTool({
      name: "find_recipes",
      description: "Find recipes in the library with per-serving nutrition, filtered by the user's diet. Use for meal suggestions.",
      inputSchema: z.object({ query: z.string().describe("Dish name or ingredient; empty for all"), highProtein: z.boolean(), region: z.string().describe("e.g. 'South Indian' or empty") }),
      run: async ({ query, highProtein, region }) => {
        const b = await getProfileBundle(db, userId);
        const list = await listRecipes(db, userId, { q: query || undefined, diet: b.profile?.dietPreference, highProtein, region: region || undefined, limit: 40 });
        return JSON.stringify(list.slice(0, 15).map((r) => ({ id: r.id, name: r.name, region: r.region, style: r.style, serving: r.servingLabel, perServing: r.perServing })));
      },
    }),
    betaZodTool({
      name: "get_training",
      description: "Workout history (last N days), personal records, active plan and the recovery-aware suggestion for the next session.",
      inputSchema: z.object({ days: z.number() }),
      run: async ({ days }) => {
        const [hist, prs, next, acts] = await Promise.all([workoutHistory(db, userId, addDays(today, -Math.min(days, 180))), personalRecords(db, userId), nextWorkoutSuggestion(db, userId, today), listActivities(db, userId, addDays(today, -Math.min(days, 180)), today)]);
        return JSON.stringify({ workouts: hist.slice(0, 30), personalRecords: prs.slice(0, 30), nextSuggestion: next.suggestion ? { day: next.suggestion.day, focus: next.suggestion.focus, reason: next.reason } : { reason: next.reason }, otherActivities: acts.filter((a) => a.source !== "workout").slice(0, 30).map((a) => ({ date: a.date, name: a.name, minutes: a.durationMin, km: a.distanceKm, netKcal: round(a.netKcal, 0) })) });
      },
    }),
  ];
}

export async function listConversations(db: Db, userId: string) {
  return db.select().from(s.aiConversations).where(eq(s.aiConversations.userId, userId)).orderBy(desc(s.aiConversations.updatedAt)).limit(30);
}

export async function getConversation(db: Db, userId: string, id: number) {
  const [conv] = await db.select().from(s.aiConversations).where(and(eq(s.aiConversations.id, id), eq(s.aiConversations.userId, userId)));
  if (!conv) throw new ApiError(404, "Conversation not found");
  const messages = await db.select().from(s.aiMessages).where(eq(s.aiMessages.conversationId, id)).orderBy(asc(s.aiMessages.createdAt));
  return { conversation: conv, messages };
}

export async function deleteConversation(db: Db, userId: string, id: number) {
  await db.delete(s.aiConversations).where(and(eq(s.aiConversations.id, id), eq(s.aiConversations.userId, userId)));
}

/** Runs one coach turn with tool use; persists the user message, the answer and the tools used. */
export async function coachReply(db: Db, userId: string, input: { conversationId?: number | null; message: string }) {
  const [prefs] = await db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, userId));
  const today = todayIn(prefs?.timezone);
  let conversationId = input.conversationId ?? null;
  if (conversationId) await getConversation(db, userId, conversationId);
  else {
    const [conv] = await db.insert(s.aiConversations).values({ userId, title: input.message.slice(0, 60) }).returning();
    conversationId = conv!.id;
  }
  const history = await db.select().from(s.aiMessages).where(eq(s.aiMessages.conversationId, conversationId)).orderBy(asc(s.aiMessages.createdAt));
  const messages: Anthropic.Beta.BetaMessageParam[] = history.slice(-20).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  messages.push({ role: "user", content: `${input.message}\n\n(Today is ${today}.)` });
  await db.insert(s.aiMessages).values({ conversationId, role: "user", content: input.message });

  const toolCalls: { name: string; input: unknown }[] = [];
  let text = "";
  try {
    const runner = getAnthropic().beta.messages.toolRunner({
      model: AI_MODEL,
      max_tokens: 8000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium" },
      max_iterations: 8,
      tools: coachTools(db, userId, today),
      messages,
    });
    for await (const message of runner) {
      for (const block of message.content) if (block.type === "tool_use") toolCalls.push({ name: block.name, input: block.input });
    }
    const final = await runner.done();
    if (final.stop_reason === "refusal") text = "I can't help with that request. If it's about a health condition, please talk to a qualified professional.";
    else text = final.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!text) text = "Sorry — I couldn't produce an answer. Please try rephrasing.";
  } catch (e) {
    mapAiError(e);
  }
  const [saved] = await db.insert(s.aiMessages).values({ conversationId, role: "assistant", content: text, toolCalls }).returning();
  await db.update(s.aiConversations).set({ updatedAt: new Date() }).where(eq(s.aiConversations.id, conversationId));
  return { conversationId, message: saved! };
}
