import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { Onboarding } from "./onboarding";

export const metadata = { title: "Get started" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <Onboarding name={user.name} />;
}
