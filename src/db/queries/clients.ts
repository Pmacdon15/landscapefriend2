import { cacheTag } from "next/cache";
import type {
  AddressRow,
  AssignmentRow,
  ClientRow,
  CompletedJobRow,
  CompletionPhotoRow,
  DbClientResult,
  RouteOrderRow,
  ScheduleRow,
  SiteMapRow,
} from "@/types/types";
import type {
  ScheduleWithOrgSchema,
  SiteMapWithOrgSchema,
} from "@/zod/schemas";
import { sql } from "../client";
export async function getClientsDb(orgId: string): Promise<ClientRow[]> {
  "use cache";
  cacheTag(`clients-${orgId}`);
  const result = await sql`
    SELECT * FROM clients
    WHERE org_id = ${orgId}
    ORDER BY name ASC
  `;
  return result as unknown as ClientRow[];
}

export async function insertClientDb(
  orgId: string,
  name: string,
  email?: string | null,
  phone?: string | null,
): Promise<ClientRow> {
  const result = await sql`
    INSERT INTO clients (org_id, name, email, phone)
    VALUES (${orgId}, ${name}, ${email || null}, ${phone || null})
    RETURNING *
  `;
  return result[0] as unknown as ClientRow;
}

export async function updateClientDb(
  clientId: string,
  orgId: string,
  name: string,
  email?: string | null,
  phone?: string | null,
): Promise<ClientRow> {
  const result = await sql`
    UPDATE clients
    SET name = ${name}, email = ${email || null}, phone = ${phone || null}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${clientId} AND org_id = ${orgId}
    RETURNING *
  `;
  return result[0] as unknown as ClientRow;
}

export async function insertAddressDb(
  clientId: string,
  street: string,
  city: string,
  state?: string | null,
  zip?: string | null,
  status: "active" | "disabled" | "deleted" = "active",
  assignedTo?: string | null,
): Promise<AddressRow> {
  const result = await sql`
    INSERT INTO addresses (client_id, street, city, state, zip, status, assigned_to)
    VALUES (${clientId}, ${street}, ${city}, ${state || null}, ${zip || null}, ${status}, ${assignedTo || null})
    RETURNING *
  `;
  return result[0] as unknown as AddressRow;
}

export async function updateAddressDb(
  addressId: string,
  clientId: string,
  street: string,
  city: string,
  state?: string | null,
  zip?: string | null,
  status: "active" | "disabled" | "deleted" = "active",
  assignedTo?: string | null,
): Promise<AddressRow> {
  const result = await sql`
    UPDATE addresses
    SET street = ${street}, city = ${city}, state = ${state || null}, zip = ${zip || null}, status = ${status}, assigned_to = ${assignedTo || null}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${addressId} AND client_id = ${clientId}
    RETURNING *
  `;
  return result[0] as unknown as AddressRow;
}

export async function deleteAddressDb(
  addressId: string,
  clientId: string,
): Promise<void> {
  await sql`
    UPDATE addresses
    SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
    WHERE id = ${addressId} AND client_id = ${clientId}
  `;
}

export async function deleteClientDb(
  clientId: string,
  orgId: string,
): Promise<ClientRow> {
  const [client] = (await sql`
    DELETE FROM clients
    WHERE id = ${clientId} AND org_id = ${orgId} 
    RETURNING *
  `) as unknown as ClientRow[];

  return client;
}

export async function getAddressesDb(orgId: string): Promise<AddressRow[]> {
  "use cache";
  cacheTag(`addresses-${orgId}`);
  const result = await sql`
    SELECT a.* FROM addresses a
    JOIN clients c ON a.client_id = c.id
    WHERE c.org_id = ${orgId} AND a.status != 'deleted'
  `;
  return result as unknown as AddressRow[];
}

export async function getSchedulesDb(orgId: string): Promise<ScheduleRow[]> {
  "use cache";
  cacheTag(`schedules-${orgId}`);
  const result = await sql`
    SELECT s.* FROM schedules s
    JOIN addresses a ON s.address_id = a.id
    JOIN clients c ON a.client_id = c.id
    WHERE c.org_id = ${orgId} AND a.status != 'deleted'
  `;
  return result as unknown as ScheduleRow[];
}

export async function getRouteOrdersDb(
  orgId: string,
): Promise<RouteOrderRow[]> {
  "use cache";
  cacheTag(`route-order-${orgId}`);
  const result = await sql`
    SELECT * FROM route_orders
    WHERE org_id = ${orgId}
  `;
  return result as unknown as RouteOrderRow[];
}

export async function upsertScheduleDb(
  addressId: string,
  orgId: string,
  frequency: string,
  firstCutDate: string,
): Promise<ScheduleWithOrgSchema> {
  const results = (await sql`
    WITH upserted_schedule AS (
      INSERT INTO schedules (address_id, day_of_week, frequency, first_cut_date)
      VALUES (${addressId}, EXTRACT(DOW FROM ${firstCutDate}::DATE), ${frequency}, ${firstCutDate})
      ON CONFLICT (address_id)
      DO UPDATE SET
        day_of_week = EXCLUDED.day_of_week,
        frequency = EXCLUDED.frequency,
        first_cut_date = EXCLUDED.first_cut_date,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    ),
    inserted_order AS (
      INSERT INTO route_orders (address_id, org_id, sort_order)
      SELECT 
        ${addressId}, 
        ${orgId}, 
        COALESCE((SELECT MAX(sort_order) + 1000 FROM route_orders WHERE org_id = ${orgId}), 1000)
      WHERE NOT EXISTS (SELECT 1 FROM route_orders WHERE address_id = ${addressId})
      RETURNING 1
    )
    SELECT *, ${orgId} AS org_id FROM upserted_schedule;
  `) as unknown as ScheduleRow[];

  return results[0] as unknown as ScheduleWithOrgSchema;
}

export async function deleteScheduleDb(
  addressId: string,
): Promise<ScheduleRow | undefined> {
  const [row] = (await sql`
    DELETE FROM schedules
    WHERE address_id = ${addressId}
    RETURNING *
  `) as unknown as ScheduleRow[];
  return row;
}

export async function getAssignmentsDb(
  orgId: string,
  date: string,
): Promise<AssignmentRow[]> {
  "use cache";
  cacheTag(`assignments-${orgId}`, `assignments-${orgId}-${date}`);
  const result = await sql`
    SELECT * FROM assignments
    WHERE org_id = ${orgId} AND scheduled_date = ${date}
  `;
  return result as unknown as AssignmentRow[];
}

export async function upsertAssignmentDb(
  addressId: string,
  orgId: string,
  userId: string,
  date: string,
): Promise<AssignmentRow> {
  const result = await sql`
    INSERT INTO assignments (address_id, org_id, user_id, scheduled_date)
    VALUES (${addressId}, ${orgId}, ${userId}, ${date})
    ON CONFLICT (address_id, scheduled_date)
    DO UPDATE SET 
      user_id = EXCLUDED.user_id,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return result[0] as unknown as AssignmentRow;
}

export async function deleteAssignmentDb(
  addressId: string,
  date: string,
): Promise<void> {
  await sql`
    DELETE FROM assignments
    WHERE address_id = ${addressId} AND scheduled_date = ${date}
  `;
}

export async function getMockClientsDb(orgId: string): Promise<{
  clients: ClientRow[];
  addresses: AddressRow[];
  schedules: ScheduleRow[];
  routeOrders: RouteOrderRow[];
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day for easier matching

  const clients: ClientRow[] = [];
  const addresses: AddressRow[] = [];
  const schedules: ScheduleRow[] = [];
  const routeOrders: RouteOrderRow[] = [];

  let currentSortOrder = 1000;

  for (let i = 1; i <= 15; i++) {
    const clientId = `mock-client-${i}`;
    clients.push({
      id: clientId,
      org_id: orgId,
      name: `Client Name ${i}`,
      email: `client${i}@example.com`,
      phone: `555-${String(i).padStart(4, "0")}`,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // 1-2 addresses per client
    const numAddresses = i % 3 === 0 ? 2 : 1;
    for (let j = 1; j <= numAddresses; j++) {
      const addressId = `mock-address-${i}-${j}`;
      addresses.push({
        id: addressId,
        client_id: clientId,
        street: `${100 * i + j} Main St`,
        city: "Anytown",
        state: "CA",
        zip: "12345",
        status: "active",
        assigned_to: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Assign a schedule
      const nextCut = new Date(today);
      // Force the first 10 addresses to be cut today
      if (addresses.length <= 10) {
        nextCut.setDate(today.getDate());
      } else {
        nextCut.setDate(today.getDate() + ((i + j) % 7) + 1); // Scatter dates a bit
      }

      schedules.push({
        id: `mock-schedule-${i}-${j}`,
        address_id: addressId,
        day_of_week: nextCut.getDay(),
        frequency: i % 2 === 0 ? "bi-weekly" : "weekly",
        first_cut_date: nextCut,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Assign route order
      routeOrders.push({
        address_id: addressId,
        org_id: orgId,
        sort_order: currentSortOrder,
        created_at: new Date(),
        updated_at: new Date(),
      });
      currentSortOrder += 1000;
    }
  }

  return { clients, addresses, schedules, routeOrders };
}

export async function updateRouteOrderDb(
  addressId: string,
  orgId: string,
  newSortOrder: number,
): Promise<RouteOrderRow> {
  const result = (await sql`
    INSERT INTO route_orders (address_id, org_id, sort_order)
    VALUES (${addressId}, ${orgId}, ${newSortOrder})
    ON CONFLICT (address_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `) as unknown as RouteOrderRow[];
  return result[0];
}

export async function updateAddressAssigneeDb(
  addressId: string,
  assignedTo: string | null,
): Promise<AddressRow> {
  const [row] = (await sql`
    WITH updated AS (
      UPDATE addresses
      SET assigned_to = ${assignedTo}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${addressId}
      RETURNING *
    )
    SELECT u.*, c.org_id
    FROM updated u
    JOIN clients c ON u.client_id = c.id
  `) as unknown as AddressRow[];

  return row;
}

export async function insertCompletedJobDb(
  addressId: string,
  orgId: string,
  serviceType: "grass" | "snow",
  completedBy?: string | null,
  assignedTo?: string | null,
  completedAt: Date = new Date(),
  capturedAt: Date | null = null,
  notes?: string | null,
  scheduledDate: Date | null = null,
): Promise<CompletedJobRow> {
  const result = await sql`
    INSERT INTO completed_jobs (address_id, org_id, service_type, completed_by, assigned_to, completed_at, captured_at, notes, scheduled_date)
    VALUES (${addressId}, ${orgId}, ${serviceType}, ${completedBy || null}, ${assignedTo || null}, ${completedAt}, ${capturedAt}, ${notes || null}, ${scheduledDate})
    RETURNING *
  `;
  return result[0] as unknown as CompletedJobRow;
}

export async function getCompletedJobsDb(
  orgId: string,
  date?: string,
): Promise<CompletedJobRow[]> {
  "use cache";
  cacheTag(`job-history-${orgId}`);
  if (date) {
    cacheTag(`job-history-${orgId}-${date}`);
  }
  const result = date
    ? await sql`
    SELECT cj.*, 
           COALESCE(
             (SELECT json_agg(cp.*) FROM completion_photos cp WHERE cp.completed_job_id = cj.id),
             '[]'::json
           ) as photos
    FROM completed_jobs cj
    WHERE cj.org_id = ${orgId} AND (cj.completed_at::date = ${date}::date OR cj.scheduled_date = ${date}::date)
  `
    : await sql`
    SELECT cj.*, 
           COALESCE(
             (SELECT json_agg(cp.*) FROM completion_photos cp WHERE cp.completed_job_id = cj.id),
             '[]'::json
           ) as photos
    FROM completed_jobs cj
    WHERE cj.org_id = ${orgId}
    ORDER BY cj.completed_at DESC
  `;
  return result as unknown as CompletedJobRow[];
}

export async function insertCompletionPhotoDb(
  completedJobId: string,
  blobPath: string,
  capturedAt: Date | null = null,
): Promise<CompletionPhotoRow> {
  const result = await sql`
    INSERT INTO completion_photos (completed_job_id, blob_path, captured_at)
    VALUES (${completedJobId}, ${blobPath}, ${capturedAt})
    RETURNING *
  `;
  return result[0] as unknown as CompletionPhotoRow;
}

export async function getSiteMapsDb(orgId: string): Promise<SiteMapRow[]> {
  "use cache";
  cacheTag(`sitemaps-${orgId}`);
  const result = await sql`
    SELECT sm.* FROM site_maps sm
    JOIN addresses a ON sm.address_id = a.id
    JOIN clients c ON a.client_id = c.id
    WHERE c.org_id = ${orgId}
  `;
  return result as unknown as SiteMapRow[];
}

export async function insertSiteMapDb(
  addressId: string,
  name: string | null,
  notes: string | null,
  blobPath: string | null,
  mapData: Record<string, unknown> | null,
): Promise<SiteMapWithOrgSchema> {
  const jsonMapData = mapData ? JSON.stringify(mapData) : null;

  const [row] = (await sql`
    INSERT INTO site_maps (address_id, name, notes, blob_path, map_data)
    VALUES (${addressId}, ${name}, ${notes}, ${blobPath}, ${jsonMapData})
    RETURNING *
  `) as unknown as SiteMapRow[];

  const [orgRow] = (await sql`
    SELECT c.org_id FROM addresses a
    JOIN clients c ON a.client_id = c.id
    WHERE a.id = ${addressId}
  `) as unknown as { org_id: string }[];

  return { ...row, org_id: orgRow.org_id };
}

export async function updateSiteMapDb(
  siteMapId: string,
  name: string | null,
  notes: string | null,
  mapData: Record<string, unknown> | null,
): Promise<SiteMapWithOrgSchema> {
  const jsonMapData = mapData ? JSON.stringify(mapData) : null;

  const [row] = (await sql`
    UPDATE site_maps
    SET name = ${name}, notes = ${notes}, map_data = ${jsonMapData}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${siteMapId}
    RETURNING *
  `) as unknown as SiteMapRow[];

  const [orgRow] = (await sql`
    SELECT c.org_id FROM site_maps sm
    JOIN addresses a ON sm.address_id = a.id
    JOIN clients c ON a.client_id = c.id
    WHERE sm.id = ${siteMapId}
  `) as unknown as { org_id: string }[];

  return { ...row, org_id: orgRow.org_id };
}

export async function deleteSiteMapDb(
  siteMapId: string,
): Promise<SiteMapWithOrgSchema> {
  const [info] = (await sql`
    SELECT c.org_id FROM site_maps sm
    JOIN addresses a ON sm.address_id = a.id
    JOIN clients c ON a.client_id = c.id
    WHERE sm.id = ${siteMapId}
  `) as unknown as { org_id: string }[];

  const [row] = (await sql`
    DELETE FROM site_maps
    WHERE id = ${siteMapId}
    RETURNING *
  `) as unknown as SiteMapRow[];

  return { ...row, org_id: info?.org_id };
}

export async function getSiteMapWithOrgDb(
  siteMapId: string,
  orgId: string,
): Promise<SiteMapRow | null> {
  const result = await sql`
    SELECT sm.* FROM site_maps sm
    JOIN addresses a ON sm.address_id = a.id
    JOIN clients c ON a.client_id = c.id
    WHERE sm.id = ${siteMapId} AND c.org_id = ${orgId}
  `;
  return (result[0] as unknown as SiteMapRow) || null;
}

export async function getCompletionPhotoWithOrgDb(
  photoId: string,
  orgId: string,
): Promise<{ id: string; blob_path: string } | null> {
  const result = await sql`
    SELECT cp.id, cp.blob_path FROM completion_photos cp
    JOIN completed_jobs cj ON cp.completed_job_id = cj.id
    JOIN addresses a ON cj.address_id = a.id
    JOIN clients c ON a.client_id = c.id
    WHERE cp.id = ${photoId} AND cj.org_id = ${orgId}
  `;
  return (result[0] as { id: string; blob_path: string }) || null;
}

export async function searchClientsDb(
  orgId: string,
  query: string,
  matchedAssigneeIds: string[] = [],
): Promise<DbClientResult[]> {
  "use cache";
  cacheTag(
    `clients-search-${orgId}-${query}-${matchedAssigneeIds.sort().join("-")}`,
    `clients-search-${orgId}`,
  );
  const searchPattern = `%${query}%`;
  const hasAssignees = matchedAssigneeIds.length > 0;

  const result = (await sql`
    WITH filtered_clients AS (
      SELECT DISTINCT c.*
      FROM clients c
      LEFT JOIN addresses a ON c.id = a.client_id AND a.status != 'deleted'
      LEFT JOIN schedules s ON a.id = s.address_id
      LEFT JOIN LATERAL (
        SELECT CASE
          WHEN s.frequency = 'weekly' THEN
            s.first_cut_date + (7 * CEIL(GREATEST(0, (CURRENT_DATE - s.first_cut_date)::int)::numeric / 7))::int * INTERVAL '1 day'
          WHEN s.frequency = 'bi-weekly' THEN
            s.first_cut_date + (14 * CEIL(GREATEST(0, (CURRENT_DATE - s.first_cut_date)::int)::numeric / 14))::int * INTERVAL '1 day'
          WHEN s.frequency = 'monthly' THEN
            (
              date_trunc('month', CURRENT_DATE) + 
              (EXTRACT(DAY FROM s.first_cut_date) - 1) * INTERVAL '1 day' +
              CASE 
                WHEN EXTRACT(DAY FROM CURRENT_DATE) > EXTRACT(DAY FROM s.first_cut_date) THEN INTERVAL '1 month' 
                ELSE INTERVAL '0' 
              END
            )::date
          ELSE NULL
        END::date AS next_date
      ) nd ON true
      WHERE c.org_id = ${orgId}
      AND (
        c.name ILIKE ${searchPattern} OR
        c.email ILIKE ${searchPattern} OR
        c.phone ILIKE ${searchPattern} OR
        a.street ILIKE ${searchPattern} OR
        a.city ILIKE ${searchPattern} OR
        a.zip ILIKE ${searchPattern} OR
        (${hasAssignees}::boolean AND a.assigned_to = ANY(${matchedAssigneeIds}::text[])) OR
        (nd.next_date IS NOT NULL AND (
          to_char(nd.next_date, 'FMMonth') ILIKE ${searchPattern} OR
          to_char(nd.next_date, 'FMMonth FMDD') ILIKE ${searchPattern} OR
          to_char(nd.next_date, 'YYYY-MM-DD') ILIKE ${searchPattern} OR
          to_char(nd.next_date, 'FMMM/FMDD/YYYY') ILIKE ${searchPattern} OR
          to_char(nd.next_date, 'FMMonth FMDDth') ILIKE ${searchPattern}
        ))
      )
    )
    SELECT 
      fc.id,
      fc.org_id,
      fc.name,
      fc.email,
      fc.phone,
      0 as total_count, -- Not needed for this non-paginated search
      COALESCE(
        (
          SELECT jsonb_agg(addr_data ORDER BY addr_data.street ASC)
          FROM (
            SELECT 
              a.id,
              a.client_id,
              a.street,
              a.city,
              a.state,
              a.zip,
              a.status,
              a.assigned_to,
              COALESCE((SELECT ro.sort_order FROM route_orders ro WHERE ro.address_id = a.id), 0)::float as sort_order,
              (
                SELECT jsonb_build_object(
                  'id', ass.id,
                  'address_id', ass.address_id,
                  'user_id', ass.user_id,
                  'scheduled_date', to_char(ass.scheduled_date, 'YYYY-MM-DD')
                )
                FROM assignments ass
                WHERE ass.address_id = a.id
                ORDER BY ass.scheduled_date DESC
                LIMIT 1
              ) as assignment,
              (
                SELECT jsonb_build_object(
                  'id', s.id,
                  'address_id', s.address_id,
                  'frequency', s.frequency,
                  'day_of_week', s.day_of_week,
                  'first_cut_date', to_char(s.first_cut_date, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                )
                FROM schedules s 
                WHERE s.address_id = a.id
              ) as schedule,
              COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', sm.id,
                      'address_id', sm.address_id,
                      'name', sm.name,
                      'notes', sm.notes,
                      'map_data', sm.map_data,
                      'blob_path', sm.blob_path,
                      'created_at', to_char(sm.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                    ) ORDER BY sm.created_at DESC
                  ) 
                  FROM site_maps sm 
                  WHERE sm.address_id = a.id
                ), 
                '[]'::jsonb
              ) as site_maps,
              (
                SELECT jsonb_build_object(
                  'id', cj.id,
                  'address_id', cj.address_id,
                  'org_id', cj.org_id,
                  'service_type', cj.service_type,
                  'assigned_to', cj.assigned_to,
                  'completed_by', cj.completed_by,
                  'completed_at', to_char(cj.completed_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                  'notes', cj.notes,
                  'photos', COALESCE(
                    (
                      SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', cp.id,
                          'completed_job_id', cp.completed_job_id,
                          'blob_path', cp.blob_path,
                          'created_at', to_char(cp.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                        ) ORDER BY cp.created_at DESC
                      ) 
                      FROM completion_photos cp 
                      WHERE cp.completed_job_id = cj.id
                    ),
                    '[]'::jsonb
                  )
                )
                FROM completed_jobs cj
                WHERE cj.address_id = a.id
                ORDER BY cj.completed_at DESC
                LIMIT 1
              ) as completed_job
            FROM addresses a
            WHERE a.client_id = fc.id AND a.status != 'deleted'
          ) addr_data
        ),
        '[]'::jsonb
      ) as addresses
    FROM filtered_clients fc
    ORDER BY fc.name ASC;
  `) as unknown as DbClientResult[];

  return result;
}

export async function getClientByIdDb(
  id: string,
  orgId: string,
): Promise<ClientRow | null> {
  "use cache";
  cacheTag(`client-${id}-${orgId}`, `client-${orgId}`);
  cacheTag("days");
  const result = await sql`
    SELECT * FROM clients
    WHERE id = ${id} AND org_id = ${orgId}
  `;
  return (result[0] as unknown as ClientRow) || null;
}

export async function getClientsForCutListDb(
  orgId: string,
  date: string,
  targetUserId?: string,
  showAll = false,
  searchQuery?: string,
  clientId?: string,
): Promise<DbClientResult[]> {
  "use cache";
  cacheTag(`clients-cutlist-${orgId}-${date}`, `clients-cutlist-${orgId}`);
  if (targetUserId && !showAll) {
    cacheTag(`clients-cutlist-${orgId}-${date}-${targetUserId}`);
  }
  if (searchQuery) {
    cacheTag(`clients-cutlist-${orgId}-${date}-search-${searchQuery}`);
  }
  if (clientId) {
    cacheTag(`clients-cutlist-${orgId}-${date}-client-${clientId}`);
  }

  const searchPattern = searchQuery ? `%${searchQuery}%` : null;

  const result = (await sql`
    WITH scheduled_addresses AS (
      SELECT 
        a.*,
        s.frequency,
        s.first_cut_date,
        s.day_of_week as schedule_dow,
        ro.sort_order,
        ass.user_id as assignment_user_id,
        ass.id as assignment_id,
        ass.scheduled_date as assignment_date
      FROM addresses a
      JOIN schedules s ON a.id = s.address_id
      JOIN clients c ON a.client_id = c.id
      LEFT JOIN route_orders ro ON a.id = ro.address_id
      LEFT JOIN assignments ass ON a.id = ass.address_id AND ass.scheduled_date = ${date}::date
      WHERE c.org_id = ${orgId} 
        AND a.status = 'active'
        AND s.first_cut_date <= ${date}::date
        AND (
          s.frequency = 'daily' OR
          (s.frequency = 'weekly' AND ((${date}::date - s.first_cut_date) % 7) = 0) OR
          (s.frequency = 'bi-weekly' AND ((${date}::date - s.first_cut_date) % 14) = 0) OR
          (s.frequency = 'monthly' AND EXTRACT(DAY FROM s.first_cut_date) = EXTRACT(DAY FROM ${date}::date))
        )
        AND (
          ${!clientId}::boolean OR c.id = ${clientId || null}
        )
        AND (
          ${!searchQuery}::boolean OR
          c.name ILIKE ${searchPattern} OR
          a.street ILIKE ${searchPattern} OR
          a.city ILIKE ${searchPattern}
        )
    ),
    filtered_addresses AS (
      SELECT * FROM scheduled_addresses
      WHERE 
        ${showAll}::boolean OR 
        COALESCE(assignment_user_id, assigned_to) = ${targetUserId || null}
    )
    SELECT 
      c.id,
      c.org_id,
      c.name,
      c.email,
      c.phone,
      COALESCE(
        (
          SELECT jsonb_agg(addr_data ORDER BY addr_data.sort_order ASC)
          FROM (
            SELECT 
              fa.id,
              fa.client_id,
              fa.street,
              fa.city,
              fa.state,
              fa.zip,
              fa.status,
              fa.assigned_to,
              COALESCE(fa.sort_order, 0)::float as sort_order,
              (
                SELECT jsonb_build_object(
                  'id', fa.assignment_id,
                  'address_id', fa.id,
                  'user_id', fa.assignment_user_id,
                  'scheduled_date', to_char(fa.assignment_date, 'YYYY-MM-DD')
                )
                WHERE fa.assignment_id IS NOT NULL
              ) as assignment,
              jsonb_build_object(
                'id', s.id,
                'address_id', s.address_id,
                'frequency', s.frequency,
                'day_of_week', s.day_of_week,
                'first_cut_date', to_char(s.first_cut_date, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
              ) as schedule,
              COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', sm.id,
                      'address_id', sm.address_id,
                      'name', sm.name,
                      'notes', sm.notes,
                      'map_data', sm.map_data,
                      'blob_path', sm.blob_path,
                      'created_at', to_char(sm.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                    ) ORDER BY sm.created_at DESC
                  ) 
                  FROM site_maps sm 
                  WHERE sm.address_id = fa.id
                ), 
                '[]'::jsonb
              ) as site_maps,
              (
                SELECT jsonb_build_object(
                  'id', cj.id,
                  'address_id', cj.address_id,
                  'org_id', cj.org_id,
                  'service_type', cj.service_type,
                  'assigned_to', cj.assigned_to,
                  'completed_by', cj.completed_by,
                  'completed_at', to_char(cj.completed_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                  'notes', cj.notes,
                  'photos', COALESCE(
                    (
                      SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', cp.id,
                          'completed_job_id', cp.completed_job_id,
                          'blob_path', cp.blob_path,
                          'created_at', to_char(cp.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                        ) ORDER BY cp.created_at DESC
                      ) 
                      FROM completion_photos cp 
                      WHERE cp.completed_job_id = cj.id
                    ),
                    '[]'::jsonb
                  )
                )
                FROM completed_jobs cj
                WHERE cj.address_id = fa.id AND (cj.completed_at::date = ${date}::date OR cj.scheduled_date = ${date}::date)
                ORDER BY cj.completed_at DESC
                LIMIT 1
              ) as completed_job
            FROM filtered_addresses fa
            JOIN schedules s ON fa.id = s.address_id
            WHERE fa.client_id = c.id
          ) addr_data
        ),
        '[]'::jsonb
      ) as addresses
    FROM clients c
    WHERE c.id IN (SELECT client_id FROM filtered_addresses)
    ORDER BY (SELECT MIN(sort_order) FROM filtered_addresses WHERE client_id = c.id) ASC;
  `) as unknown as DbClientResult[];

  return result;
}

export async function getClientsForInfoDb(
  orgId: string,
  limit: number,
  offset: number,
  searchQuery?: string,
  matchedAssigneeIds: string[] = [],
  clientId?: string,
): Promise<DbClientResult[]> {
  "use cache";
  const searchPattern = searchQuery ? `%${searchQuery}%` : null;
  const hasAssignees = matchedAssigneeIds.length > 0;

  cacheTag(`clients-info-${orgId}`);
  if (searchQuery) {
    cacheTag(`clients-info-search-${orgId}-${searchQuery}`);
  }
  if (clientId) {
    cacheTag(`clients-info-client-${orgId}-${clientId}`);
  }

  const result = (await sql`
    WITH filtered_clients AS (
      SELECT DISTINCT c.*
      FROM clients c
      LEFT JOIN addresses a ON c.id = a.client_id AND a.status != 'deleted'
      LEFT JOIN schedules s ON a.id = s.address_id
      LEFT JOIN LATERAL (
        SELECT CASE
          WHEN s.frequency = 'weekly' THEN
            s.first_cut_date + (7 * CEIL(GREATEST(0, (CURRENT_DATE - s.first_cut_date)::int)::numeric / 7))::int * INTERVAL '1 day'
          WHEN s.frequency = 'bi-weekly' THEN
            s.first_cut_date + (14 * CEIL(GREATEST(0, (CURRENT_DATE - s.first_cut_date)::int)::numeric / 14))::int * INTERVAL '1 day'
          WHEN s.frequency = 'monthly' THEN
            (
              date_trunc('month', CURRENT_DATE) + 
              (EXTRACT(DAY FROM s.first_cut_date) - 1) * INTERVAL '1 day' +
              CASE 
                WHEN EXTRACT(DAY FROM CURRENT_DATE) > EXTRACT(DAY FROM s.first_cut_date) THEN INTERVAL '1 month' 
                ELSE INTERVAL '0' 
              END
            )::date
          ELSE NULL
        END::date AS next_date
      ) nd ON true
      WHERE c.org_id = ${orgId}
      AND (
        ${!clientId}::boolean OR c.id = ${clientId || null}
      )
      AND (
        ${!searchQuery}::boolean OR
        c.name ILIKE ${searchPattern} OR
        c.email ILIKE ${searchPattern} OR
        c.phone ILIKE ${searchPattern} OR
        a.street ILIKE ${searchPattern} OR
        a.city ILIKE ${searchPattern} OR
        a.zip ILIKE ${searchPattern} OR
        (${hasAssignees}::boolean AND a.assigned_to = ANY(${matchedAssigneeIds}::text[])) OR
        (nd.next_date IS NOT NULL AND (
          to_char(nd.next_date, 'FMMonth') ILIKE ${searchPattern} OR
          to_char(nd.next_date, 'FMMonth FMDD') ILIKE ${searchPattern} OR
          to_char(nd.next_date, 'YYYY-MM-DD') ILIKE ${searchPattern} OR
          to_char(nd.next_date, 'FMMM/FMDD/YYYY') ILIKE ${searchPattern} OR
          to_char(nd.next_date, 'FMMonth FMDDth') ILIKE ${searchPattern}
        ))
      )
    ),
    total_count AS (
      SELECT count(*) as count FROM filtered_clients
    ),
    paginated_clients AS (
      SELECT * FROM filtered_clients
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    )
    SELECT 
      pc.id,
      pc.org_id,
      pc.name,
      pc.email,
      pc.phone,
      (SELECT count FROM total_count)::int as total_count,
      COALESCE(
        (
          SELECT jsonb_agg(addr_data ORDER BY addr_data.street ASC)
          FROM (
            SELECT 
              a.id,
              a.client_id,
              a.street,
              a.city,
              a.state,
              a.zip,
              a.status,
              a.assigned_to,
              COALESCE((SELECT ro.sort_order FROM route_orders ro WHERE ro.address_id = a.id), 0)::float as sort_order,
              (
                SELECT jsonb_build_object(
                  'id', ass.id,
                  'address_id', ass.address_id,
                  'user_id', ass.user_id,
                  'scheduled_date', to_char(ass.scheduled_date, 'YYYY-MM-DD')
                )
                FROM assignments ass
                WHERE ass.address_id = a.id
                ORDER BY ass.scheduled_date DESC
                LIMIT 1
              ) as assignment,
              (
                SELECT jsonb_build_object(
                  'id', s.id,
                  'address_id', s.address_id,
                  'frequency', s.frequency,
                  'day_of_week', s.day_of_week,
                  'first_cut_date', to_char(s.first_cut_date, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                )
                FROM schedules s 
                WHERE s.address_id = a.id
              ) as schedule,
              COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', sm.id,
                      'address_id', sm.address_id,
                      'name', sm.name,
                      'notes', sm.notes,
                      'map_data', sm.map_data,
                      'blob_path', sm.blob_path,
                      'created_at', to_char(sm.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                    ) ORDER BY sm.created_at DESC
                  ) 
                  FROM site_maps sm 
                  WHERE sm.address_id = a.id
                ), 
                '[]'::jsonb
              ) as site_maps,
              (
                SELECT jsonb_build_object(
                  'id', cj.id,
                  'address_id', cj.address_id,
                  'org_id', cj.org_id,
                  'service_type', cj.service_type,
                  'assigned_to', cj.assigned_to,
                  'completed_by', cj.completed_by,
                  'completed_at', to_char(cj.completed_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                  'notes', cj.notes,
                  'photos', COALESCE(
                    (
                      SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', cp.id,
                          'completed_job_id', cp.completed_job_id,
                          'blob_path', cp.blob_path,
                          'created_at', to_char(cp.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                        ) ORDER BY cp.created_at DESC
                      ) 
                      FROM completion_photos cp 
                      WHERE cp.completed_job_id = cj.id
                    ),
                    '[]'::jsonb
                  )
                )
                FROM completed_jobs cj
                WHERE cj.address_id = a.id
                ORDER BY cj.completed_at DESC
                LIMIT 1
              ) as completed_job
            FROM addresses a
            WHERE a.client_id = pc.id AND a.status != 'deleted'
          ) addr_data
        ),
        '[]'::jsonb
      ) as addresses
    FROM paginated_clients pc
    ORDER BY pc.name ASC;
  `) as unknown as DbClientResult[];

  return result;
}
