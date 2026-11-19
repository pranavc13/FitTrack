/**
 * MET-based energy expenditure (Compendium of Physical Activities methodology).
 *   gross kcal = MET × 3.5 × kg ÷ 200 × minutes
 *   net kcal   = (MET − 1) × 3.5 × kg ÷ 200 × minutes   (excludes the resting energy already in BMR)
 * Net kcal is what gets added to the daily energy balance, so resting energy isn't counted twice.
 * These are population estimates (±20–30% for an individual), not measurements.
 */

export function grossKcal(met: number, weightKg: number, minutes: number): number {
  validate(met, weightKg, minutes);
  return (met * 3.5 * weightKg * minutes) / 200;
}

export function netKcal(met: number, weightKg: number, minutes: number): number {
  validate(met, weightKg, minutes);
  return (Math.max(0, met - 1) * 3.5 * weightKg * minutes) / 200;
}

function validate(met: number, weightKg: number, minutes: number) {
  if (!(met > 0 && met < 30)) throw new RangeError("MET must be between 0 and 30");
  if (!(weightKg > 20 && weightKg < 400)) throw new RangeError("Weight must be between 20 and 400 kg");
  if (!(minutes >= 0 && minutes <= 24 * 60)) throw new RangeError("Duration must be 0–1440 minutes");
}

/** Compendium intensity bands. */
export function intensityFromMet(met: number): "light" | "moderate" | "vigorous" {
  return met < 3 ? "light" : met < 6 ? "moderate" : "vigorous";
}

/**
 * Walking/running MET from speed using the 2024 Compendium entries for level ground.
 * Linear interpolation between published points; above/below range clamps to endpoints.
 */
const WALK_POINTS: [number, number][] = [
  // [km/h (midpoint of the published mph range), MET] — 2024 Compendium codes
  // 17151, 17152, 17170, 17190, 17200, 17220, 17230, 17231 (walking, level, firm surface)
  [2.6, 2.3], [3.5, 2.8], [4.0, 3.0], [5.0, 3.8], [6.0, 4.8], [6.8, 5.5], [7.6, 7.0], [8.4, 8.5],
];
const RUN_POINTS: [number, number][] = [
  // 2024 Compendium codes 12026–12135 (jogging/running, level)
  [5.1, 3.3], [6.6, 6.5], [7.3, 7.8], [8.2, 8.5], [9.1, 9.0], [9.9, 9.3], [10.8, 10.5], [11.3, 11.0], [12.1, 11.8],
  [12.9, 12.0], [13.8, 12.5], [14.5, 13.0], [15.2, 14.8], [16.1, 14.8], [17.7, 16.8], [19.3, 18.5], [20.9, 19.8], [22.5, 23.0],
];

function interpolate(points: [number, number][], x: number): number {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

export function metFromSpeed(kind: "walk" | "run", kmh: number): number {
  return Math.round(interpolate(kind === "walk" ? WALK_POINTS : RUN_POINTS, kmh) * 10) / 10;
}

export interface ActivityCalc {
  met: number;
  grossKcal: number;
  netKcal: number;
  speedKmh: number | null;
  intensity: "light" | "moderate" | "vigorous";
}

export function calculateActivity(input: {
  met: number;
  weightKg: number;
  durationMin: number;
  distanceKm?: number | null;
  speedBased?: "walk" | "run" | null;
}): ActivityCalc {
  let met = input.met;
  let speedKmh: number | null = null;
  if (input.distanceKm && input.durationMin > 0) {
    speedKmh = input.distanceKm / (input.durationMin / 60);
    if (input.speedBased) met = metFromSpeed(input.speedBased, speedKmh);
  }
  return {
    met,
    grossKcal: grossKcal(met, input.weightKg, input.durationMin),
    netKcal: netKcal(met, input.weightKg, input.durationMin),
    speedKmh,
    intensity: intensityFromMet(met),
  };
}

/** Rough training-load proxy (MET-minutes), used for week-over-week volume trends. */
export function metMinutes(met: number, minutes: number): number {
  return met * minutes;
}

/** Epley estimated one-rep max. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
