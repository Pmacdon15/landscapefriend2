import { auth } from "@clerk/nextjs/server";
import { ok, type Result } from "neverthrow";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { sql } from "@/db/client";
import { checkOrgMemberLimit } from "@/db/queries/clerk";
import {
  addressBelongsToOrgDb,
  deleteAssignmentDb,
  deleteOneTimeServiceDb,
  deleteScheduleDb,
  insertCompletedJobDb,
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

/**
 * Security regression tests for the service DAL: who may call each write.
 * Tenant scoping (another org's address) is covered in service.test.ts.
 */

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
const row = { id: "row_1", org_id: "org_1" } as never;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(addressBelongsToOrgDb).mockResolvedValue(true);
  vi.mocked(checkOrgMemberLimit).mockResolvedValue(ok(undefined));
  vi.mocked(sql).mockResolvedValue([{ status: "active" }] as never);
  for (const write of [
    deleteAssignmentDb,
    deleteOneTimeServiceDb,
    deleteScheduleDb,
    insertCompletedJobDb,
    insertOneTimeServiceDb,
    updateAddressAssigneeDb,
    updateRouteOrderDb,
    upsertAssignmentDb,
    upsertScheduleDb,
  ]) {
    (write as unknown as Mock).mockResolvedValue(row);
  }
});

type Write = {
  name: string;
  run: () => Promise<Result<unknown, { reason: string }>>;
  db: unknown;
};

// Every write in the service DAL, with the query it must not reach.
const writes: Write[] = [
  {
    name: "updateRouteOrderDal",
    run: () => updateRouteOrderDal(ADDRESS, 2),
    db: updateRouteOrderDb,
  },
  {
    name: "upsertScheduleDal",
    run: () => upsertScheduleDal(ADDRESS, "weekly", "2026-06-01"),
    db: upsertScheduleDb,
  },
  {
    name: "deleteScheduleDal",
    run: () => deleteScheduleDal(ADDRESS),
    db: deleteScheduleDb,
  },
  {
    name: "completeJobDal",
    run: () => completeJobDal(ADDRESS, "grass"),
    db: insertCompletedJobDb,
  },
  {
    name: "upsertAssignmentDal",
    run: () => upsertAssignmentDal(ADDRESS, "user_2", "2026-06-01"),
    db: upsertAssignmentDb,
  },
  {
    name: "updateAddressAssigneeDal",
    run: () => updateAddressAssigneeDal(ADDRESS, ["user_2"]),
    db: updateAddressAssigneeDb,
  },
  {
    name: "insertOneTimeServiceDal",
    run: () =>
      insertOneTimeServiceDal(ADDRESS, "Aeration", "other", "2026-06-01"),
    db: insertOneTimeServiceDb,
  },
  {
    name: "deleteOneTimeServiceDal",
    run: () => deleteOneTimeServiceDal(SERVICE),
    db: deleteOneTimeServiceDb,
  },
];

describe("unauthenticated callers", () => {
  it.each(writes)("$name never reaches the database", async ({ run, db }) => {
    // auth.protect() throws (redirect / 404) when there is no session.
    protect.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;404"));
    await run().catch(() => undefined);
    expect(db).not.toHaveBeenCalled();
    expect(sql).not.toHaveBeenCalled();
  });
});

describe("signed-in users without an organization", () => {
  it.each(writes)("$name is rejected", async ({ run, db }) => {
    protect.mockResolvedValue(mockAuth({ orgId: null }));
    const result = await run();
    expect(result._unsafeUnwrapErr().reason).toBe("Unauthorized");
    expect(db).not.toHaveBeenCalled();
  });
});

describe("org members (crew) on their own route", () => {
  // Crews reorder and complete their own route, so these stay member-level.
  it.each(
    writes.filter((w) =>
      ["updateRouteOrderDal", "completeJobDal"].includes(w.name),
    ),
  )("$name is allowed", async ({ run, db }) => {
    protect.mockResolvedValue(mockAuth({ orgId: "org_1" }));
    const result = await run();
    expect(result.isOk()).toBe(true);
    expect(db).toHaveBeenCalled();
  });
});

// The UI only offers these on the admin-only client info page, but server
// actions can be called directly by any signed-in member.
describe("admin-only service writes (#80)", () => {
  const adminOnly = writes.filter(
    (w) => !["updateRouteOrderDal", "completeJobDal"].includes(w.name),
  );

  it.each(adminOnly)("$name rejects non-admin members", async ({ run, db }) => {
    protect.mockResolvedValue(mockAuth({ orgId: "org_1" }));
    const result = await run();
    expect(result.isErr()).toBe(true);
    expect(db).not.toHaveBeenCalled();
  });

  it.each(adminOnly)("$name still works for admins", async ({ run, db }) => {
    protect.mockResolvedValue(
      mockAuth({ orgId: "org_1", orgRole: "org:admin" }),
    );
    const result = await run();
    expect(result.isOk()).toBe(true);
    expect(db).toHaveBeenCalled();
  });
});
