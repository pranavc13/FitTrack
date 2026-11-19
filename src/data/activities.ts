/**
 * App-level activity categories over the 2024 Adult Compendium of Physical Activities, plus
 * India-specific activities that have no Compendium entry. Those are explicitly marked as proxies of
 * a named Compendium code (their MET is copied from that code, never invented).
 */

export const ACTIVITY_CATEGORIES = [
  "Walking",
  "Running",
  "Cycling",
  "Gym & strength",
  "High intensity",
  "Dance",
  "Mind-body",
  "Sports",
  "Water",
  "Outdoor",
  "Daily movement",
  "Work",
  "Other",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export function categorizeCompendium(heading: string, description: string): ActivityCategory {
  const d = description.toLowerCase();
  if (/yoga|pilates|stretching|tai chi|qigong|meditation|surya/.test(d)) return "Mind-body";
  if (/high intensity|hiit|tabata|crossfit|burpee|plyometric|battling rope|jump rope|rope jumping|rope skipping/.test(d)) return "High intensity";
  if (/resistance|weight lifting|weightlifting|powerlifting|bodybuilding|calisthenics|circuit|kettlebell|push-?ups|pull-?ups|squats/.test(d)) return "Gym & strength";
  if (/zumba|aerobic dance|dance/.test(d) && heading !== "Sports") return "Dance";
  switch (heading) {
    case "Walking":
      return /hiking|backpacking|climbing/.test(d) ? "Outdoor" : "Walking";
    case "Running":
      return "Running";
    case "Bicycling":
      return "Cycling";
    case "Conditioning Exercise":
      return /stair|treadmill|elliptical|rowing|ergometer|step|aerobic/.test(d) ? "High intensity" : "Gym & strength";
    case "Dancing":
      return "Dance";
    case "Sports":
      return /climbing|skating|skiing/.test(d) ? "Outdoor" : "Sports";
    case "Water Activities":
      return "Water";
    case "Winter Activities":
    case "Fishing & Hunting":
      return "Outdoor";
    case "Home Activities":
    case "Home Repair":
    case "Lawn & Garden":
    case "Self Care":
    case "Inactivity":
    case "Transportation":
      return "Daily movement";
    case "Occupation":
    case "Volunteer Activities":
      return "Work";
    default:
      return "Other";
  }
}

export interface ProxyActivity {
  code: string;
  name: string;
  category: ActivityCategory;
  proxyOf: string;
  note: string;
}

/** Activities common in India without a Compendium entry — MET taken from the cited proxy code. */
export const PROXY_ACTIVITIES: ProxyActivity[] = [
  { code: "IN-001", name: "Bhangra (vigorous)", category: "Dance", proxyOf: "03031", note: "Uses 'Nightclub or folk dancing, vigorous effort' — Bhangra has no Compendium entry." },
  { code: "IN-002", name: "Garba / Dandiya", category: "Dance", proxyOf: "03033", note: "Uses 'Folk dancing, moderate effort'." },
  { code: "IN-003", name: "Bollywood dance (class/general)", category: "Dance", proxyOf: "03025", note: "Uses 'Ethnic or cultural dancing'." },
  { code: "IN-004", name: "Dance cardio / aerobic Bollywood workout", category: "Dance", proxyOf: "02000", note: "Uses 'Aerobic, general'." },
  { code: "IN-005", name: "Kabaddi", category: "Sports", proxyOf: "15730", note: "Uses 'Wrestling, competitive' (intermittent grappling sport)." },
  { code: "IN-006", name: "Kho-kho", category: "Sports", proxyOf: "15610", note: "Uses 'Soccer, casual, general' (intermittent running game)." },
  { code: "IN-007", name: "Gully cricket", category: "Sports", proxyOf: "15150", note: "Uses 'Cricket, batting, bowling, fielding'." },
  { code: "IN-008", name: "Hula hoop", category: "Other", proxyOf: "02022", note: "Uses 'Calisthenics, moderate effort'." },
  { code: "IN-009", name: "Kalaripayattu / martial arts practice", category: "Sports", proxyOf: "15430", note: "Uses 'Martial arts, moderate pace'." },
  { code: "IN-010", name: "Mopping floor (pocha, on hands & knees)", category: "Daily movement", proxyOf: "05130", note: "Uses 'Scrubbing floors, on hands and knees'." },
];

/** Codes surfaced first in the quick picker. */
export const POPULAR_CODES = [
  "17190", "17200", "17220", "12050", "12026", "01016", "02050", "02054", "02214", "02310",
  "02180", "02150", "02101", "15150", "15030", "15610", "18310", "05010", "05021", "17133",
  "IN-001", "IN-002", "IN-003", "IN-005",
];
