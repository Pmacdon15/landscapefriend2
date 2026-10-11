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

/**
 * Security regression tests for the API route handlers: unauthenticated
 * access, role checks and what the image proxy is willing to serve.
 */

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

const req = (path: string) => new NextRequest(`https://app.example${path}`);
const params = (id = "img_1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(auth.protect).mockResolvedValue(mockAuth({ orgId: "org_a" }));
});

describe("unauthenticated requests", () => {
  // auth.protect() throws (404 for API requests) when there is no session.
  beforeEach(() => {
    vi.mocked(auth.protect).mockRejectedValue(
      new Error("NEXT_HTTP_ERROR_FALLBACK;404"),
    );
  });

  it.each([
    ["/api/admin/history", () => adminHistory(req("/api/admin/history"))],
    [
      "/api/clients/cut-list",
      () => cutList(req("/api/clients/cut-list?date=2026-06-01")),
    ],
    ["/api/clients/search", () => clientSearch(req("/api/clients/search?q=a"))],
    [
      "/api/invoices/search",
      () => invoiceSearch(req("/api/invoices/search?q=a")),
    ],
    [
      "/api/image-view/[id]",
      () => imageView(req("/api/image-view/img_1?type=photo"), params()),
    ],
  ])("%s is rejected before any data is read", async (_path, call) => {
    await expect(call()).rejects.toThrow();

    expect(getPastServicesListDal).not.toHaveBeenCalled();
    expect(getClientsForCutListDal).not.toHaveBeenCalled();
    expect(getClientsForInfoDal).not.toHaveBeenCalled();
    expect(searchClientsDal).not.toHaveBeenCalled();
    expect(getInvoicesDal).not.toHaveBeenCalled();
    expect(getCompletionPhotoWithOrgDb).not.toHaveBeenCalled();
    expect(getSiteMapWithOrgDb).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });
});

describe("GET /api/image-view/[id] content types", () => {
  const serve = async (contentType: string) => {
    vi.mocked(getCompletionPhotoWithOrgDb).mockResolvedValue({
      id: "img_1",
      blob_path: "https://blob.example/p",
    });
    vi.mocked(get).mockResolvedValue({
      blob: { etag: '"etag-1"', contentType },
      stream: new ReadableStream(),
      statusCode: 200,
    } as never);
    return imageView(req("/api/image-view/img_1?type=photo"), params());
  };

  it.each(["image/jpeg", "image/png", "image/webp"])(
    "serves %s inline",
    async (type) => {
      const res = await serve(type);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(type);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    },
  );

  // A stored blob that is an active document must never be served inline from
  // the app origin, or its script would run as the viewer.
  it.each(["text/html", "image/svg+xml", "application/xhtml+xml"])(
    "never serves %s as an inline document (#79)",
    async (type) => {
      const res = await serve(type);
      const servedInline =
        res.status === 200 &&
        res.headers.get("content-type") === type &&
        !/attachment/i.test(res.headers.get("content-disposition") ?? "") &&
        !/sandbox/i.test(res.headers.get("content-security-policy") ?? "");
      expect(servedInline).toBe(false);
    },
  );
});
