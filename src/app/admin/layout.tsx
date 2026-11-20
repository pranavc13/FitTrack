import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Admin · FitTrack", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-6xl px-4 py-6">{children}</div>;
}
