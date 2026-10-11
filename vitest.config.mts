import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests that run the real SQL against an in-memory Postgres (PGlite).
const integration = [
  "src/db/queries/**/*.test.ts",
  "tests/integration/**/*.test.ts",
];
// Repo-wide rules checked by reading source files (e.g. no async pages).
const architecture = ["tests/architecture/**/*.test.ts"];

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    // `bun run test` runs every project; `bun run test:<name>` runs one.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: integration,
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
        },
      },
      {
        extends: true,
        test: { name: "integration", include: integration },
      },
      {
        extends: true,
        test: { name: "architecture", include: architecture },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/components/ui/**", "src/**/*.test.{ts,tsx}"],
    },
  },
});
