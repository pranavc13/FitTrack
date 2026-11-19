import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    pool: "forks",
    // Load PGlite natively so its WASM/extension bundles resolve from node_modules.
    server: { deps: { external: ["@electric-sql/pglite"] } },
  },
});
