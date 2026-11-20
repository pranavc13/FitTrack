"use client";

import { useEffect } from "react";

/** Last-resort boundary (errors in the root layout). Same stale-chunk auto-recovery as error.tsx. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (/ChunkLoadError|Loading chunk|dynamically imported module/i.test(`${error.name} ${error.message}`) && !sessionStorage.getItem("ft-reloaded")) {
      sessionStorage.setItem("ft-reloaded", "1");
      location.reload();
    }
  }, [error]);
  return (
    <html lang="en-IN">
      <body style={{ background: "#090B0A", color: "#F2F5F1", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, textAlign: "center", padding: 24 }}>
        <div>
          <h2>FitTrack AI hit an error</h2>
          <p style={{ color: "#9AA49C" }}>Your data is safe. Please reload the app.</p>
          <button onClick={() => { sessionStorage.removeItem("ft-reloaded"); location.reload(); }} style={{ background: "#B6F34A", color: "#10170A", border: 0, borderRadius: 16, padding: "12px 20px", fontWeight: 600 }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
