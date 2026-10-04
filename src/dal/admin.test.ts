import { auth } from "@clerk/nextjs/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMonthlyStatsDb,
  getPastServicesListDb,
  getPastServicesStatsDb,
} from "@/db/queries/admin";
import { mockAuth } from "../../tests/helpers/clerk";
import {
  getMonthlyStatsDal,
  getPastServicesListDal,
  getPastServicesStatsDal,
} from "./admin";

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: vi.fn() } }));
vi.mock("@/db/queries/admin", () => ({
  getMonthlyStatsDb: vi.fn(),
  getPastServicesListDb: vi.fn(),
  getPastServicesStatsDb: vi.fn(),
}));

const protect = vi.mocked(auth.protect);

const admin = (features: string[]) =>
  mockAuth({ orgId: "org_1", orgRole: "org:admin", features });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getPastServicesStatsDal", () => {
  const empty = {
    totalCuts: 0,
    cutsByUser: [],
    cutsByServiceType: [],
    cutsByDay: [],
  };

  it("returns empty stats for non-admins", async () => {
    protect.mockResolvedValue(
      mockAuth({ orgRole: "org:member", features: ["stats"] }),
    );
    expect(await getPastServicesStatsDal()).toEqual(empty);
    expect(getPastServicesStatsDb).not.toHaveBeenCalled();
  });

  it("returns empty stats when the plan lacks the stats feature", async () => {
    protect.mockResolvedValue(admin([]));
    expect(await getPastServicesStatsDal()).toEqual(empty);
    expect(getPastServicesStatsDb).not.toHaveBeenCalled();
  });

  it("queries the caller's org for admins with the feature", async () => {
    protect.mockResolvedValue(admin(["stats"]));
    const stats = { ...empty, totalCuts: 12 };
    vi.mocked(getPastServicesStatsDb).mockResolvedValue(stats as never);
    expect(await getPastServicesStatsDal()).toEqual(stats);
    expect(getPastServicesStatsDb).toHaveBeenCalledWith("org_1");
  });

  it("falls back to empty stats when the query fails", async () => {
    protect.mockResolvedValue(admin(["stats"]));
    vi.mocked(getPastServicesStatsDb).mockRejectedValue(new Error("db down"));
    expect(await getPastServicesStatsDal()).toEqual(empty);
  });
});

describe("getPastServicesListDal", () => {
  it("requires the history feature", async () => {
    protect.mockResolvedValue(admin(["stats"]));
    expect(await getPastServicesListDal()).toEqual({ data: [], totalPages: 0 });
    expect(getPastServicesListDb).not.toHaveBeenCalled();
  });

  it("pages 10 at a time and passes filters through", async () => {
    protect.mockResolvedValue(admin(["history"]));
    vi.mocked(getPastServicesListDb).mockResolvedValue([] as never);
    await getPastServicesListDal(3, "client_1", "maple");
    expect(getPastServicesListDb).toHaveBeenCalledWith(
      "org_1",
      10,
      20,
      "client_1",
      "maple",
    );
  });

  it("reports at least one page when there are no results", async () => {
    protect.mockResolvedValue(admin(["history"]));
    vi.mocked(getPastServicesListDb).mockResolvedValue([] as never);
    expect(await getPastServicesListDal()).toEqual({ data: [], totalPages: 1 });
  });

  // Regression (#59): totalPages used to equal the row count.
  it("computes total pages from the total row count", async () => {
    protect.mockResolvedValue(admin(["history"]));
    vi.mocked(getPastServicesListDb).mockResolvedValue([
      { id: "j1", total_count: 45 },
    ] as never);
    const result = await getPastServicesListDal();
    expect(result.totalPages).toBe(5);
  });
});

describe("getMonthlyStatsDal", () => {
  it("sums completed jobs across users for the requested month", async () => {
    protect.mockResolvedValue(admin(["stats"]));
    vi.mocked(getMonthlyStatsDb).mockResolvedValue([
      { userId: "u1", completed: 4 },
      { userId: "u2", completed: 6 },
    ] as never);

    const result = await getMonthlyStatsDal("2026-03");

    expect(result.monthName).toBe("March");
    expect(result.totalCompleted).toBe(10);
    const [orgId, start, end] = vi.mocked(getMonthlyStatsDb).mock.calls[0];
    expect(orgId).toBe("org_1");
    expect(start).toEqual(new Date(2026, 2, 1));
    expect(end.getMonth()).toBe(2);
    expect(end.getDate()).toBe(31);
  });

  it("falls back to the current month for an invalid month param", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    protect.mockResolvedValue(admin(["stats"]));
    vi.mocked(getMonthlyStatsDb).mockResolvedValue([] as never);

    const result = await getMonthlyStatsDal("not-a-month");

    expect(result.monthName).toBe("June");
    vi.useRealTimers();
  });

  it("returns zeroed stats for unauthorized users", async () => {
    protect.mockResolvedValue(mockAuth({ orgRole: "org:member" }));
    const result = await getMonthlyStatsDal("2026-03");
    expect(result).toEqual({
      monthName: "March",
      totalCompleted: 0,
      userStats: [],
    });
    expect(getMonthlyStatsDb).not.toHaveBeenCalled();
  });
});
