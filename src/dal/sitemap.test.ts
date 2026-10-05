import { auth } from "@clerk/nextjs/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addressBelongsToOrgDb,
  deleteSiteMapDb,
  insertSiteMapDb,
  updateSiteMapDb,
} from "@/db/queries/clients";
import { mockAuth } from "../../tests/helpers/clerk";
import { deleteSiteMapDal, saveSiteMapDal, updateSiteMapDal } from "./sitemap";

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: vi.fn() } }));
vi.mock("@/db/queries/clients", () => ({
  addressBelongsToOrgDb: vi.fn(),
  deleteSiteMapDb: vi.fn(),
  insertSiteMapDb: vi.fn(),
  updateSiteMapDb: vi.fn(),
}));

const ADDRESS = "00000000-0000-4000-8000-000000000030";
const MAP = "00000000-0000-4000-8000-000000000031";
const protect = vi.mocked(auth.protect);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  protect.mockResolvedValue(mockAuth({ orgId: "org_1", orgRole: "org:admin" }));
  vi.mocked(addressBelongsToOrgDb).mockResolvedValue(true);
});

describe("site map DAL", () => {
  it.each([
    ["save", () => saveSiteMapDal(ADDRESS, "Front", null, null, null)],
    ["update", () => updateSiteMapDal(MAP, "Front", null, null)],
    ["delete", () => deleteSiteMapDal(MAP)],
  ])("%s is admin only", async (_action, run) => {
    protect.mockResolvedValue(mockAuth({ orgId: "org_1" }));
    expect((await run())._unsafeUnwrapErr().reason).toBe("Unauthorized");
  });

  it.each([
    [
      "save",
      () => saveSiteMapDal("nope", null, null, null, null),
      "Invalid address ID",
    ],
    [
      "update",
      () => updateSiteMapDal("nope", null, null, null),
      "Invalid site map ID",
    ],
    ["delete", () => deleteSiteMapDal("nope"), "Invalid site map ID"],
  ])("%s validates its id", async (_action, run, reason) => {
    expect((await run())._unsafeUnwrapErr().reason).toBe(reason);
  });

  it("won't save a map on another org's address", async () => {
    vi.mocked(addressBelongsToOrgDb).mockResolvedValue(false);
    const result = await saveSiteMapDal(ADDRESS, "Front", null, null, null);
    expect(result._unsafeUnwrapErr().reason).toBe("Address not found");
    expect(insertSiteMapDb).not.toHaveBeenCalled();
  });

  it("saves a map", async () => {
    vi.mocked(insertSiteMapDb).mockResolvedValue({ id: MAP } as never);
    const mapData = { lines: [] };
    const result = await saveSiteMapDal(
      ADDRESS,
      "Front",
      "n",
      "maps/1.png",
      mapData,
    );
    expect(result._unsafeUnwrap()).toEqual({ id: MAP });
    expect(insertSiteMapDb).toHaveBeenCalledWith(
      ADDRESS,
      "Front",
      "n",
      "maps/1.png",
      mapData,
    );
  });

  it("updates and deletes scoped to the org", async () => {
    vi.mocked(updateSiteMapDb).mockResolvedValue({ id: MAP } as never);
    vi.mocked(deleteSiteMapDb).mockResolvedValue({ id: MAP } as never);
    expect((await updateSiteMapDal(MAP, "Back", null, null)).isOk()).toBe(true);
    expect((await deleteSiteMapDal(MAP)).isOk()).toBe(true);
    expect(updateSiteMapDb).toHaveBeenCalledWith(
      MAP,
      "org_1",
      "Back",
      null,
      null,
    );
    expect(deleteSiteMapDb).toHaveBeenCalledWith(MAP, "org_1");
  });

  it("fails when the map isn't in the org", async () => {
    vi.mocked(updateSiteMapDb).mockResolvedValue(undefined as never);
    vi.mocked(deleteSiteMapDb).mockResolvedValue(undefined as never);
    expect(
      (await updateSiteMapDal(MAP, null, null, null))._unsafeUnwrapErr().reason,
    ).toBe("Failed to update site map");
    expect((await deleteSiteMapDal(MAP))._unsafeUnwrapErr().reason).toBe(
      "Failed to delete site map",
    );
  });
});
