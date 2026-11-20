import { adminRoute } from "@/lib/server/admin";
import { adminListUsers } from "@/lib/services/admin";

export const GET = adminRoute(async ({ db }) => ({ users: await adminListUsers(db) }));
