import { vi } from "vitest";

export interface MockAuthOptions {
  orgId?: string | null;
  userId?: string | null;
  orgRole?: string | null;
  /** Clerk billing features the org has, e.g. ["invoices", "stats"]. */
  features?: string[];
}

/**
 * Builds the object returned by `auth.protect()` from `@clerk/nextjs/server`.
 *
 * Usage:
 *   vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: vi.fn() } }));
 *   vi.mocked(auth.protect).mockResolvedValue(mockAuth({ orgRole: "org:admin" }));
 */
export function mockAuth({
  orgId = "org_test",
  userId = "user_test",
  orgRole = "org:member",
  features = [],
}: MockAuthOptions = {}) {
  return {
    orgId,
    userId,
    orgRole,
    has: vi.fn((check: { role?: string; feature?: string }) => {
      if (check.role) return check.role === orgRole;
      if (check.feature) return features.includes(check.feature);
      return false;
    }),
    // biome-ignore lint/suspicious/noExplicitAny: shape varies across Clerk versions
  } as any;
}
