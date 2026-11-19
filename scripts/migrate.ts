import { config } from "dotenv";
import { createDb } from "../src/db/client";

config({ path: ".env.local" });

const db = await createDb(process.env.DATABASE_URL, { migrate: true });
console.log("✓ migrations applied", process.env.DATABASE_URL ? "(PostgreSQL)" : "(embedded PGlite at .data/pglite)");
// postgres-js keeps the pool open; PGlite needs closing to flush.
const client = (db as unknown as { $client: { end?: () => Promise<void>; close?: () => Promise<void> } }).$client;
await (client.end?.() ?? client.close?.());
