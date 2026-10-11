import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as serviceDal from "@/dal/service";
import * as sitemapDal from "@/dal/sitemap";
import { mockAuth } from "../../tests/helpers/clerk";
import { completeJobAction } from "./jobs";
import { saveSiteMapAction } from "./sitemaps";

/**
 * Security regression tests for the two server actions that write to Vercel
 * Blob: completion photos (any member) and site maps (admins).
 */

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: vi.fn() } }));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@vercel/blob", () => ({ put: vi.fn() }));
vi.mock("@/dal/service", () => ({ completeJobDal: vi.fn() }));
vi.mock("@/dal/sitemap", () => ({
  deleteSiteMapDal: vi.fn(),
  saveSiteMapDal: vi.fn(),
  updateSiteMapDal: vi.fn(),
}));

const ADDRESS = "00000000-0000-4000-8000-000000000001";
const row = { id: "row_1", org_id: "org_a" };

function formData(fields: Record<string, string | File>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}

// A file whose declared type and extension are not an image.
const notAnImage = () =>
  new File(["<p>not an image</p>"], "photo.html", { type: "text/html" });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(auth.protect).mockResolvedValue(
    mockAuth({ orgId: "org_a", orgRole: "org:admin" }),
  );
  vi.mocked(put).mockResolvedValue({
    url: "https://blob.example/file",
  } as never);
  vi.mocked(serviceDal.completeJobDal).mockResolvedValue(ok(row) as never);
  vi.mocked(sitemapDal.saveSiteMapDal).mockResolvedValue(ok(row) as never);
});

describe("completeJobAction uploads", () => {
  it("does not upload or save anything for unauthenticated callers", async () => {
    vi.mocked(auth.protect).mockRejectedValue(
      new Error("NEXT_HTTP_ERROR_FALLBACK;404"),
    );
    const photo = new File(["img"], "a.jpg", { type: "image/jpeg" });

    await expect(
      completeJobAction(
        formData({
          addressId: ADDRESS,
          serviceType: "grass",
          photoFile: photo,
        }),
      ),
    ).rejects.toThrow();

    expect(put).not.toHaveBeenCalled();
    expect(serviceDal.completeJobDal).not.toHaveBeenCalled();
  });

  // Expected to fail until https://github.com/Pmacdon15/landscapefriend2/issues/79
  // is fixed; switch `it.fails` back to `it` then.
  it.fails("rejects a photo that is not an image (#79)", async () => {
    await completeJobAction(
      formData({
        addressId: ADDRESS,
        serviceType: "grass",
        photoFile: notAnImage(),
      }),
    );
    expect(put).not.toHaveBeenCalled();
  });

  // Expected to fail until #79 is fixed.
  it.fails("never takes the stored extension from the uploaded file name (#79)", async () => {
    const photo = new File(["img"], "IMG_0001.html", { type: "image/jpeg" });
    await completeJobAction(
      formData({
        addressId: ADDRESS,
        serviceType: "grass",
        photoFile: photo,
      }),
    );
    const [pathname] = vi.mocked(put).mock.calls[0];
    expect(pathname).not.toMatch(/\.html$/);
  });
});

describe("saveSiteMapAction uploads", () => {
  // Expected to fail until https://github.com/Pmacdon15/landscapefriend2/issues/82
  // is fixed: the upload happens before the DAL checks auth and role.
  it.fails.each([
    [
      "an unauthenticated caller",
      () =>
        vi
          .mocked(auth.protect)
          .mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;404")),
    ],
    [
      "a non-admin member",
      () =>
        vi.mocked(auth.protect).mockResolvedValue(mockAuth({ orgId: "org_a" })),
    ],
    [
      "a user with no organization",
      () =>
        vi.mocked(auth.protect).mockResolvedValue(mockAuth({ orgId: null })),
    ],
  ])("does not upload for %s (#82)", async (_who, arrange) => {
    arrange();
    const file = new File(["img"], "map.png", { type: "image/png" });
    await saveSiteMapAction(formData({ addressId: ADDRESS, file })).catch(
      () => undefined,
    );
    expect(put).not.toHaveBeenCalled();
  });

  // Expected to fail until https://github.com/Pmacdon15/landscapefriend2/issues/79
  // is fixed.
  it.fails("rejects a site map file that is not an image (#79)", async () => {
    const result = await saveSiteMapAction(
      formData({ addressId: ADDRESS, file: notAnImage() }),
    );
    expect(result.success).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  // Expected to fail until #82 is fixed (JSON.parse is unguarded).
  it.fails("returns a validation error for malformed map data (#82)", async () => {
    const result = await saveSiteMapAction(
      formData({ addressId: ADDRESS, mapData: "{not json" }),
    );
    expect(result.success).toBe(false);
  });
});
