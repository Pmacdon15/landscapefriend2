import { describe, expect, it } from "vitest";
import { clientLimitFor, DEFAULT_CLIENT_LIMIT } from "./plan-limits";

const withFeatures = (features: string[]) => (f: string) =>
  features.includes(f);

describe("clientLimitFor", () => {
  it("defaults to 50", () => {
    expect(DEFAULT_CLIENT_LIMIT).toBe(50);
    expect(clientLimitFor(withFeatures([]))).toBe(50);
  });

  it.each([
    ["100_clients", 100],
    ["100-clients", 100],
    ["200_clients", 200],
    ["200-clients", 200],
  ])("%s allows %i clients", (feature, limit) => {
    expect(clientLimitFor(withFeatures([feature]))).toBe(limit);
  });

  it("uses the highest tier when several are present", () => {
    expect(clientLimitFor(withFeatures(["100_clients", "200-clients"]))).toBe(
      200,
    );
  });

  it("ignores unrelated features", () => {
    expect(clientLimitFor(withFeatures(["invoices", "stats"]))).toBe(50);
  });
});
