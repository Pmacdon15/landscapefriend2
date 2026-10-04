// Loaded only by `bun test` (see bunfig.toml), never by Vitest.
console.error(
  [
    "",
    "  This project's tests run with Vitest, not Bun's built-in test runner.",
    "",
    "    bun run test        run all tests once",
    "    bun run test:watch  re-run tests on save",
    "",
  ].join("\n"),
);
process.exit(1);
