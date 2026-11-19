import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** Driver-agnostic database type (postgres-js and PGlite share the PgDatabase API). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/**
 * Creates a database connection.
 * - `postgres://…` → real PostgreSQL via postgres.js (production)
 * - `memory://` → throwaway in-memory PGlite (tests)
 * - empty → persistent embedded PGlite at ./.data/pglite (local development)
 * Migrations are applied automatically for PGlite; run `npm run db:migrate` for PostgreSQL.
 */
export async function createDb(url?: string, opts: { migrate?: boolean } = {}): Promise<Db> {
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const { default: postgres } = await import("postgres");
    const client = postgres(url, { max: Number(process.env.DB_POOL_SIZE ?? 5), prepare: false });
    const db = drizzlePg(client, { schema });
    if (opts.migrate) await migratePg(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const dataDir = url === "memory://" ? undefined : path.join(process.cwd(), ".data", "pglite");
  if (dataDir) (await import("node:fs")).mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir, { extensions: { pg_trgm } });
  const db = drizzlePglite(client, { schema });
  if (opts.migrate !== false) await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

/** Normalises `db.execute()` results (postgres-js returns an array, PGlite returns `{ rows }`). */
export function rowsOf<T>(result: unknown): T[] {
  const r = result as { rows?: T[] } | T[];
  return Array.isArray(r) ? r : (r.rows ?? []);
}
