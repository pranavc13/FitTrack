import { z } from "zod/v4";
import { ApiError, route } from "@/lib/server/api";
import { formData, fieldStr } from "@/lib/server/uploads";
import { commitImport, importHistory, parseImportFile, previewImport } from "@/lib/services/imports";
import { userToday } from "@/lib/server/context";

export const maxDuration = 60;

export const GET = route(async ({ db, user }) => ({ history: await importHistory(db, user.id) }));

/** action=preview (default) parses + previews; action=commit (with jobId) imports the same file. */
export const POST = route(
  async ({ db, user, req }) => {
    const form = await formData(req);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new ApiError(400, "Attach an export file (.csv, .json or .zip)");
    const range = { from: fieldStr(form, "from") ?? undefined, to: fieldStr(form, "to") ?? undefined };
    for (const d of [range.from, range.to]) if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new ApiError(400, "Dates must be YYYY-MM-DD");
    const { tz } = await userToday(db, user.id);
    const parsed = parseImportFile(file.name, Buffer.from(await file.arrayBuffer()), tz);
    if (fieldStr(form, "action") === "commit") {
      const jobId = z.coerce.number().int().positive().parse(fieldStr(form, "jobId"));
      return { committed: true, stats: await commitImport(db, user.id, jobId, parsed, range) };
    }
    return previewImport(db, user.id, file.name, parsed, range);
  },
  { limit: 20 },
);
