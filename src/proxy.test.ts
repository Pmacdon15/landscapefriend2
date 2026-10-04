import { describe, expect, it, vi } from "vitest";

// Make clerkMiddleware hand back our handler so we can call it directly.
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: unknown) => handler,
}));

import proxy from "./proxy";

type Handler = (
  auth: { protect: ReturnType<typeof vi.fn> },
  request: { nextUrl: { pathname: string }; url: string },
) => Promise<Response | undefined>;

const handler = proxy as unknown as Handler;

function run(pathname: string, orgRole: string | null = "org:member") {
  const protect = vi.fn().mockResolvedValue({ orgRole });
  const request = {
    nextUrl: { pathname },
    url: `https://app.example.com${pathname}`,
  };
  return { protect, result: handler({ protect }, request) };
}

describe("proxy (route protection)", () => {
  it.each(["/", "/privacy", "/terms", "/api/webhooks/clerk"])(
    "lets public route %s through without auth",
    async (path) => {
      const { protect, result } = run(path);
      expect(await result).toBeUndefined();
      expect(protect).not.toHaveBeenCalled();
    },
  );

  it.each(["/clients-service", "/api/clients/search", "/pricing"])(
    "requires sign-in for %s",
    async (path) => {
      const { protect, result } = run(path);
      expect(await result).toBeUndefined();
      expect(protect).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    "/client-info-list",
    "/admin/invoices",
    "/admin/stats",
    "/admin/history",
    "/stats",
    "/history",
  ])("redirects non-admins away from %s", async (path) => {
    const { protect, result } = run(path, "org:member");
    const response = await result;
    expect(protect).toHaveBeenCalled();
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://app.example.com/");
  });

  it("lets admins into admin routes", async () => {
    const { result } = run("/admin/invoices", "org:admin");
    expect(await result).toBeUndefined();
  });

  it("treats any path starting with /privacy as public (current behaviour)", async () => {
    // The public patterns are prefix matches, so these skip auth too.
    // Tighten the regexes if that is ever not what you want.
    const { protect } = run("/privacy-anything");
    expect(protect).not.toHaveBeenCalled();
  });
});
