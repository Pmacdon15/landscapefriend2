import { auth } from "@clerk/nextjs/server";
import { endOfMonth, format, startOfMonth } from "date-fns";
import {
  getMonthlyStatsDb,
  getPastServicesListDb,
  getPastServicesStatsDb,
} from "@/db/queries/admin";
import type {
  MonthlyStats,
  PastServiceItem,
  PastServicesStats,
} from "@/types/types";

export async function getPastServicesStatsDal(): Promise<PastServicesStats> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "stats" })) {
    console.error("Unauthorized in getPastServicesStatsDal");
    return {
      totalCuts: 0,
      cutsByUser: [],
      cutsByServiceType: [],
      cutsByDay: [],
    };
  }

  return await getPastServicesStatsDb(orgId).catch((error) => {
    console.error("Error in getPastServicesStatsDal:", error);
    return {
      totalCuts: 0,
      cutsByUser: [],
      cutsByServiceType: [],
      cutsByDay: [],
    };
  });
}

export async function getPastServicesListDal(
  page = 1,
  clientId?: string,
  search?: string,
): Promise<{ data: PastServiceItem[]; totalPages: number }> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "history" })) {
    console.error("Unauthorized in getPastServicesListDal");
    return { data: [], totalPages: 0 };
  }

  return await getPastServicesListDb(
    orgId,
    10,
    (page - 1) * 10,
    clientId,
    search,
  )
    .then((list) => {
      return {
        data: list as unknown as PastServiceItem[],
        totalPages: Math.max(
          1,
          Math.ceil(
            list.length > 0
              ? Number((list[0] as { total_count: number }).total_count)
              : 0 / 10,
          ),
        ),
      };
    })
    .catch((e) => {
      console.error("Error in getPastServicesListDal:", e);
      return { data: [], totalPages: 0 };
    });
}

export async function getMonthlyStatsDal(
  monthParam?: string,
): Promise<MonthlyStats> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  let now = new Date();
  if (monthParam) {
    const [year, month] = monthParam.split("-").map(Number);
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      now = new Date(year, month - 1, 1);
    }
  }

  if (!orgId || !isAdmin || !has({ feature: "stats" })) {
    console.error("Unauthorized in getMonthlyStatsDal");
    return {
      monthName: format(now, "MMMM"),
      totalCompleted: 0,
      userStats: [],
    };
  }

  return await getMonthlyStatsDb(orgId, startOfMonth(now), endOfMonth(now))
    .then((userStats) => ({
      monthName: format(now, "MMMM"),
      totalCompleted: userStats.reduce((acc, curr) => acc + curr.completed, 0),
      userStats,
    }))
    .catch((e) => {
      console.error("Error in getMonthlyStatsDal:", e);
      return {
        monthName: format(now, "MMMM"),
        totalCompleted: 0,
        userStats: [],
      };
    });
}
