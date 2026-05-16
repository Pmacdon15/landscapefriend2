import { cacheTag } from "next/cache";
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
) {
  "use cache";
  cacheTag(`past-services-list-${orgId}`, `job-history-${orgId}`);

  const result = await sql`
    SELECT 
      cj.*,
      c.name as client_name,
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
    ORDER BY cj.completed_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return result;
}

export async function getMonthlyStatsRawDb(
  orgId: string,
  startDate: Date,
  endDate: Date,
) {
  "use cache";
  cacheTag(`monthly-stats-${orgId}`, `job-history-${orgId}`);

  // Convert dates to ISO strings for the assignments table filter consistency
  const startIsoStr = startDate.toISOString().split("T")[0];
  const endIsoStr = endDate.toISOString().split("T")[0];

  const [result] = await sql`
    WITH 
    -- 1. Completed Jobs Aggregation
    completed_jobs_cte AS (
      SELECT COALESCE(json_agg(t), '[]'::json) as completed_jobs
      FROM (
        SELECT cj.*, u.full_name as completed_by_name
        FROM completed_jobs cj
        LEFT JOIN users u ON cj.completed_by = u.user_id
        WHERE cj.org_id = ${orgId} 
          AND cj.completed_at >= ${startDate} 
          AND cj.completed_at <= ${endDate}
      ) t
    ),

    -- 2. Schedules Aggregation
    schedules_cte AS (
      SELECT COALESCE(json_agg(t), '[]'::json) as schedules
      FROM (
        SELECT s.*, a.assigned_to, u.full_name as assigned_to_name
        FROM schedules s
        JOIN addresses a ON s.address_id = a.id
        JOIN clients c ON a.client_id = c.id
        LEFT JOIN users u ON a.assigned_to = u.user_id
        WHERE c.org_id = ${orgId} AND a.status != 'deleted'
      ) t
    ),

    -- 3. Assignments Aggregation
    assignments_cte AS (
      SELECT COALESCE(json_agg(t), '[]'::json) as assignments
      FROM (
        SELECT ass.*, u.full_name as user_name
        FROM assignments ass
        LEFT JOIN users u ON ass.user_id = u.user_id
        WHERE ass.org_id = ${orgId} 
          AND ass.scheduled_date >= ${startIsoStr}
          AND ass.scheduled_date <= ${endIsoStr}
      ) t
    )

    -- Combine into a single payload row
    SELECT 
      cj.completed_jobs,
      s.schedules,
      a.assignments
    FROM completed_jobs_cte cj
    CROSS JOIN schedules_cte s
    CROSS JOIN assignments_cte a;
  `;

  if (!result) {
    return { completedJobs: [], schedules: [], assignments: [] };
  }

  return {
    completedJobs: result.completed_jobs,
    schedules: result.schedules,
    assignments: result.assignments,
  };
}
