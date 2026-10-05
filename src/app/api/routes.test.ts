import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPastServicesListDal } from "@/dal/admin";
import {
  getClientsForCutListDal,
  getClientsForInfoDal,
  searchClientsDal,
} from "@/dal/clients";
import { getInvoicesDal } from "@/dal/invoices";
import {
  getCompletionPhotoWithOrgDb,
  getSiteMapWithOrgDb,
} from "@/db/queries/clients";
import { mockAuth } from "../../../tests/helpers/clerk";
import { GET as adminHistory } from "./admin/history/route";
import { GET as cutList } from "./clients/cut-list/route";
import { GET as clientSearch } from "./clients/search/route";
import { GET as imageView } from "./image-view/[id]/route";
import { GET as invoiceSearch } from "./invoices/search/route";

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: vi.fn() } }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@vercel/blob", () => ({ get: vi.fn() }));
vi.mock("@/dal/admin", () => ({ getPastServicesListDal: vi.fn() }));
vi.mock("@/dal/clients", () => ({
  getClientsForCutListDal: vi.fn(),
  getClientsForInfoDal: vi.fn(),
  searchClientsDal: vi.fn(),
}));
vi.mock("@/dal/invoices", () => ({ getInvoicesDal: vi.fn() }));
vi.mock("@/db/queries/clients", () => ({
  getCompletionPhotoWithOrgDb: vi.fn(),
  getSiteMapWithOrgDb: vi.fn(),
}));

const req = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(`https://app.example${path}`, { headers });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(auth.protect).mockResolvedValue(mockAuth({ orgId: "org_a" }));
});

describe("GET /api/image-view/[id]", () => {
  const params = (id = "img_1") => ({ params: Promise.resolve({ id }) });
  const stored = {
    blob: { etag: '"etag-1"', contentType: "image/png" },
    stream: new ReadableStream(),
    statusCode: 200,
  };

  it("returns 401 without an active organization", async () => {
    vi.mocked(auth.protect).mockResolvedValue(mockAuth({ orgId: null }));
    const res = await imageView(req("/api/image-view/img_1"), params());
    expect(res.status).toBe(401);
  });

  it("looks up site maps and photos scoped to the caller's org", async () => {
    await imageView(req("/api/image-view/m1?type=sitemap"), params("m1"));
    expect(getSiteMapWithOrgDb).toHaveBeenCalledWith("m1", "org_a");

    await imageView(req("/api/image-view/p1?type=photo"), params("p1"));
    expect(getCompletionPhotoWithOrgDb).toHaveBeenCalledWith("p1", "org_a");
  });

  it.each([
    ["an unknown type", "/api/image-view/img_1?type=other"],
    ["no type", "/api/image-view/img_1"],
    ["another org's site map", "/api/image-view/img_1?type=sitemap"],
    ["another org's photo", "/api/image-view/img_1?type=photo"],
  ])("returns 404 for %s", async (_label, path) => {
    vi.mocked(getSiteMapWithOrgDb).mockResolvedValue(null);
    vi.mocked(getCompletionPhotoWithOrgDb).mockResolvedValue(null);
    const res = await imageView(req(path), params());
    expect(res.status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns 404 when the blob is missing from storage", async () => {
    vi.mocked(getCompletionPhotoWithOrgDb).mockResolvedValue({
      id: "img_1",
      blob_path: "https://blob.example/p.png",
    });
    vi.mocked(get).mockResolvedValue(null as never);
    const res = await imageView(
      req("/api/image-view/img_1?type=photo"),
      params(),
    );
    expect(res.status).toBe(404);
  });

  it("streams the private blob with safe caching headers", async () => {
    vi.mocked(getCompletionPhotoWithOrgDb).mockResolvedValue({
      id: "img_1",
      blob_path: "https://blob.example/p.png",
    });
    vi.mocked(get).mockResolvedValue(stored as never);

    const res = await imageView(
      req("/api/image-view/img_1?type=photo"),
      params(),
    );

    expect(get).toHaveBeenCalledWith("https://blob.example/p.png", {
      access: "private",
      ifNoneMatch: undefined,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("etag")).toBe('"etag-1"');
    expect(res.headers.get("cache-control")).toBe("private, no-cache");
  });

  it("returns 304 when the browser's ETag still matches", async () => {
    vi.mocked(getSiteMapWithOrgDb).mockResolvedValue({
      blob_path: "https://blob.example/m.png",
    } as never);
    vi.mocked(get).mockResolvedValue({ ...stored, statusCode: 304 } as never);

    const res = await imageView(
      req("/api/image-view/m1?type=sitemap", { "if-none-match": '"etag-1"' }),
      params("m1"),
    );

    expect(vi.mocked(get).mock.calls[0][1]).toEqual({
      access: "private",
      ifNoneMatch: '"etag-1"',
    });
    expect(res.status).toBe(304);
    expect(res.headers.get("etag")).toBe('"etag-1"');
  });

  it("returns 500 when storage throws", async () => {
    vi.mocked(getSiteMapWithOrgDb).mockResolvedValue({
      blob_path: "https://blob.example/m.png",
    } as never);
    vi.mocked(get).mockRejectedValue(new Error("blob down"));
    const res = await imageView(
      req("/api/image-view/m1?type=sitemap"),
      params("m1"),
    );
    expect(res.status).toBe(500);
  });
});

describe("GET /api/admin/history", () => {
  it.each([
    ["non-admins", mockAuth({ orgRole: "org:member" })],
    ["users without an org", mockAuth({ orgId: null, orgRole: "org:admin" })],
  ])("returns 401 for %s", async (_label, session) => {
    vi.mocked(auth.protect).mockResolvedValue(session);
    const res = await adminHistory(req("/api/admin/history"));
    expect(res.status).toBe(401);
    expect(getPastServicesListDal).not.toHaveBeenCalled();
  });

  it("passes page, client and search through for admins", async () => {
    vi.mocked(auth.protect).mockResolvedValue(
      mockAuth({ orgRole: "org:admin" }),
    );
    vi.mocked(getPastServicesListDal).mockResolvedValue({
      services: [],
      totalPages: 3,
    } as never);

    const res = await adminHistory(
      req("/api/admin/history?page=2&clientId=c1&search=oak"),
    );

    expect(getPastServicesListDal).toHaveBeenCalledWith(2, "c1", "oak");
    expect(await res.json()).toEqual({ services: [], totalPages: 3 });
  });

  it("defaults to page 1 with no filters", async () => {
    vi.mocked(auth.protect).mockResolvedValue(
      mockAuth({ orgRole: "org:admin" }),
    );
    await adminHistory(req("/api/admin/history"));
    expect(getPastServicesListDal).toHaveBeenCalledWith(
      1,
      undefined,
      undefined,
    );
  });

  it("returns 500 when the DAL throws", async () => {
    vi.mocked(auth.protect).mockResolvedValue(
      mockAuth({ orgRole: "org:admin" }),
    );
    vi.mocked(getPastServicesListDal).mockRejectedValue(new Error("db"));
    expect((await adminHistory(req("/api/admin/history"))).status).toBe(500);
  });
});

describe("GET /api/clients/search", () => {
  it("returns the first page of clients when the query is empty", async () => {
    vi.mocked(getClientsForInfoDal).mockResolvedValue({
      clients: [{ id: "c1" }],
    } as never);
    const res = await clientSearch(req("/api/clients/search"));
    expect(getClientsForInfoDal).toHaveBeenCalledWith(1);
    expect(searchClientsDal).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ clients: [{ id: "c1" }] });
  });

  it("falls back to an empty list if the default page fails", async () => {
    vi.mocked(getClientsForInfoDal).mockRejectedValue(new Error("db"));
    const res = await clientSearch(req("/api/clients/search"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clients: [] });
  });

  it("searches when a query is given", async () => {
    vi.mocked(searchClientsDal).mockResolvedValue([{ id: "c2" }] as never);
    const res = await clientSearch(req("/api/clients/search?q=oak%20st"));
    expect(searchClientsDal).toHaveBeenCalledWith("oak st");
    expect(await res.json()).toEqual({ clients: [{ id: "c2" }] });
  });

  it("returns 500 when the search fails", async () => {
    vi.mocked(searchClientsDal).mockRejectedValue(new Error("db"));
    expect((await clientSearch(req("/api/clients/search?q=x"))).status).toBe(
      500,
    );
  });
});

describe("GET /api/clients/cut-list", () => {
  it("requires a date", async () => {
    const res = await cutList(req("/api/clients/cut-list"));
    expect(res.status).toBe(400);
    expect(getClientsForCutListDal).not.toHaveBeenCalled();
  });

  it("passes the date and optional user through", async () => {
    vi.mocked(getClientsForCutListDal).mockResolvedValue([] as never);
    await cutList(req("/api/clients/cut-list?date=2026-06-01&userId=user_1"));
    expect(getClientsForCutListDal).toHaveBeenCalledWith(
      "2026-06-01",
      undefined,
      "user_1",
    );
  });

  it("returns 500 when the DAL throws", async () => {
    vi.mocked(getClientsForCutListDal).mockRejectedValue(new Error("db"));
    const res = await cutList(req("/api/clients/cut-list?date=2026-06-01"));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/invoices/search", () => {
  it("searches the first page of invoices", async () => {
    vi.mocked(getInvoicesDal).mockResolvedValue({
      data: [{ id: "i1" }],
    } as never);
    const res = await invoiceSearch(req("/api/invoices/search?q=INV-7"));
    expect(getInvoicesDal).toHaveBeenCalledWith(1, "INV-7");
    expect(await res.json()).toEqual({ invoices: [{ id: "i1" }] });
  });

  it("returns 500 when the DAL throws", async () => {
    vi.mocked(getInvoicesDal).mockRejectedValue(new Error("db"));
    expect((await invoiceSearch(req("/api/invoices/search"))).status).toBe(500);
  });
});
