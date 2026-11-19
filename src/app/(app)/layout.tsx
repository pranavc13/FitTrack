import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { getSessionUser } from "@/lib/server/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const db = await getDb();
  const [profile] = await db.select({ onboardedAt: s.userProfiles.onboardedAt }).from(s.userProfiles).where(eq(s.userProfiles.userId, user.id));
  if (!profile?.onboardedAt) redirect("/onboarding");
  return <AppShell userName={user.name}>{children}</AppShell>;
}
