"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui/primitives";
import { api, ApiClientError } from "@/lib/client/api";
import { AuthHero } from "./auth-hero";

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn't set up on this server yet (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
  google_cancelled: "Google sign-in was cancelled.",
  google_expired: "That Google sign-in took too long or was opened in another tab. Please try again.",
  google_failed: "Google sign-in failed. Please try again.",
};

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function AuthForm({ mode, googleEnabled }: { mode: "login" | "signup"; googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(() => GOOGLE_ERRORS[params.get("error") ?? ""] ?? null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  function google() {
    if (!googleEnabled) return setError(GOOGLE_ERRORS.google_not_configured!);
    setGoogleLoading(true);
    const q = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    const next = params.get("next");
    if (next) q.set("next", next);
    location.href = `/api/v1/auth/google?${q}`;
  }

  return (
    <main className="relative min-h-dvh overflow-hidden lg:grid lg:grid-cols-2">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-lime/10 blur-3xl lg:left-1/4" aria-hidden />

      {/* Visual side */}
      <section className="relative flex flex-col items-center justify-center px-5 pt-8 pb-2 text-center lg:min-h-dvh lg:border-r lg:border-line lg:bg-surface/40 lg:px-12">
        <div className="mb-4 flex items-center gap-2 lg:absolute lg:top-8 lg:left-10">
          <img src="/icons/icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
          <span className="font-display text-lg font-bold">FitTrack AI</span>
        </div>
        <div className="w-[78%] max-w-[300px] lg:w-full lg:max-w-[460px]">
          <AuthHero />
        </div>
        <div className="mt-6 hidden max-w-md lg:block">
          <h2 className="font-display text-3xl font-bold leading-tight">Snap your thali. Log your Google Fit day. Know exactly what to do next.</h2>
          <p className="mt-3 text-muted">Portion estimates in katoris and grams, a daily journal against your maintenance calories, and a plan built around your goal.</p>
        </div>
      </section>

      {/* Form side */}
      <section className="relative grid place-items-center px-5 pt-2 pb-10 lg:min-h-dvh lg:py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center lg:text-left">
            <h1 className="font-display text-3xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-2 text-sm text-muted">{mode === "login" ? "Your meals, workouts and progress — private to you." : "Your own personal plan, built from your body, goal and food."}</p>
          </div>

          <>
              <button type="button" onClick={google} disabled={googleLoading} className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white font-semibold text-[#1f1f1f] shadow-sm transition hover:bg-white/90 active:scale-[0.99] disabled:opacity-70">
                <GoogleLogo /> {googleLoading ? "Opening Google…" : "Continue with Google"}
              </button>
              <div className="my-5 flex items-center gap-3 text-xs text-faint">
                <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
              </div>
          </>

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
          <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-faint"><Lock className="h-3 w-3" /> Starts empty — only what you log is stored, and only you can see it.</p>
        </div>
      </section>
    </main>
  );
}
