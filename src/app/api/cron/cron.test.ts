import { del, list } from "@vercel/blob";
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { rebalanceClientsForOrg } from "@/dal/rebalance";
import { sql } from "@/db/client";
import {
  deleteCompletionPhotosDb,
  getActiveCompletionPhotoUrlsDb,
  getExpiredCompletionPhotosDb,
} from "@/db/queries/clients";
import { GET as cleanupPhotos } from "./cleanup-photos/route";
import { GET as rebalanceClients } from "./rebalance-clients/route";

vi.mock("@vercel/blob", () => ({ del: vi.fn(), list: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/dal/rebalance", () => ({ rebalanceClientsForOrg: vi.fn() }));
vi.mock("@/db/queries/clients", () => ({
  deleteCompletionPhotosDb: vi.fn(),
  getActiveCompletionPhotoUrlsDb: vi.fn(),
  getExpiredCompletionPhotosDb: vi.fn(),
}));

const request = (authorization?: string) =>
  new NextRequest("https://app.example/api/cron/x", {
    headers: authorization ? { authorization } : {},
  });

const NOW = new Date("2026-06-15T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const blob = (pathname: string, uploadedAt: Date) => ({
  pathname,
  url: `https://blob.example/${pathname}`,
  uploadedAt,
});

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(sql).mockResolvedValue([] as never);
  vi.mocked(getExpiredCompletionPhotosDb).mockResolvedValue([]);
  vi.mocked(getActiveCompletionPhotoUrlsDb).mockResolvedValue([]);
  vi.mocked(list).mockResolvedValue({
    blobs: [],
    hasMore: false,
    cursor: undefined,
  } as never);
});

describe.each([
  ["cleanup-photos", cleanupPhotos],
  ["rebalance-clients", rebalanceClients],
])("GET /api/cron/%s auth", (_name, handler) => {
  it("rejects a wrong secret in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await handler(request("Bearer wrong"))).status).toBe(401);
    expect((await handler(request())).status).toBe(401);
  });

  it("rejects `Bearer undefined` when CRON_SECRET is not set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", undefined);
    expect((await handler(request("Bearer undefined"))).status).toBe(401);
  });

  it("accepts the right secret in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await handler(request("Bearer s3cret"))).status).toBe(200);
  });

  it("skips the check outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await handler(request())).status).toBe(200);
  });
});

describe("GET /api/cron/rebalance-clients", () => {
  it("rebalances every organization and reports the results", async () => {
    vi.mocked(sql).mockResolvedValue([
      { org_id: "org_a", name: "A" },
      { org_id: "org_b", name: "B" },
    ] as never);
    vi.mocked(rebalanceClientsForOrg).mockResolvedValue({
      activated: 1,
    } as never);

    const res = await rebalanceClients(request());
    const body = await res.json();

    expect(rebalanceClientsForOrg).toHaveBeenNthCalledWith(1, "org_a");
    expect(rebalanceClientsForOrg).toHaveBeenNthCalledWith(2, "org_b");
    expect(body.organizationsProcessed).toBe(2);
    expect(body.results).toEqual([
      { orgId: "org_a", name: "A", activated: 1 },
      { orgId: "org_b", name: "B", activated: 1 },
    ]);
  });

  it("returns 500 when the database fails", async () => {
    vi.mocked(sql).mockRejectedValue(new Error("db down"));
    expect((await rebalanceClients(request())).status).toBe(500);
  });
});

describe("GET /api/cron/cleanup-photos", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    return () => vi.useRealTimers();
  });

  it("deletes orphaned and old completion blobs, keeping recent linked ones and site maps", async () => {
    const recentLinked = blob("completion-a1-1.jpg", daysAgo(5));
    const recentOrphan = blob("completion-a2-2.jpg", daysAgo(5));
    const oldLinked = blob("completion-a3-3.jpg", daysAgo(90));
    const siteMap = blob("sitemap-a1-4-map.png", daysAgo(400));
    vi.mocked(getActiveCompletionPhotoUrlsDb).mockResolvedValue([
      recentLinked.url,
      oldLinked.url,
    ]);
    vi.mocked(list).mockResolvedValue({
      blobs: [recentLinked, recentOrphan, oldLinked, siteMap],
      hasMore: false,
    } as never);

    const res = await cleanupPhotos(request());
    const body = await res.json();

    expect(del).toHaveBeenCalledTimes(1);
    expect(vi.mocked(del).mock.calls[0][0]).toEqual([
      recentOrphan.url,
      oldLinked.url,
    ]);
    expect(body.deletedBlobsCount).toBe(2);
  });

  it("follows the list cursor and deletes in batches of 100", async () => {
    const page = (start: number) =>
      Array.from({ length: 75 }, (_, i) =>
        blob(`completion-x-${start + i}.jpg`, daysAgo(1)),
      );
    vi.mocked(list)
      .mockResolvedValueOnce({
        blobs: page(0),
        hasMore: true,
        cursor: "c2",
      } as never)
      .mockResolvedValueOnce({ blobs: page(75), hasMore: false } as never);

    await cleanupPhotos(request());

    expect(vi.mocked(list).mock.calls[1][0]).toMatchObject({ cursor: "c2" });
    expect(vi.mocked(del).mock.calls.map(([urls]) => urls.length)).toEqual([
      100, 50,
    ]);
  });

  it("removes expired photo rows and clears the affected orgs' caches", async () => {
    vi.mocked(getExpiredCompletionPhotosDb).mockResolvedValue([
      { id: "p1", blob_path: "https://blob.example/old1.jpg", org_id: "org_a" },
      { id: "p2", blob_path: "https://blob.example/old2.jpg", org_id: "org_a" },
      { id: "p3", blob_path: "https://blob.example/old3.jpg", org_id: "org_b" },
    ]);

    const res = await cleanupPhotos(request());
    const body = await res.json();

    expect(deleteCompletionPhotosDb).toHaveBeenCalledWith(["p1", "p2", "p3"]);
    expect(body.affectedOrgs).toEqual(["org_a", "org_b"]);
    const tags = vi.mocked(revalidateTag).mock.calls.map(([tag]) => tag);
    expect(tags).toEqual([
      "job-history-org_a",
      "clients-info-org_a",
      "clients-cutlist-org_a",
      "clients-search-org_a",
      "job-history-org_b",
      "clients-info-org_b",
      "clients-cutlist-org_b",
      "clients-search-org_b",
    ]);
  });

  it("does nothing when there is nothing to clean up", async () => {
    const res = await cleanupPhotos(request());
    expect((await res.json()).deletedBlobsCount).toBe(0);
    expect(del).not.toHaveBeenCalled();
    expect(deleteCompletionPhotosDb).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns 500 when blob storage fails", async () => {
    vi.mocked(list).mockRejectedValue(new Error("blob down"));
    expect((await cleanupPhotos(request())).status).toBe(500);
  });
});
