import { route, zId } from "@/lib/server/api";
import { getProduct } from "@/lib/services/scans";

export const GET = route<{ id: string }>(async ({ db, user, params }) => getProduct(db, user.id, zId.parse(params.id)));
