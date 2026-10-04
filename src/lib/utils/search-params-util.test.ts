import { describe, expect, it } from "vitest";
import { parseParams } from "./search-params-util";

describe("parseParams", () => {
  it("returns strings unchanged", () => {
    expect(parseParams("abc")).toBe("abc");
  });

  it("returns the first value of an array", () => {
    expect(parseParams(["a", "b"])).toBe("a");
  });

  it("returns undefined for missing or empty arrays", () => {
    expect(parseParams(undefined)).toBeUndefined();
    expect(parseParams([])).toBeUndefined();
  });
});
