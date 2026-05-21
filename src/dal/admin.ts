import { auth } from "@clerk/nextjs/server";
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  startOfDay,
  startOfMonth,
} from "date-fns";
import {
  getMonthlyStatsRawDb,
  getPastServicesListDb,
  getPastServicesStatsDb,
} from "@/db/queries/admin";
import type {
  AssignmentRow,
  CompletedJobRow,
  ScheduleRow,
} from "@/types/types";

export interface PastServicesStats {
  totalCuts: number;
  cutsByUser: {
    user_name: string;
    user_id: string | null;
    count: number;
  }[];
  cutsByServiceType: {
    service_type: string;
    count: number;
  }[];
  cutsByDay: {
    date: Date;
    count: number;
  }[];
}

export interface PastServiceItem extends CompletedJobRow {
  client_name: string;
  client_id: string;
  street: string;
  city: string;
  completed_by_name: string | null;
  assigned_to_name: string | null;
  photos: {
    id: string;
    blob_path: string;
    created_at: Date;
  }[];
}

export interface MonthlyStats {
  monthName: string;
  totalCompleted: number;
  userStats: {
    id: string;
    name: string;
    completed: number;
    scheduled: number;
  }[];
}

export async function getPastServicesStatsDal(): Promise<PastServicesStats> {
  const { orgId, orgRole } = await auth.protect();
  if (!orgId || orgRole !== "org:admin") throw new Error("Unauthorized");

  try {
    const stats = await getPastServicesStatsDb(orgId);
    return stats as unknown as PastServicesStats;
  } catch (error) {
    console.error("Error in getPastServicesStatsDal:", error);
    return {
      totalCuts: 0,
      cutsByUser: [],
      cutsByServiceType: [],
      cutsByDay: [],
    };
  }
}

export async function getPastServicesListDal(
  page = 1,
  clientId?: string,
  search?: string,
): Promise<{ data: PastServiceItem[]; totalPages: number }> {
  const { orgId, orgRole } = await auth.protect();
  if (!orgId || orgRole !== "org:admin") throw new Error("Unauthorized");

  try {
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const list = await getPastServicesListDb(
      orgId,
      pageSize,
      offset,
      clientId,
      search,
    );
    const totalCount =
      list.length > 0
        ? Number((list[0] as { total_count: number }).total_count)
        : 0;

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: list as unknown as PastServiceItem[],
      totalPages,
    };
  } catch (error) {
    console.error("Error in getPastServicesListDal:", error);
    return { data: [], totalPages: 0 };
  }
}

export async function getMonthlyStatsDal(): Promise<MonthlyStats> {
  const { orgId, orgRole } = await auth.protect();
  if (!orgId || orgRole !== "org:admin") throw new Error("Unauthorized");

  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const today = startOfDay(now);

  try {
    const { completedJobs, schedules, assignments } =
      await getMonthlyStatsRawDb(orgId, start, end);

    const userStats: Record<
      string,
      {
        id: string;
        name: string;
        completed: number;
        scheduled: number;
      }
    > = {};

    const typedCompletedJobs = completedJobs as (CompletedJobRow & {
      completed_by_name: string | null;
    })[];
    const typedAssignments = assignments as (AssignmentRow & {
      user_name: string | null;
    })[];
    const typedSchedules = schedules as (ScheduleRow & {
      assigned_to: string | null;
      assigned_to_name: string | null;
    })[];

    // Process Completed
    typedCompletedJobs.forEach((job) => {
      const userId = job.completed_by || "unassigned";
      if (!userStats[userId]) {
        userStats[userId] = {
          id: userId,
          name:
            job.completed_by_name ||
            (userId === "unassigned" ? "Unassigned" : "Unknown"),
          completed: 0,
          scheduled: 0,
        };
      }
      userStats[userId].completed++;
    });

    // Process Scheduled (Future)
    const assignmentMap = new Map<string, { id: string; name: string }>();
    typedAssignments.forEach((a) => {
      assignmentMap.set(`${a.address_id}-${a.scheduled_date}`, {
        id: a.user_id,
        name: a.user_name || "Unknown",
      });
    });

    for (let d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) {
      const isFuture = isAfter(d, today);
      const isToday = d.getTime() === today.getTime();

      if (!isFuture && !isToday) continue;

      const dateStr = d.toISOString().split("T")[0];

      for (const s of typedSchedules) {
        const firstCut = startOfDay(new Date(s.first_cut_date));
        const diff = differenceInCalendarDays(d, firstCut);
        if (diff < 0) continue;

        let isScheduled = false;
        const freq = s.frequency.toLowerCase();
        if (freq === "daily")
          isScheduled = false; // Snow is as-needed, not pre-scheduled
        else if (diff === 0) isScheduled = true;
        else if (freq === "weekly") isScheduled = diff % 7 === 0;
        else if (freq === "bi-weekly") isScheduled = diff % 14 === 0;
        else if (freq === "monthly")
          isScheduled = d.getDate() === firstCut.getDate();

        if (isScheduled) {
          // Check if this specific instance was already completed
          const alreadyDone = typedCompletedJobs.some((j) => {
            if (j.address_id !== s.address_id) return false;

            // If we have a scheduled_date, use it to match the instance
            if (j.scheduled_date) {
              return (
                format(new Date(j.scheduled_date), "yyyy-MM-dd") === dateStr
              );
            }

            return format(new Date(j.completed_at), "yyyy-MM-dd") === dateStr;
          });

          if (alreadyDone) continue;

          const assignment = assignmentMap.get(`${s.address_id}-${dateStr}`);
          const userId = assignment?.id || s.assigned_to || "unassigned";
          const userName =
            assignment?.name || s.assigned_to_name || "Unassigned";

          if (!userStats[userId]) {
            userStats[userId] = {
              id: userId,
              name: userName,
              completed: 0,
              scheduled: 0,
            };
          }
          userStats[userId].scheduled++;
        }
      }
    }

    return {
      monthName: format(now, "MMMM"),
      totalCompleted: typedCompletedJobs.length,
      userStats: Object.values(userStats).sort(
        (a, b) => b.completed - a.completed,
      ),
    };
  } catch (error) {
    console.error("Error in getMonthlyStatsDal:", error);
    return {
      monthName: format(now, "MMMM"),
      totalCompleted: 0,
      userStats: [],
    };
  }
}
