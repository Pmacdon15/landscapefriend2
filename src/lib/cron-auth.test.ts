import { describe, expect, it, vi } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth";

const request = (authorization?: string) =>
  new Request("https://app.example/api/cron/x", {
    headers: authorization ? { authorization } : {},
  });

describe("isAuthorizedCronRequest", () => {
  it("lets every request through outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCronRequest(request())).toBe(true);
  });

  it("accepts the matching bearer token in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCronRequest(request("Bearer s3cret"))).toBe(true);
  });

  it("rejects a wrong or missing token in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCronRequest(request("Bearer nope"))).toBe(false);
    expect(isAuthorizedCronRequest(request("s3cret"))).toBe(false);
    expect(isAuthorizedCronRequest(request())).toBe(false);
  });

  it("never authorizes when the secret is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCronRequest(request("Bearer "))).toBe(false);
    expect(isAuthorizedCronRequest(request("Bearer undefined"))).toBe(false);
  });
});
