import { cacheTag } from "next/cache";
import type { UserMonthlyStatRow } from "@/types/types";
import { sql } from "../client";
export async function getPastServicesStatsDb(orgId: string) {
  "use cache";
  cacheTag(`past-services-stats-${orgId}`, `job-history-${orgId}`);

  const [result] = await sql`
    WITH 
    -- 1. Total Cuts
    total_cuts_cte AS (
      SELECT COUNT(*)::int as total_cuts 
      FROM completed_jobs 
      WHERE org_id = ${orgId}
    ),

    -- 2. Cuts By User (Aggregated into a JSON Array)
    cuts_by_user_cte AS (
      SELECT COALESCE(json_agg(t), '[]'::json) as cuts_by_user
      FROM (
        SELECT 
          COALESCE(u.full_name, cj.completed_by, 'Unassigned') as user_name,
          cj.completed_by as user_id,
          COUNT(cj.id)::int as count
        FROM completed_jobs cj
        LEFT JOIN users u ON cj.completed_by = u.user_id
        WHERE cj.org_id = ${orgId}
        GROUP BY user_name, cj.completed_by
        ORDER BY count DESC
      ) t
    ),

    -- 3. Cuts By Service Type (Aggregated into a JSON Array)
    cuts_by_service_cte AS (
      SELECT COALESCE(json_agg(t), '[]'::json) as cuts_by_service
      FROM (
        SELECT service_type, COUNT(*)::int as count
        FROM completed_jobs
        WHERE org_id = ${orgId}
        GROUP BY service_type
      ) t
    ),

    -- 4. Cuts By Day (Aggregated into a JSON Array)
    cuts_by_day_cte AS (
      SELECT COALESCE(json_agg(t), '[]'::json) as cuts_by_day
      FROM (
        SELECT completed_at::date as date, COUNT(*)::int as count
        FROM completed_jobs
        WHERE org_id = ${orgId}
        GROUP BY completed_at::date
        ORDER BY date DESC
        LIMIT 30
      ) t
    )

    -- Combine everything into a single row
    SELECT 
      tc.total_cuts,
      cu.cuts_by_user,
      cs.cuts_by_service,
      cd.cuts_by_day
    FROM total_cuts_cte tc
    CROSS JOIN cuts_by_user_cte cu
    CROSS JOIN cuts_by_service_cte cs
    CROSS JOIN cuts_by_day_cte cd;
  `;

  // Fallback structure in case the organization has zero data at all
  if (!result) {
    return {
      totalCuts: 0,
      cutsByUser: [],
      cutsByServiceType: [],
      cutsByDay: [],
    };
  }

  return {
    totalCuts: result.total_cuts,
    cutsByUser: result.cuts_by_user,
    cutsByServiceType: result.cuts_by_service,
    cutsByDay: result.cuts_by_day,
  };
}

export async function getPastServicesListDb(
  orgId: string,
  limit = 50,
  offset = 0,
  clientId?: string,
  search?: string,
) {
  "use cache";
  cacheTag(
    `past-services-list-${orgId}`,
    `job-history-${orgId}`,
    `past-services-list-${orgId}-${clientId || "none"}-${search || "none"}-${limit}-${offset}`,
  );

  const searchPattern = search ? `%${search}%` : null;

  const result = await sql`
    SELECT 
      cj.*,
      c.name as client_name,
      c.id as client_id,
      a.street,
      a.city,
      u_comp.full_name as completed_by_name,
      u_ass.full_name as assigned_to_name,
      COALESCE(
        (SELECT json_agg(cp.*) FROM completion_photos cp WHERE cp.completed_job_id = cj.id),
        '[]'::json
      ) as photos,
      COUNT(*) OVER() as total_count
    FROM completed_jobs cj
    JOIN addresses a ON cj.address_id = a.id
    JOIN clients c ON a.client_id = c.id
    LEFT JOIN users u_comp ON cj.completed_by = u_comp.user_id
    LEFT JOIN users u_ass ON cj.assigned_to = u_ass.user_id
    WHERE cj.org_id = ${orgId}
      AND (
        ${!clientId}::boolean OR c.id = ${clientId || null}
      )
      AND (
        ${!search}::boolean OR (
          c.name ILIKE ${searchPattern} OR
          a.street ILIKE ${searchPattern} OR
          a.city ILIKE ${searchPattern} OR
          u_comp.full_name ILIKE ${searchPattern} OR
          u_ass.full_name ILIKE ${searchPattern} OR
          cj.service_type ILIKE ${searchPattern} OR
          to_char(cj.completed_at, 'YYYY-MM-DD') ILIKE ${searchPattern} OR
          to_char(cj.scheduled_date, 'YYYY-MM-DD') ILIKE ${searchPattern}
        )
      )
    ORDER BY cj.completed_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return result;
}

export async function getMonthlyStatsDb(
  orgId: string,
  start: Date,
  end: Date,
): Promise<UserMonthlyStatRow[]> {
  const startDateStr = start.toISOString().split("T")[0];
  const endDateStr = end.toISOString().split("T")[0];

  const result = (await sql`
    WITH month_days AS (
      -- Generate every day for the target month
      SELECT generate_series(
        ${startDateStr}::date, 
        ${endDateStr}::date, 
        '1 day'::interval
      )::date AS day
    ),
    active_days AS (
      -- Filter to only today or future days in the month
      SELECT day 
      FROM month_days 
      WHERE day >= CURRENT_DATE
    ),
    projected_schedules AS (
      -- Project recurring schedules onto generated days
      SELECT 
        d.day,
        s.address_id,
        addr.assigned_to
      FROM active_days d
      CROSS JOIN schedules s
      JOIN addresses addr ON s.address_id = addr.id
      JOIN clients cl ON addr.client_id = cl.id
      WHERE cl.org_id = ${orgId}
        AND d.day >= s.first_cut_date::date
        AND (
          (LOWER(s.frequency) = 'weekly' AND (d.day - s.first_cut_date::date) % 7 = 0) OR
          (LOWER(s.frequency) = 'bi-weekly' AND (d.day - s.first_cut_date::date) % 14 = 0) OR
          (LOWER(s.frequency) = 'monthly' AND EXTRACT(DAY FROM d.day) = EXTRACT(DAY FROM s.first_cut_date::date))
        )
    ),
    uncompleted_schedules AS (
      -- Exclude instances that were already completed on that date
      SELECT ps.*
      FROM projected_schedules ps
      LEFT JOIN completed_jobs c 
        ON c.address_id = ps.address_id 
       AND (
         c.scheduled_date::date = ps.day 
         OR (c.scheduled_date IS NULL AND c.completed_at::date = ps.day)
       )
      WHERE c.id IS NULL
    ),
    scheduled_counts AS (
      -- Resolve final assigned user (prefer explicit day assignment over default)
      SELECT 
        COALESCE(a.user_id, us.assigned_to, 'unassigned') AS user_id,
        COUNT(*)::int AS scheduled_count
      FROM uncompleted_schedules us
      LEFT JOIN assignments a 
        ON a.address_id = us.address_id 
       AND a.scheduled_date = us.day
      GROUP BY 1
    ),
    completed_counts AS (
      -- Aggregate actual completed jobs by user for the month
      SELECT 
        COALESCE(completed_by, 'unassigned') AS user_id,
        COUNT(*)::int AS completed_count
      FROM completed_jobs
      WHERE org_id = ${orgId}
        AND completed_at >= ${start}
        AND completed_at <= ${end}
      GROUP BY 1
    )
    -- Full outer join completed vs scheduled to assemble final stats per user
    SELECT 
      COALESCE(c.user_id, s.user_id) AS id,
      COALESCE(u.full_name, 'Unassigned') AS name,
      COALESCE(c.completed_count, 0)::int AS completed,
      COALESCE(s.scheduled_count, 0)::int AS scheduled
    FROM completed_counts c
    FULL OUTER JOIN scheduled_counts s ON c.user_id = s.user_id
    LEFT JOIN users u ON u.user_id = COALESCE(c.user_id, s.user_id)
    ORDER BY completed DESC;
  `) as UserMonthlyStatRow[];

  return result;
}
