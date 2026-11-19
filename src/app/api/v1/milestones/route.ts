import { route } from "@/lib/server/api";
import { checkTransformationMilestones, listMilestones } from "@/lib/services/milestones";

export const GET = route(async ({ db, user }) => {
  const fresh = await checkTransformationMilestones(db, user.id);
  return { milestones: await listMilestones(db, user.id), fresh };
});
