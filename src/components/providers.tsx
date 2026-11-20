"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SWRConfig } from "swr";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { flushQueue, listQueue, onQueueChange, type QueuedRequest } from "@/lib/client/offline";
import { invalidate } from "@/lib/client/api";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface AppState {
  online: boolean;
  queue: QueuedRequest[];
  installPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
  promptInstall: () => Promise<boolean>;
  syncNow: () => Promise<void>;
}

const AppCtx = createContext<AppState>({ online: true, queue: [], installPrompt: null, isStandalone: false, promptInstall: async () => false, syncNow: async () => {} });
export const useAppState = () => useContext(AppCtx);

function AppStateProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setStandalone] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    const refresh = () => listQueue().then(setQueue);
    refresh();
    const off = onQueueChange(refresh);

    const sync = async () => {
      const r = await flushQueue();
      if (r.synced) {
        toast(`Synced ${r.synced} offline ${r.synced === 1 ? "entry" : "entries"}`);
        invalidate("/");
      }
    };
    const goOnline = () => {
      setOnline(true);
      sync();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Code files from an older build (app updated / dev server recompiled while the tab was open): reload once.
    const onChunkError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const err = "reason" in e ? e.reason : e.error;
      if (!/ChunkLoadError|Loading chunk|dynamically imported module/i.test(`${err?.name} ${err?.message ?? e}`)) return;
      if (sessionStorage.getItem("ft-reloaded")) return;
      sessionStorage.setItem("ft-reloaded", "1");
      location.reload();
    };
    window.addEventListener("error", onChunkError);
    window.addEventListener("unhandledrejection", onChunkError);
    const clearReloadFlag = setTimeout(() => sessionStorage.removeItem("ft-reloaded"), 10_000);
    window.addEventListener("appinstalled", () => setInstallPrompt(null));

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      navigator.serviceWorker.addEventListener("message", (e) => {
        if (e.data?.type === "flush-queue") sync();
      });
    } else if ("serviceWorker" in navigator) {
      // A worker left over from a production run would serve stale dev chunks and crash the app.
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      if ("caches" in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
    if (navigator.onLine) sync();
    const interval = setInterval(() => navigator.onLine && sync(), 60_000);
    return () => {
      off();
      clearInterval(interval);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("error", onChunkError);
      window.removeEventListener("unhandledrejection", onChunkError);
      clearTimeout(clearReloadFlag);
    };
  }, [toast]);

  const promptInstall = async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    return choice.outcome === "accepted";
  };

  const syncNow = async () => {
    const r = await flushQueue();
    toast(r.synced ? `Synced ${r.synced} entries` : r.failed ? `${r.failed} entries need attention` : "Nothing to sync", r.failed ? "error" : "info");
    if (r.synced) invalidate("/");
  };

  return <AppCtx.Provider value={{ online, queue, installPrompt, isStandalone, promptInstall, syncNow }}>{children}</AppCtx.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ errorRetryCount: 2, shouldRetryOnError: (e: { status?: number }) => !e?.status || e.status >= 500 }}>
      <ToastProvider>
        <AppStateProvider>{children}</AppStateProvider>
      </ToastProvider>
    </SWRConfig>
  );
}
