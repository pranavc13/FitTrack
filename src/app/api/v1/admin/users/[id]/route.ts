import { z } from "zod/v4";
import { adminRoute } from "@/lib/server/admin";
import { adminUserDetail } from "@/lib/services/admin";

export const GET = adminRoute<{ id: string }>(async ({ db, params }) => adminUserDetail(db, z.uuid().parse(params.id)));
