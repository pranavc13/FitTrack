import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmt = {
  int: (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : Math.round(n).toLocaleString("en-IN")),
  dec: (n: number | null | undefined, dp = 1) => (n == null || !Number.isFinite(n) ? "—" : (Math.round(n * 10 ** dp) / 10 ** dp).toLocaleString("en-IN", { maximumFractionDigits: dp })),
  kcal: (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n).toLocaleString("en-IN")} kcal`),
  g: (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 10) / 10} g`),
  litres: (ml: number) => `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)} L`,
  minutes: (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`),
  pct: (v: number) => `${Math.round(v * 100)}%`,
};

export const MEAL_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  morning_snack: "Morning snack",
  lunch: "Lunch",
  evening_snack: "Evening snack",
  dinner: "Dinner",
  pre_workout: "Pre-workout",
  post_workout: "Post-workout",
  custom: "Custom",
};

/** Default meal for the current local hour. */
export function mealForHour(h = new Date().getHours()) {
  if (h < 11) return "breakfast";
  if (h < 12) return "morning_snack";
  if (h < 16) return "lunch";
  if (h < 19) return "evening_snack";
  return "dinner";
}

export const QUALITY_LABEL: Record<string, { label: string; tone: string }> = {
  verified: { label: "Verified data", tone: "text-lime" },
  calculated: { label: "Calculated from ingredients", tone: "text-cyan" },
  crowdsourced: { label: "Crowd-sourced label", tone: "text-blue" },
  user: { label: "User-entered", tone: "text-purple" },
  estimated: { label: "Estimate", tone: "text-orange" },
  ocr: { label: "OCR — unconfirmed", tone: "text-orange" },
};

export function localToday(): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** UUID that also works on plain-http origins (e.g. phone on LAN), where crypto.randomUUID is missing. */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
