"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui/primitives";
import { api, ApiClientError } from "@/lib/client/api";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    setLoading(true);
    try {
      if (mode === "signup") {
        await api.post("/auth/signup", { name: f.get("name"), email: f.get("email"), password: f.get("password"), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        router.replace("/onboarding");
      } else {
        await api.post("/auth/login", { email: f.get("email"), password: f.get("password") });
        const next = params.get("next");
        router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/home");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError && err.details ? `${err.message}: ${(err.details as { message: string }[]).map((d) => d.message).join(", ")}` : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-lime/10 blur-3xl" aria-hidden />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/icons/icon-192.png" alt="" className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
          <h1 className="font-display text-3xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-muted">{mode === "login" ? "Your meals, workouts and progress in one place." : "Track Indian meals with your camera, train smarter, see your transformation."}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" ? (
            <Field label="Name">
              <Input name="name" autoComplete="name" required maxLength={80} placeholder="Your name" />
            </Field>
          ) : null}
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </Field>
          <Field label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
            <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : 1} placeholder="••••••••" />
          </Field>
          {error ? <p role="alert" className="rounded-xl bg-red/10 px-3 py-2 text-sm text-red">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? (
            <>New here? <Link href="/signup" className="font-semibold text-lime">Create an account</Link></>
          ) : (
            <>Already have an account? <Link href="/login" className="font-semibold text-lime">Sign in</Link></>
          )}
        </p>
        <p className="mt-8 text-center text-xs text-faint">You stay signed in on this device. Your data is private to your account.</p>
      </div>
    </main>
  );
}
