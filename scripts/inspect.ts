import { closeDb, openDb } from "./lib/ingest";
import { searchFoods } from "../src/lib/services/foods";
const db = await openDb();
for (const q of ["toor dal", "roti", "paneer", "dahi", "पनीर", "chai", "egg", "banana", "biryani", "rice cooked", "dosa", "aloo", "moong", "chicken breast", "golgappa"]) {
  const t = Date.now();
  const r = await searchFoods(db, "00000000-0000-0000-0000-000000000000", q, { limit: 4 });
  console.log(`${q} (${Date.now() - t}ms):`, r.map((x) => `${x.name}${x.matchedSynonym ? ` [${x.matchedSynonym}]` : ""}`).join(" | "));
}
await closeDb(db);
