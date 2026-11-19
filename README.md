# FitTrack AI

An AI-powered fitness, nutrition and body-transformation tracker built mobile-first for Indian food. It's an installable PWA: tap the icon on your Android home screen and it opens straight to your dashboard, already signed in.

- **Food:** log by camera, label, barcode or search. Indian dishes are calculated from their ingredients, not given a guessed per-dish calorie number.
- **Activity:** workouts, steps and 1,100+ activities with Compendium MET values.
- **Goals and progress:** goal plans and a body-transformation timeline with private progress photos.
- **AI coach:** answers only from your own logged data.

---

## What's real (and what needs keys)

| Area | Status | Notes |
|---|---|---|
| Accounts, sessions, profile, targets | ✅ Works out of the box | 90-day sliding sessions keep the installed app signed in |
| Food database | ✅ 13,234 foods | 7,793 USDA SR Legacy + 5,326 USDA FNDDS (public domain) + 115 recipe-calculated Indian/regional dishes |
| Hindi/regional search | ✅ | 600+ synonyms (हिंदी, Hinglish, Tamil, Telugu, Marathi, Bengali…) with fuzzy trigram search |
| Recipe engine | ✅ | Ingredient-level nutrition, cooked-yield correction, scaling, variants (home vs restaurant), versioned user recipes, swaps |
| Activity database | ✅ 1,121 activities | 2024 Adult Compendium of Physical Activities + 10 clearly-labelled India-specific proxies (Bhangra, Garba, Kabaddi…) |
| Workouts | ✅ | 70 exercises, 6 plan templates, set logging, PRs, progressive overload, recovery-aware suggestions, rest/interval timers |
| Body transformation | ✅ | Weight trend (EWMA), plateau detection, time-to-target ranges, measurements, private photos, compare slider, milestones |
| Insights, planner, grocery, pantry, reports | ✅ | Protein/fibre gaps, hidden calories, nutrition score, weekly budget, meal plans, grocery lists, PDF/CSV export |
| Offline | ✅ | Viewed pages and data are cached; food, water, weight, steps and activity logs queue offline and sync later |
| **AI meal photos, label OCR, recipe parsing, coach** | 🔑 Needs `GEMINI_API_KEY` | Google Gemini, default `gemini-3.8-flash` (override with `GEMINI_MODEL`). Without a key these features show a clear "not configured" state and everything else works |
| Barcode lookup | 🌐 Needs internet | Open Food Facts (ODbL) |
| Push reminders | 🔑 Needs VAPID keys + a cron | See [Deployment](#deploy) |
| Live Google Fit / Health Connect sync | ❌ Not possible in a web app | **File import** of Google Takeout / Health Connect exports is supported. Live sync needs the native Android wrapper (see [Native Android](#native-android)) |

## Quick start (local)

Requirements: Node 20.11+ and about 300 MB of disk for the food data. Docker and PostgreSQL are **not** needed for local use, because an embedded PostgreSQL (PGlite) is stored in `.data/`.

```bash
npm install
cp .env.example .env.local          # then set AUTH_SECRET (and GEMINI_API_KEY for AI features — free key at aistudio.google.com/apikey)
npm run db:setup                    # migrations + USDA download/import (~1 min) + recipes/activities/exercises
npm run icons                       # (already generated in public/icons; re-run if you change the logo)
npm run dev                         # http://localhost:3000
```

To try it on your phone, connect to the same Wi-Fi and open `http://<your-PC-IP>:3000`. Installing as an app and using the camera both require **HTTPS**, so deploy it (below) or use a tunnel such as `npx localtunnel --port 3000`.

### Useful scripts

| Script | What it does |
|---|---|
| `npm test` | 54 unit + integration tests (calculation engines, plus services on an in-memory Postgres) |
| `npm run test:ui` | Headless-Chrome phone-viewport smoke test of every screen (needs a running server and an onboarded account) |
| `npm run lint` | TypeScript strict type-check |
| `npm run db:import:usda` | Re-import or update USDA data (idempotent upsert by FDC id) |
| `npm run db:seed` | Re-seed recipes, synonyms, activities and exercises after editing `src/data/*` |
| `npm run db:import:csv -- --file=… --source=…` | Import a licensed dataset such as **ICMR-NIN IFCT 2017** (see the script header for columns) |
| `npm run db:generate` | Generate a migration after changing `src/db/schema.ts` |

## Architecture

```
src/
  app/                   Next.js App Router (mobile-first pages + REST API under /api/v1)
    (app)/…              Authenticated screens: home, food, scan, activity, goals, progress, coach, wellness, profile, analytics
    api/v1/…             ~75 JSON route handlers (reusable by a future native app; Bearer tokens supported)
  db/                    Drizzle schema (50+ tables), client (PGlite ↔ postgres-js)
  data/                  Curated reference content: ingredient map, recipes, activities, exercises, plans, restaurant portions
  lib/
    nutrition/           engine.ts (scaling, validation, recipe + yield), units.ts (portions), targets.ts (BMI/BMR/TDEE/macros)
    activity/met.ts      MET calculations (gross/net), speed→MET from the Compendium, 1RM
    analytics/trends.ts  EWMA trend weight, regression, plateau detection, adaptive TDEE, predictions, streaks
    services/            Business logic (DB-backed, testable without Next)
    ai/                  Gemini client (structured JSON output), vision/OCR/recipe schemas, function-calling coach
    server/              Auth, API wrapper (CSRF, rate limits, error mapping), uploads
    client/              API hooks (SWR), offline queue (IndexedDB), image compression
scripts/                 Ingestion (USDA, Compendium, CSV), seeding, migrations, icons, UI smoke test
drizzle/                 SQL migrations
public/sw.js             Service worker (app-shell cache, offline API cache, background sync, push)
```

**Stack:** Next.js 15 · React 19 · TypeScript (strict) · Tailwind CSS 4 · Radix primitives (shadcn-style components) · Lucide · Framer Motion · Recharts · Drizzle ORM · PostgreSQL / PGlite · Zod · Google Gen AI SDK (Gemini) · pdf-lib · web-push.

**Auth:** first-party database sessions. Tokens are SHA-256 hashed at rest, sent in an httpOnly SameSite cookie, and slide to 90 days. Passwords use bcrypt (cost 12). This is used instead of Auth.js because Auth.js discourages its credentials provider. Native clients send `Authorization: Bearer <token>` (request with header `X-Client: native` at login).

## How the numbers are calculated

All estimates are labelled as estimates in the UI.

- **BMR:** Mifflin–St Jeor. Sex is optional; if it's skipped, a neutral midpoint constant (−78) is used.
- **Daily expenditure = baseline + net exercise.**
  - Baseline is BMR × a *non-exercise* lifestyle factor (1.2–1.7).
  - Net exercise is (MET − 1) × 3.5 × kg ÷ 200 × minutes, using logged activities only.
  - Steps and device-reported calories are shown but **never added**, so nothing is double-counted.
- **Calorie targets:** moderate goal-specific deficits or surpluses, capped (e.g. at most 750 kcal deficit) and never below BMR or 1,200/1,500 kcal.
- **Protein:** 1.2–2.0 g/kg. When BMI ≥ 30, the weight used is the weight at BMI 25.
- **Fat:** ≈27% of energy and at least 0.6 g/kg.
- **Fibre:** 14 g per 1,000 kcal, kept within 25–40 g.
- **Water:** ≈35 ml/kg.
- **BMI:** shown with both WHO and Asian-Indian cut-offs.
- **Recipes:** total nutrients = Σ raw ingredient nutrients. Per-100 g density = total ÷ **cooked** weight, so a 600 g raw mixture that cooks down to 450 g is 600/450 times as energy-dense. If you don't weigh the cooked dish, cooked weight is assumed equal to raw weight, and the UI says so.
- **Trends:** body weight is smoothed with a gap-aware EWMA (α = 0.1).
  - **Plateau:** less than 0.1 kg/week over 21+ days with 8+ weigh-ins.
  - **Adaptive maintenance:** intake − Δtrend × 7,700 ÷ days. It needs 14+ days and at least 80% of days logged.
  - **Predictions:** given as ranges, never as dates.

## Data sources & licensing

| Source | Use | Licence |
|---|---|---|
| USDA FoodData Central — SR Legacy (2018-04) and FNDDS (2024-10-31) | Food catalogue + recipe ingredients | Public domain (CC0) |
| 2024 Adult Compendium of Physical Activities (Herrmann et al., *J Sport Health Sci* 2024) | MET values | Published reference; values cited with codes |
| Open Food Facts | Barcode lookups (fetched on demand, stored with attribution) | ODbL / CC BY-SA |
| ICMR-NIN IFCT 2017 | **Not bundled** (copyrighted). Import your licensed copy with `db:import:csv` | Per NIN licence |
| Recipe quantities (`src/data/recipes.ts`) | Typical home/restaurant preparations | App content; estimates, editable per user |

**Known data limitations (by design, not hidden):**
- USDA has no record for some Indian staples, including ragi, jaggery, amla, poha and fenugreek leaves. Where a recipe needs one, it maps to a stated proxy (e.g. poha → raw rice), the ingredient is badged "proxy data", and the recipe's confidence is lowered. No values are invented.
- USDA's FNDDS *paneer* record (≈16 g protein, 22 g carbs per 100 g) differs from typical Indian paneer. Scan your pack's label for brand-accurate data, or import IFCT.
- Restaurant dishes are estimated from restaurant-style recipes × portion **ranges**, because Indian outlets rarely publish nutrition.
- AI portion estimates from a photo can be off by 30% or more. Every scan shows separate recognition, quantity and nutrition-data confidence, and asks you to confirm grams.

## Deploy

The recommended setup is **Vercel + Neon Postgres + Cloudflare R2**. Any Postgres 14+ and S3-compatible storage works.

1. Create a Postgres database and set `DATABASE_URL`. Run `npm run db:setup` once against it from your machine.
2. Create an R2/S3 bucket (private) and set `STORAGE_DRIVER=s3` plus `S3_*`.
3. Set `AUTH_SECRET`, `APP_URL`, `GEMINI_API_KEY` (optional), `CRON_SECRET`, and VAPID keys (`npx web-push generate-vapid-keys`) if you want push.
4. Import the GitHub repo in Vercel and deploy. `vercel.json` schedules `/api/cron/reminders` every 15 minutes. Vercel Hobby limits cron frequency, so use daily reminders there or an external pinger.
5. Open the HTTPS URL on your Android phone in Chrome and choose **⋮ → Install app**. FitTrack AI then appears in your app drawer, opens full-screen to the dashboard, and stays signed in.

**API usage note:** each AI call (meal photo, label, recipe parse, coach message) counts against your Gemini API quota (free tier, then paid). Quick scans use low thinking and detailed scans use high. Per-user rate limits apply: 12 scans/min, 15 coach messages/min.

## Security & privacy

- **Authorization and CSRF:** every query is scoped server-side to the session user. Integration tests cover cross-user access. Cookie mutations are checked against the request Origin.
- **Rate limits:** stored in Postgres, applied per route and per user, with stricter limits for login and signup.
- **Uploads:** magic-byte sniffed, limited to 8 MB, and stored under per-user keys. Files are served only to their owner via `/api/v1/files/…`, and progress photos are never sent to AI.
- **Exports:** CSV output is protected against formula injection. Full JSON export and permanent account deletion (password-confirmed, removes images) are available in Profile.
- **Not medical advice:** the coach declines diagnoses, and fasting is capped at 24 h.

## Native Android

The API is plain REST with Bearer-token support, so the app can be wrapped with **Capacitor** to add live **Health Connect** sync (e.g. via `capacitor-health-connect`) and a native camera, reusing every endpoint. Health Connect is an on-device Android API and cannot be reached from a browser. Google's Fit REST API is being deprecated.

## Roadmap ideas

- Capacitor wrapper with Health Connect sync
- Licensed IFCT 2017 import pipeline with automatic synonym mapping
- Food photo segmentation masks
- More regional recipes (Northeast, Kashmiri, Konkani)
- Shared family recipes
