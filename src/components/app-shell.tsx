"use client";

import { BarChart3, CloudOff, Dumbbell, HeartPulse, Home, LineChart, RefreshCw, ScanLine, Sparkles, Target, User, UtensilsCrossed, Droplets } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppState } from "@/components/providers";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/food", label: "Food", icon: UtensilsCrossed },
  { href: "/activity", label: "Activity", icon: Dumbbell },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/progress", label: "Progress", icon: LineChart },
];
const SIDEBAR_EXTRA = [
  { href: "/fit-journal", label: "Google Fit journal", icon: HeartPulse },
  { href: "/coach", label: "AI Coach", icon: Sparkles },
  { href: "/wellness", label: "Water & sleep", icon: Droplets },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

function SyncPill() {
  const { online, queue, syncNow } = useAppState();
  if (online && !queue.length) return null;
  return (
    <button onClick={syncNow} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", online ? "bg-orange/15 text-orange" : "bg-surface-3 text-muted")} aria-label={online ? "Sync pending changes" : "Offline"}>
      {online ? <RefreshCw className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
      {online ? `${queue.length} pending` : queue.length ? `Offline · ${queue.length} saved locally` : "Offline"}
    </button>
  );
}

export function AppShell({ children, userName }: { children: ReactNode; userName: string }) {
  const path = usePathname();
  const initials = userName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-6 lg:flex">
        <Link href="/home" className="mb-8 flex items-center gap-2.5 px-2">
          <img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
          <span className="font-display text-lg font-bold">FitTrack <span className="text-lime">AI</span></span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {[...NAV, ...SIDEBAR_EXTRA].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", isActive(path, href) ? "bg-lime/12 text-lime" : "text-muted hover:bg-surface-2 hover:text-ink")}>
              <Icon className="h-5 w-5" /> {label}
            </Link>
          ))}
        </nav>
        <Link href="/scan" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-lime font-semibold text-lime-ink glow-lime">
          <ScanLine className="h-5 w-5" /> Scan food
        </Link>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-line/50 bg-bg/85 backdrop-blur-xl safe-top">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
            <Link href="/home" className="flex items-center gap-2 lg:hidden" aria-label="Home">
              <img src="/icons/icon.svg" alt="" className="h-8 w-8 rounded-lg" />
              <span className="font-display font-bold">FitTrack <span className="text-lime">AI</span></span>
            </Link>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <SyncPill />
              <Link href="/fit-journal" className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-red lg:hidden" aria-label="Google Fit journal">
                <HeartPulse className="h-5 w-5" />
              </Link>
              <Link href="/wellness" className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-cyan lg:hidden" aria-label="Water and sleep">
                <Droplets className="h-5 w-5" />
              </Link>
              <Link href="/coach" className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-lime lg:hidden" aria-label="AI coach">
                <Sparkles className="h-5 w-5" />
              </Link>
              <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-lime/30 to-cyan/20 text-sm font-bold" aria-label="Profile">
                {initials || <User className="h-5 w-5" />}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 lg:pb-12">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden safe-bottom" aria-label="Main">
        <div className="mx-auto mb-3 flex max-w-md items-center gap-2 px-3">
          <div className="flex flex-1 items-center justify-around rounded-[26px] border border-line bg-surface/95 px-1 py-1.5 shadow-2xl backdrop-blur-xl">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(path, href);
              return (
                <Link key={href} href={href} className={cn("flex min-w-12 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10.5px] font-semibold transition", active ? "text-lime" : "text-faint")} aria-current={active ? "page" : undefined}>
                  <span className={cn("grid h-8 w-8 place-items-center rounded-xl transition", active && "bg-lime/15")}>
                    <Icon className="h-[21px] w-[21px]" />
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
          <Link href="/scan" className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-[22px] bg-lime text-lime-ink glow-lime active:scale-95" aria-label="Scan food with camera">
            <ScanLine className="h-7 w-7" strokeWidth={2.4} />
          </Link>
        </div>
      </nav>
    </div>
  );
}

