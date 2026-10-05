import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Run every test in a fixed, non-UTC timezone so date bugs that only show up
// away from UTC (e.g. a date shifting to the previous day) are caught.
process.env.TZ = "America/Edmonton";

// src/db/client.ts throws on import without this. Tests that touch the
// database must mock `@/db/client` (or the query module) explicitly.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

// Vitest runs without globals, so Testing Library can't unmount on its own.
afterEach(() => cleanup());
