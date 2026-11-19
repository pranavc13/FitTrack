import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/home");
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
