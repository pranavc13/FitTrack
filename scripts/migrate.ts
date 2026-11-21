import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { createDb } from "../src/db/client";

config({ path: ".env.local" });

const db = await createDb(process.env.DATABASE_URL, { migrate: true });
console.log("✓ migrations applied", process.env.DATABASE_URL ? "(PostgreSQL)" : "(embedded PGlite at .data/pglite)");
if (process.env.DATABASE_URL) {
  // Hosted Postgres such as Supabase exposes the public schema over its REST API; with RLS on and no policies,
  // only the app's owner connection can read or write. The app itself is unaffected (table owners bypass RLS).
  await db.execute(sql`
    DO $$ DECLARE t record; BEGIN
      FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
      END LOOP;
    END $$`);
  console.log("✓ row-level security enabled on all public tables");
}
// postgres-js keeps the pool open; PGlite needs closing to flush.
const client = (db as unknown as { $client: { end?: () => Promise<void>; close?: () => Promise<void> } }).$client;
await (client.end?.() ?? client.close?.());
