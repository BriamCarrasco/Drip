import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "next/server": path.resolve(import.meta.dirname, "node_modules/next/server.js"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
    coverage: {
      provider: "v8",
      all: true,
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: ["**/*.test.ts", "lib/test-helpers.ts"],
      thresholds: {
        lines: 90,
        statements: 90,
      },
    },
  },
});
