import { sql } from "drizzle-orm";
import { rowsOf } from "../src/db/client";
import { closeDb, openDb } from "./lib/ingest";
const db = await openDb();
const users = rowsOf<Record<string, unknown>>(await db.execute(sql`
  SELECT u.email, u.name, u.created_at,
    (SELECT count(*) FROM meal_entries m WHERE m.user_id = u.id) AS food_entries,
    (SELECT count(*) FROM weight_logs w WHERE w.user_id = u.id) AS weights,
    (SELECT count(*) FROM food_scans f WHERE f.user_id = u.id) AS scans
  FROM users u ORDER BY u.created_at`));
console.table(users);
await closeDb(db);
