"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

/**
 * Route-level error boundary. A "ChunkLoadError" means the app was updated while this tab was open
 * (old code files no longer exist) — reloading once fixes it, so we do that automatically.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const stale = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(`${error.name} ${error.message}`);
    if (stale && !sessionStorage.getItem("ft-reloaded")) {
      sessionStorage.setItem("ft-reloaded", "1");
      location.reload();
      return;
    }
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60dvh] place-items-center px-6 text-center">
      <div className="max-w-sm space-y-3">
        <h2 className="font-display text-xl font-bold">Something went wrong on this screen</h2>
        <p className="text-sm text-muted">Your data is safe. Try again — if the app was just updated, a reload fixes it.</p>
        <div className="flex justify-center gap-2">
          <button onClick={reset} className="h-11 rounded-2xl bg-surface-2 px-4 font-semibold">Try again</button>
          <button onClick={() => { sessionStorage.removeItem("ft-reloaded"); location.reload(); }} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-lime px-4 font-semibold text-lime-ink">
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        </div>
        {error.digest ? <p className="text-[11px] text-faint">Error id: {error.digest}</p> : null}
      </div>
    </div>
  );
}
