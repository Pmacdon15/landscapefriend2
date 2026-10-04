// Loaded only by `bun test` (see bunfig.toml), never by Vitest.
//
// Bun's built-in test runner can't run this repo's Vitest tests, so this hands
// `bun test` over to `bun run test` (Vitest) and exits with its result.
// Bun doesn't pass CLI arguments to preloads, so `bun test` always runs the
// whole suite once. For filters or watch mode use `bun run test -- <filter>`
// or `bun run test:watch`.
import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["run", "test"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
