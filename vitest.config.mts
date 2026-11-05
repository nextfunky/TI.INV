import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/unidade/**/*.test.ts"],
    environment: "node",
    // O banco em memória leva alguns segundos para iniciar na primeira vez.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
