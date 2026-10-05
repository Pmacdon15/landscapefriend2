import { auth } from "@clerk/nextjs/server";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "@/db/client";
import { checkOrgMemberLimit } from "@/db/queries/clerk";
import {
  addressBelongsToOrgDb,
  deleteAssignmentDb,
  deleteOneTimeServiceDb,
  deleteScheduleDb,
  insertCompletedJobDb,
  insertCompletionPhotoDb,
  insertOneTimeServiceDb,
  updateAddressAssigneeDb,
  updateRouteOrderDb,
  upsertAssignmentDb,
  upsertScheduleDb,
} from "@/db/queries/clients";
import { mockAuth } from "../../tests/helpers/clerk";
import {
  completeJobDal,
  deleteOneTimeServiceDal,
  deleteScheduleDal,
  insertOneTimeServiceDal,
  updateAddressAssigneeDal,
  updateRouteOrderDal,
  upsertAssignmentDal,
  upsertScheduleDal,
} from "./service";

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: vi.fn() } }));
vi.mock("@/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/db/queries/clerk", () => ({ checkOrgMemberLimit: vi.fn() }));
vi.mock("@/db/queries/clients", () => ({
  addressBelongsToOrgDb: vi.fn(),
  deleteAssignmentDb: vi.fn(),
  deleteOneTimeServiceDb: vi.fn(),
  deleteScheduleDb: vi.fn(),
  insertCompletedJobDb: vi.fn(),
  insertCompletionPhotoDb: vi.fn(),
  insertOneTimeServiceDb: vi.fn(),
  updateAddressAssigneeDb: vi.fn(),
  updateRouteOrderDb: vi.fn(),
  upsertAssignmentDb: vi.fn(),
  upsertScheduleDb: vi.fn(),
}));

const ADDRESS = "00000000-0000-4000-8000-000000000001";
const SERVICE = "00000000-0000-4000-8000-000000000002";
const protect = vi.mocked(auth.protect);
const clientStatus = (status: string | null) =>
  vi.mocked(sql).mockResolvedValue((status ? [{ status }] : []) as never);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  protect.mockResolvedValue(mockAuth({ orgId: "org_1", userId: "user_1" }));
  vi.mocked(addressBelongsToOrgDb).mockResolvedValue(true);
  vi.mocked(checkOrgMemberLimit).mockResolvedValue(ok(undefined));
});

describe("updateRouteOrderDal", () => {
  it("rejects users without an org", async () => {
    protect.mockResolvedValue(mockAuth({ orgId: null }));
    const result = await updateRouteOrderDal(ADDRESS, 2);
    expect(result._unsafeUnwrapErr().reason).toBe("Unauthorized");
    expect(updateRouteOrderDb).not.toHaveBeenCalled();
  });

  it("rejects an invalid address id", async () => {
    const result = await updateRouteOrderDal("nope", 2);
    expect(result._unsafeUnwrapErr().reason).toBe("Invalid address ID");
  });

  it("rejects addresses from another org", async () => {
    vi.mocked(addressBelongsToOrgDb).mockResolvedValue(false);
    const result = await updateRouteOrderDal(ADDRESS, 2);
    expect(result._unsafeUnwrapErr().reason).toBe("Address not found");
    expect(updateRouteOrderDb).not.toHaveBeenCalled();
  });

  it("updates the sort order scoped to the org", async () => {
    vi.mocked(updateRouteOrderDb).mockResolvedValue({ id: ADDRESS } as never);
    const result = await updateRouteOrderDal(ADDRESS, 2);
    expect(result.isOk()).toBe(true);
    expect(updateRouteOrderDb).toHaveBeenCalledWith(ADDRESS, "org_1", 2);
  });

  it("maps database errors to a friendly reason", async () => {
    vi.mocked(updateRouteOrderDb).mockRejectedValue(new Error("db"));
    const result = await updateRouteOrderDal(ADDRESS, 2);
    expect(result._unsafeUnwrapErr().reason).toBe(
      "Failed to update route order",
    );
  });
});

describe("upsertScheduleDal", () => {
  it("is blocked when the org is over its member limit", async () => {
    vi.mocked(checkOrgMemberLimit).mockResolvedValue(
      err({ reason: "Too many members" }),
    );
    const result = await upsertScheduleDal(ADDRESS, "weekly", "2026-06-01");
    expect(result._unsafeUnwrapErr().reason).toBe("Too many members");
    expect(upsertScheduleDb).not.toHaveBeenCalled();
  });

  it.each([
    ["nope", "weekly", "Invalid address ID"],
    [ADDRESS, "", "Invalid frequency"],
  ])("validates input (%s, %j)", async (address, frequency, reason) => {
    const result = await upsertScheduleDal(address, frequency, "2026-06-01");
    expect(result._unsafeUnwrapErr().reason).toBe(reason);
  });

  it("returns not found for addresses in another org", async () => {
    clientStatus(null);
    const result = await upsertScheduleDal(ADDRESS, "weekly", "2026-06-01");
    expect(result._unsafeUnwrapErr().reason).toBe("Address not found");
  });

  it("is blocked for clients disabled by plan limits", async () => {
    clientStatus("disabled");
    const result = await upsertScheduleDal(ADDRESS, "weekly", "2026-06-01");
    expect(result._unsafeUnwrapErr().reason).toMatch(/disabled/);
    expect(upsertScheduleDb).not.toHaveBeenCalled();
  });

  it("saves the schedule for active clients", async () => {
    clientStatus("active");
    vi.mocked(upsertScheduleDb).mockResolvedValue({ id: "s1" } as never);
    const result = await upsertScheduleDal(
      ADDRESS,
      "weekly",
      "2026-06-01",
      "Back gate",
    );
    expect(result._unsafeUnwrap()).toEqual({ id: "s1" });
    expect(upsertScheduleDb).toHaveBeenCalledWith(
      ADDRESS,
      "org_1",
      "weekly",
      "2026-06-01",
      "Back gate",
    );
  });

  it("reports when the status check fails", async () => {
    vi.mocked(sql).mockRejectedValue(new Error("db"));
    const result = await upsertScheduleDal(ADDRESS, "weekly", "2026-06-01");
    expect(result._unsafeUnwrapErr().reason).toBe(
      "Failed to verify client status.",
    );
  });
});

describe("deleteScheduleDal", () => {
  it("returns not found for addresses in another org", async () => {
    clientStatus(null);
    const result = await deleteScheduleDal(ADDRESS);
    expect(result._unsafeUnwrapErr().reason).toBe("Address not found");
    expect(deleteScheduleDb).not.toHaveBeenCalled();
  });

  it("is blocked for disabled clients", async () => {
    clientStatus("disabled");
    const result = await deleteScheduleDal(ADDRESS);
    expect(result._unsafeUnwrapErr().reason).toMatch(/disabled/);
  });

  it("deletes the schedule and adds the org id", async () => {
    clientStatus("active");
    vi.mocked(deleteScheduleDb).mockResolvedValue({ id: "s1" } as never);
    const result = await deleteScheduleDal(ADDRESS);
    expect(result._unsafeUnwrap()).toEqual({ id: "s1", org_id: "org_1" });
    expect(deleteScheduleDb).toHaveBeenCalledWith(ADDRESS, "org_1");
  });

  it("fails when there was no schedule to delete", async () => {
    clientStatus("active");
    vi.mocked(deleteScheduleDb).mockResolvedValue(undefined);
    const result = await deleteScheduleDal(ADDRESS);
    expect(result._unsafeUnwrapErr().reason).toBe("Failed to delete schedule");
  });
});

describe("completeJobDal", () => {
  it("rejects addresses from another org", async () => {
    vi.mocked(addressBelongsToOrgDb).mockResolvedValue(false);
    const result = await completeJobDal(ADDRESS, "grass");
    expect(result._unsafeUnwrapErr().reason).toBe("Address not found");
    expect(insertCompletedJobDb).not.toHaveBeenCalled();
  });

  it("rejects an empty service type", async () => {
    const result = await completeJobDal(ADDRESS, "");
    expect(result._unsafeUnwrapErr().reason).toBe("Invalid service type");
  });

  it("records the job as the current user, without a photo", async () => {
    vi.mocked(insertCompletedJobDb).mockResolvedValue({ id: "j1" } as never);
    const result = await completeJobDal(ADDRESS, "grass", ["user_2"], "Done");

    expect(result._unsafeUnwrap()).toEqual({ id: "j1" });
    const args = vi.mocked(insertCompletedJobDb).mock.calls[0];
    expect(args.slice(0, 5)).toEqual([
      ADDRESS,
      "org_1",
      "grass",
      "user_1",
      ["user_2"],
    ]);
    expect(args[5]).toBeInstanceOf(Date);
    expect(args[7]).toBe("Done");
    expect(insertCompletionPhotoDb).not.toHaveBeenCalled();
  });

  it("stores the photo with its capture time", async () => {
    const capturedAt = new Date("2026-06-15T10:00:00Z");
    vi.mocked(insertCompletedJobDb).mockResolvedValue({ id: "j1" } as never);
    await completeJobDal(
      ADDRESS,
      "grass",
      null,
      null,
      "completion-1.jpg",
      capturedAt,
    );
    expect(insertCompletionPhotoDb).toHaveBeenCalledWith(
      "j1",
      "completion-1.jpg",
      capturedAt,
    );
  });

  it("fails if saving the photo fails", async () => {
    vi.mocked(insertCompletedJobDb).mockResolvedValue({ id: "j1" } as never);
    vi.mocked(insertCompletionPhotoDb).mockRejectedValue(new Error("db"));
    const result = await completeJobDal(ADDRESS, "grass", null, null, "p.jpg");
    expect(result._unsafeUnwrapErr().reason).toBe("Failed to complete job");
  });
});

describe("upsertAssignmentDal", () => {
  it("rejects addresses from another org", async () => {
    vi.mocked(addressBelongsToOrgDb).mockResolvedValue(false);
    const result = await upsertAssignmentDal(ADDRESS, "user_2", "2026-06-15");
    expect(result._unsafeUnwrapErr().reason).toBe("Address not found");
  });

  it.each([null, "unassigned"])(
    "removes the assignment when the user is %j",
    async (userId) => {
      vi.mocked(deleteAssignmentDb).mockResolvedValue(undefined);
      const result = await upsertAssignmentDal(ADDRESS, userId, "2026-06-15");
      expect(result._unsafeUnwrap()).toBeNull();
      expect(deleteAssignmentDb).toHaveBeenCalledWith(
        ADDRESS,
        "org_1",
        "2026-06-15",
      );
      expect(upsertAssignmentDb).not.toHaveBeenCalled();
    },
  );

  it("assigns a user for the date", async () => {
    vi.mocked(upsertAssignmentDb).mockResolvedValue({ id: "a1" } as never);
    const result = await upsertAssignmentDal(ADDRESS, "user_2", "2026-06-15");
    expect(result._unsafeUnwrap()).toEqual({ id: "a1" });
    expect(upsertAssignmentDb).toHaveBeenCalledWith(
      ADDRESS,
      "org_1",
      "user_2",
      "2026-06-15",
    );
  });
});

describe("updateAddressAssigneeDal", () => {
  it("clears the assignees for ['unassigned']", async () => {
    vi.mocked(updateAddressAssigneeDb).mockResolvedValue({
      id: ADDRESS,
    } as never);
    await updateAddressAssigneeDal(ADDRESS, ["unassigned"]);
    expect(updateAddressAssigneeDb).toHaveBeenCalledWith(
      ADDRESS,
      "org_1",
      null,
    );
  });

  it("saves several assignees", async () => {
    vi.mocked(updateAddressAssigneeDb).mockResolvedValue({
      id: ADDRESS,
    } as never);
    const result = await updateAddressAssigneeDal(ADDRESS, ["u1", "u2"]);
    expect(result.isOk()).toBe(true);
    expect(updateAddressAssigneeDb).toHaveBeenCalledWith(ADDRESS, "org_1", [
      "u1",
      "u2",
    ]);
  });

  it("fails when the address isn't in the org", async () => {
    vi.mocked(updateAddressAssigneeDb).mockResolvedValue(undefined as never);
    const result = await updateAddressAssigneeDal(ADDRESS, ["u1"]);
    expect(result._unsafeUnwrapErr().reason).toBe(
      "Failed to update address assignee",
    );
  });
});

describe("insertOneTimeServiceDal", () => {
  it.each([
    [["nope", "Aeration", "other"], "Invalid address ID"],
    [[ADDRESS, "", "other"], "Invalid name"],
    [[ADDRESS, "Aeration", ""], "Invalid service type"],
  ])("validates %j", async ([address, name, type], reason) => {
    const result = await insertOneTimeServiceDal(
      address,
      name,
      type,
      "2026-06-20",
    );
    expect(result._unsafeUnwrapErr().reason).toBe(reason);
  });

  it("rejects addresses from another org", async () => {
    vi.mocked(addressBelongsToOrgDb).mockResolvedValue(false);
    const result = await insertOneTimeServiceDal(
      ADDRESS,
      "Aeration",
      "other",
      "2026-06-20",
    );
    expect(result._unsafeUnwrapErr().reason).toBe("Address not found");
    expect(insertOneTimeServiceDb).not.toHaveBeenCalled();
  });

  it("creates the service in the caller's org", async () => {
    vi.mocked(insertOneTimeServiceDb).mockResolvedValue({
      id: SERVICE,
    } as never);
    const result = await insertOneTimeServiceDal(
      ADDRESS,
      "Aeration",
      "other",
      "2026-06-20",
      "Front only",
      ["u1"],
    );
    expect(result._unsafeUnwrap()).toEqual({ id: SERVICE });
    expect(insertOneTimeServiceDb).toHaveBeenCalledWith(
      ADDRESS,
      "org_1",
      "Aeration",
      "other",
      "2026-06-20",
      "Front only",
      ["u1"],
    );
  });
});

describe("deleteOneTimeServiceDal", () => {
  it("rejects an invalid id", async () => {
    const result = await deleteOneTimeServiceDal("nope");
    expect(result._unsafeUnwrapErr().reason).toBe("Invalid service ID");
  });

  it("deletes the service scoped to the org", async () => {
    vi.mocked(deleteOneTimeServiceDb).mockResolvedValue({
      id: SERVICE,
    } as never);
    const result = await deleteOneTimeServiceDal(SERVICE);
    expect(result._unsafeUnwrap()).toEqual({ id: SERVICE });
    expect(deleteOneTimeServiceDb).toHaveBeenCalledWith(SERVICE, "org_1");
  });

  // Known bug: when nothing is deleted (wrong id, or another org's service)
  // the DAL still reports success. Schedules and site maps return an error.
  it("fails when there was nothing to delete", async () => {
    vi.mocked(deleteOneTimeServiceDb).mockResolvedValue(undefined as never);
    const result = await deleteOneTimeServiceDal(SERVICE);
    expect(result.isErr()).toBe(true);
  });
});
