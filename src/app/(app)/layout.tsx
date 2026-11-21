import { AppShell } from "@/components/app-shell";

/**
 * Static shell: no per-navigation server work, so switching tabs is instant. Sign-in is gated by middleware
 * and validated by the API; the shell sends users who haven't finished onboarding there.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
