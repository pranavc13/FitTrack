import "server-only";
import { createDb, type Db } from "./client";

const globalForDb = globalThis as unknown as { __fittrackDb?: Promise<Db> };

/** Process-wide database handle (survives Next.js dev hot reloads). */
export function getDb(): Promise<Db> {
  globalForDb.__fittrackDb ??= createDb(process.env.DATABASE_URL);
  return globalForDb.__fittrackDb;
}

export * as schema from "./schema";
export type { Db } from "./client";
export { rowsOf } from "./client";
