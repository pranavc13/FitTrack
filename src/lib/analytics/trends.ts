/**
 * Trend analytics over noisy daily data (body weight fluctuates 0.5–2 kg day to day from water,
 * glycogen and gut content). We smooth with an exponentially weighted moving average and estimate
 * rates with least-squares regression on the smoothed series.
 */

export interface Point {
  date: string; // YYYY-MM-DD
  value: number;
}

const DAY_MS = 86_400_000;
export const dayIndex = (d: string) => Math.round(Date.parse(d + "T00:00:00Z") / DAY_MS);

/** EWMA "trend weight" (alpha 0.1 ≈ 10-day smoothing), gap-aware. */
export function ewma(points: Point[], alpha = 0.1): Point[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const out: Point[] = [];
  let prev: { day: number; value: number } | null = null;
  for (const p of sorted) {
    const day = dayIndex(p.date);
    if (!prev) prev = { day, value: p.value };
    else {
      // Apply decay for each elapsed day so gaps don't overweight the next reading.
      const gap = Math.max(1, day - prev.day);
      const a = 1 - (1 - alpha) ** gap;
      prev = { day, value: prev.value + a * (p.value - prev.value) };
    }
    out.push({ date: p.date, value: prev.value });
  }
  return out;
}

export interface Regression {
  slopePerDay: number;
  intercept: number;
  r2: number;
  n: number;
  /** Standard error of the slope (per day). */
  slopeSE: number;
}

export function linearRegression(points: Point[]): Regression | null {
  if (points.length < 3) return null;
  const xs = points.map((p) => dayIndex(p.date));
  const ys = points.map((p) => p.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const ssRes = ys.reduce((acc, y, i) => acc + (y - (intercept + slope * xs[i]!)) ** 2, 0);
  const r2 = syy === 0 ? 1 : 1 - ssRes / syy;
  const slopeSE = n > 2 ? Math.sqrt(ssRes / (n - 2) / sxx) : 0;
  return { slopePerDay: slope, intercept, r2, n, slopeSE };
}

export function lastNDays(points: Point[], n: number, until?: string): Point[] {
  if (!points.length) return [];
  const end = until ? dayIndex(until) : Math.max(...points.map((p) => dayIndex(p.date)));
  return points.filter((p) => dayIndex(p.date) > end - n && dayIndex(p.date) <= end);
}

export interface PlateauAnalysis {
  status: "insufficient_data" | "progressing" | "plateau" | "moving_away";
  weeklyRateKg: number | null;
  windowDays: number;
  readings: number;
  message: string;
}

/**
 * Plateau = trend weight changed by < 0.1 kg/week over ≥ 21 days with enough readings,
 * while the goal direction is loss (or gain). Short stalls (< 3 weeks) are normal noise.
 */
export function detectPlateau(weights: Point[], direction: "loss" | "gain" | "maintain", windowDays = 21): PlateauAnalysis {
  const window = lastNDays(weights, windowDays);
  if (window.length < 8) {
    return {
      status: "insufficient_data",
      weeklyRateKg: null,
      windowDays,
      readings: window.length,
      message: `Need at least 8 weigh-ins in the last ${windowDays} days for a reliable trend (have ${window.length}).`,
    };
  }
  const smoothed = ewma(weights).filter((p) => window.some((w) => w.date === p.date));
  const reg = linearRegression(smoothed);
  const weekly = reg ? reg.slopePerDay * 7 : 0;
  if (direction === "maintain") {
    return { status: "progressing", weeklyRateKg: weekly, windowDays, readings: window.length, message: "Maintenance goal — weight trend is being tracked." };
  }
  const towards = direction === "loss" ? -weekly : weekly;
  if (Math.abs(weekly) < 0.1) {
    return { status: "plateau", weeklyRateKg: weekly, windowDays, readings: window.length, message: `Trend weight has changed less than 0.1 kg/week over ${windowDays} days.` };
  }
  if (towards < 0) {
    return { status: "moving_away", weeklyRateKg: weekly, windowDays, readings: window.length, message: `Trend is moving ${direction === "loss" ? "up" : "down"} (${weekly.toFixed(2)} kg/week).` };
  }
  return { status: "progressing", weeklyRateKg: weekly, windowDays, readings: window.length, message: `Trending ${weekly.toFixed(2)} kg/week toward your goal.` };
}

/** ≈7700 kcal per kg of body-mass change (classic approximation; real-world value varies). */
export const KCAL_PER_KG = 7700;

export interface AdaptiveTdee {
  estimate: number | null;
  daysUsed: number;
  loggedDays: number;
  reason: string;
}

/**
 * Back-calculates maintenance from intake and trend-weight change:
 *   TDEE ≈ mean intake − (Δtrend kg × 7700) ÷ days
 * Requires ≥ 14 days with ≥ 80% of days fully logged; otherwise returns null with the reason.
 */
export function adaptiveTdee(intake: Point[], weights: Point[], windowDays = 28): AdaptiveTdee {
  const recentWeights = lastNDays(weights, windowDays);
  if (!recentWeights.length) return { estimate: null, daysUsed: 0, loggedDays: 0, reason: "No weigh-ins in window" };
  const lastDay = recentWeights[recentWeights.length - 1]!.date;
  const intakeWindow = lastNDays(intake, windowDays, lastDay).filter((p) => p.value > 0);
  const span = recentWeights.length > 1 ? dayIndex(lastDay) - dayIndex(recentWeights[0]!.date) : 0;
  if (span < 14) return { estimate: null, daysUsed: span, loggedDays: intakeWindow.length, reason: "Need at least 14 days between first and last weigh-in" };
  if (intakeWindow.length < Math.min(windowDays, span + 1) * 0.8) {
    return { estimate: null, daysUsed: span, loggedDays: intakeWindow.length, reason: "Food logged on fewer than 80% of days — estimate would be unreliable" };
  }
  const trend = ewma(weights).filter((p) => recentWeights.some((w) => w.date === p.date));
  const reg = linearRegression(trend);
  if (!reg) return { estimate: null, daysUsed: span, loggedDays: intakeWindow.length, reason: "Not enough data for a trend" };
  const meanIntake = intakeWindow.reduce((a, p) => a + p.value, 0) / intakeWindow.length;
  const estimate = meanIntake - reg.slopePerDay * KCAL_PER_KG;
  return { estimate: Math.round(estimate), daysUsed: span, loggedDays: intakeWindow.length, reason: "Based on logged intake and trend weight" };
}

export interface ProgressPrediction {
  weeksLow: number | null;
  weeksHigh: number | null;
  weeklyRateKg: number | null;
  basis: string;
}

/**
 * Estimated weeks to reach a target weight, as a range (rate ± 1.5 SE, and never assuming more than
 * 1 kg/week). Returns nulls if the trend is flat or moving away.
 */
export function predictWeeksToTarget(weights: Point[], targetKg: number): ProgressPrediction {
  const recent = lastNDays(weights, 42);
  if (recent.length < 6) return { weeksLow: null, weeksHigh: null, weeklyRateKg: null, basis: "Need ≥ 6 weigh-ins in the last 6 weeks" };
  const trend = ewma(weights).filter((p) => recent.some((w) => w.date === p.date));
  const reg = linearRegression(trend);
  const current = trend[trend.length - 1]!.value;
  if (!reg) return { weeksLow: null, weeksHigh: null, weeklyRateKg: null, basis: "No trend" };
  const remaining = targetKg - current;
  const rate = reg.slopePerDay * 7;
  if (Math.abs(remaining) < 0.2) return { weeksLow: 0, weeksHigh: 0, weeklyRateKg: rate, basis: "At target" };
  if (Math.sign(rate) !== Math.sign(remaining) || Math.abs(rate) < 0.05) {
    return { weeksLow: null, weeksHigh: null, weeklyRateKg: rate, basis: "Current trend is not moving toward the target" };
  }
  const se = reg.slopeSE * 7 * 1.5;
  const fast = Math.min(Math.abs(rate) + se, 1);
  const slow = Math.max(Math.abs(rate) - se, Math.abs(rate) * 0.5, 0.05);
  return {
    weeksLow: Math.ceil(Math.abs(remaining) / fast),
    weeksHigh: Math.ceil(Math.abs(remaining) / slow),
    weeklyRateKg: rate,
    basis: `Trend over ${recent.length} weigh-ins (${rate.toFixed(2)} kg/week). Estimate only — rates usually slow over time.`,
  };
}

/** Current streak of consecutive days (ending today or yesterday) present in `dates`. */
export function streak(dates: string[], today: string): number {
  const set = new Set(dates);
  let d = dayIndex(today);
  if (!set.has(today)) d -= 1;
  let count = 0;
  while (set.has(new Date(d * DAY_MS).toISOString().slice(0, 10))) {
    count++;
    d--;
  }
  return count;
}
