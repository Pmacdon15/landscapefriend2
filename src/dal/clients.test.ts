import { auth } from "@clerk/nextjs/server";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "@/db/client";
import { checkOrgMemberLimit } from "@/db/queries/clerk";
import {
  deleteAddressDb,
  deleteClientDb,
  getClientsForCutListDb,
  getClientsForInfoDb,
  insertAddressDb,
  searchClientsDb,
  updateAddressDb,
  updateClientDb,
} from "@/db/queries/clients";
import { mockAuth } from "../../tests/helpers/clerk";
import { getOrganizationMembersDal } from "./clerk";
import {
  deleteClientDal,
  getClientsForCutListDal,
  getClientsForInfoDal,
  searchClientsDal,
  updateClientDal,
} from "./clients";

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: vi.fn() } }));
vi.mock("@/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/db/queries/clerk", () => ({ checkOrgMemberLimit: vi.fn() }));
vi.mock("@/db/queries/clients", () => ({
  checkClientLimit: vi.fn(),
  deleteAddressDb: vi.fn(),
  deleteClientDb: vi.fn(),
  getClientsForCutListDb: vi.fn(),
  getClientsForInfoDb: vi.fn(),
  insertAddressDb: vi.fn(),
  insertClientDb: vi.fn(),
  searchClientsDb: vi.fn(),
  updateAddressDb: vi.fn(),
  updateClientDb: vi.fn(),
}));
vi.mock("./clerk", () => ({ getOrganizationMembersDal: vi.fn() }));

const CLIENT = "00000000-0000-4000-8000-000000000020";
const ADDRESS = "00000000-0000-4000-8000-000000000021";
const protect = vi.mocked(auth.protect);
const admin = () => mockAuth({ orgId: "org_1", orgRole: "org:admin" });
const member = () => mockAuth({ orgId: "org_1", userId: "user_1" });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  protect.mockResolvedValue(admin());
  vi.mocked(checkOrgMemberLimit).mockResolvedValue(ok(undefined));
  vi.mocked(getOrganizationMembersDal).mockResolvedValue([
    { id: "user_1", name: "Sam Mower" },
    { id: "user_2", name: "Alex Plow" },
  ]);
});

describe("getClientsForInfoDal", () => {
  it("is admin only", async () => {
    protect.mockResolvedValue(member());
    expect(await getClientsForInfoDal(1)).toEqual({
      clients: [],
      totalPages: 0,
    });
    expect(getClientsForInfoDb).not.toHaveBeenCalled();
  });

  it("pages by 6 and also matches assignees by name", async () => {
    vi.mocked(getClientsForInfoDb).mockResolvedValue([
      { id: CLIENT, total_count: 13 },
    ] as never);
    const result = await getClientsForInfoDal(2, "sam");
    expect(getClientsForInfoDb).toHaveBeenCalledWith(
      "org_1",
      6,
      6,
      "sam",
      ["user_1"],
      undefined,
    );
    expect(result.totalPages).toBe(3);
  });

  it("reports one page when there are no clients", async () => {
    vi.mocked(getClientsForInfoDb).mockResolvedValue([]);
    expect(await getClientsForInfoDal(1)).toEqual({
      clients: [],
      totalPages: 1,
    });
  });
});

describe("getClientsForCutListDal", () => {
  it("returns nothing without a date", async () => {
    expect(await getClientsForCutListDal("")).toEqual([]);
    expect(protect).not.toHaveBeenCalled();
  });

  it("returns nothing when the org is over its member limit", async () => {
    vi.mocked(checkOrgMemberLimit).mockResolvedValue(
      err({ reason: "Too many members" }),
    );
    expect(await getClientsForCutListDal("2026-06-15")).toEqual([]);
    expect(getClientsForCutListDb).not.toHaveBeenCalled();
  });

  it("members only ever see their own list", async () => {
    protect.mockResolvedValue(member());
    vi.mocked(getClientsForCutListDb).mockResolvedValue([]);
    await getClientsForCutListDal("2026-06-15", undefined, "all");
    expect(getClientsForCutListDb).toHaveBeenCalledWith(
      "org_1",
      "2026-06-15",
      "user_1",
      false,
      undefined,
      undefined,
    );
  });

  it("admins can view another user's list or everyone's", async () => {
    protect.mockResolvedValue(
      mockAuth({ orgId: "org_1", userId: "admin_1", orgRole: "org:admin" }),
    );
    vi.mocked(getClientsForCutListDb).mockResolvedValue([]);

    await getClientsForCutListDal("2026-06-15", undefined, "user_2");
    expect(vi.mocked(getClientsForCutListDb).mock.calls[0].slice(2, 4)).toEqual(
      ["user_2", false],
    );

    await getClientsForCutListDal("2026-06-15", undefined, "all");
    expect(vi.mocked(getClientsForCutListDb).mock.calls[1][3]).toBe(true);
  });
});

describe("updateClientDal", () => {
  const data = {
    name: "Jane Doe",
    email: null,
    phone: null,
    addresses: [
      {
        id: ADDRESS,
        street: "1 Main",
        city: "Calgary",
        status: "active" as const,
      },
      { street: "2 New St", city: "Calgary", status: "active" as const },
    ],
  };

  beforeEach(() => {
    vi.mocked(sql).mockResolvedValue([{ status: "active" }] as never);
    vi.mocked(updateClientDb).mockResolvedValue({
      id: CLIENT,
      org_id: "org_1",
    } as never);
    vi.mocked(updateAddressDb).mockResolvedValue({ id: ADDRESS } as never);
    vi.mocked(insertAddressDb).mockResolvedValue({ id: "new" } as never);
  });

  it("is admin only", async () => {
    protect.mockResolvedValue(member());
    const result = await updateClientDal(CLIENT, data);
    expect(result._unsafeUnwrapErr().reason).toBe("Unauthorized");
  });

  it("rejects an invalid client id", async () => {
    const result = await updateClientDal("nope", data);
    expect(result._unsafeUnwrapErr().reason).toBe("Invalid client ID");
  });

  it("blocks edits to clients disabled by plan limits", async () => {
    vi.mocked(sql).mockResolvedValue([{ status: "disabled" }] as never);
    const result = await updateClientDal(CLIENT, data);
    expect(result._unsafeUnwrapErr().reason).toMatch(/disabled/);
    expect(updateClientDb).not.toHaveBeenCalled();
  });

  it("updates existing addresses and inserts new ones", async () => {
    const result = await updateClientDal(CLIENT, data);
    expect(result._unsafeUnwrap().addresses).toHaveLength(2);
    expect(updateClientDb).toHaveBeenCalledWith(
      CLIENT,
      "org_1",
      "Jane Doe",
      null,
      null,
    );
    expect(updateAddressDb).toHaveBeenCalledWith(
      ADDRESS,
      CLIENT,
      "1 Main",
      "Calgary",
      undefined,
      undefined,
      "active",
      [],
    );
    expect(insertAddressDb).toHaveBeenCalledTimes(1);
  });

  it("soft-deletes addresses marked deleted and skips new deleted ones", async () => {
    await updateClientDal(CLIENT, {
      ...data,
      addresses: [
        { id: ADDRESS, street: "1 Main", city: "Calgary", status: "deleted" },
        { street: "2 New St", city: "Calgary", status: "deleted" },
      ],
    });
    expect(deleteAddressDb).toHaveBeenCalledWith(ADDRESS, CLIENT);
    expect(insertAddressDb).not.toHaveBeenCalled();
  });

  // Known security bug: the status check finds no row for another org's
  // client but carries on, and the address writes are scoped by client id
  // only, so another org's addresses get changed.
  it("does not touch addresses of a client from another org", async () => {
    vi.mocked(sql).mockResolvedValue([] as never);
    vi.mocked(updateClientDb).mockResolvedValue(undefined as never);

    const result = await updateClientDal(CLIENT, data);

    expect(result.isErr()).toBe(true);
    expect(updateAddressDb).not.toHaveBeenCalled();
    expect(insertAddressDb).not.toHaveBeenCalled();
    expect(deleteAddressDb).not.toHaveBeenCalled();
  });
});

describe("deleteClientDal", () => {
  it("deletes within the org", async () => {
    vi.mocked(deleteClientDb).mockResolvedValue({ id: CLIENT } as never);
    const result = await deleteClientDal(CLIENT);
    expect(result._unsafeUnwrap()).toEqual({ id: CLIENT });
    expect(deleteClientDb).toHaveBeenCalledWith(CLIENT, "org_1");
  });

  it("reports when the client doesn't exist", async () => {
    vi.mocked(deleteClientDb).mockResolvedValue(undefined as never);
    const result = await deleteClientDal(CLIENT);
    expect(result._unsafeUnwrapErr().reason).toBe(
      "Client not found or already deleted",
    );
  });

  it("is admin only", async () => {
    protect.mockResolvedValue(member());
    const result = await deleteClientDal(CLIENT);
    expect(result._unsafeUnwrapErr().reason).toBe("Unauthorized");
    expect(deleteClientDb).not.toHaveBeenCalled();
  });
});

describe("searchClientsDal", () => {
  it("throws for non-admins", async () => {
    protect.mockResolvedValue(member());
    await expect(searchClientsDal("jane")).rejects.toThrow("Unauthorized");
  });

  it("searches by name and by matching assignee", async () => {
    vi.mocked(searchClientsDb).mockResolvedValue([{ id: CLIENT }] as never);
    expect(await searchClientsDal("PLOW")).toEqual([{ id: CLIENT }]);
    expect(searchClientsDb).toHaveBeenCalledWith("org_1", "PLOW", ["user_2"]);
  });
});
