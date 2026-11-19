import { route } from "@/lib/server/api";
import { lookupBarcode } from "@/lib/services/scans";

export const GET = route<{ code: string }>(async ({ db, user, params }) => lookupBarcode(db, user.id, params.code), { limit: 30 });
