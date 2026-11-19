import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** Launch entry: installed app opens straight to the dashboard when signed in. */
export default async function Index() {
  redirect((await getSessionUser()) ? "/home" : "/login");
}
