import { cacheTag } from "next/cache";
import type {
  AddressRow,
  AssignmentRow,
  ClientRow,
  CompletedJobRow,
  CompletionPhotoRow,
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
  const [row] = (await sql`
    INSERT INTO schedules (address_id, day_of_week, frequency, first_cut_date)
    VALUES (${addressId}, EXTRACT(DOW FROM ${firstCutDate}::DATE), ${frequency}, ${firstCutDate})
    ON CONFLICT (address_id) 
    DO UPDATE SET 
      day_of_week = EXCLUDED.day_of_week,
      frequency = EXCLUDED.frequency,
      first_cut_date = EXCLUDED.first_cut_date,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `) as unknown as ScheduleRow[];

  return { ...row, org_id: orgId };
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
  cacheTag(`assignments-${orgId}`);
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
  `) as unknown as RouteOrderRow;
  return result;
}

export async function updateAddressAssigneeDb(
  addressId: string,
  assignedTo: string | null,
): Promise<AddressRow> {
  // Destructure the first element [row] from the results array
  const [row] = (await sql`
    UPDATE addresses
    SET assigned_to = ${assignedTo}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${addressId} 
    RETURNING *
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
): Promise<CompletedJobRow> {
  const result = await sql`
    INSERT INTO completed_jobs (address_id, org_id, service_type, completed_by, assigned_to, completed_at, captured_at, notes)
    VALUES (${addressId}, ${orgId}, ${serviceType}, ${completedBy || null}, ${assignedTo || null}, ${completedAt}, ${capturedAt}, ${notes || null})
    RETURNING *
  `;
  return result[0] as unknown as CompletedJobRow;
}

export async function getCompletedJobsDb(
  orgId: string,
  date?: string,
): Promise<CompletedJobRow[]> {
  "use cache";
  cacheTag(`job-history-${orgId}-${date ?? ""}`);
  const result = date
    ? await sql`
    SELECT cj.*, 
           COALESCE(
             (SELECT json_agg(cp.*) FROM completion_photos cp WHERE cp.completed_job_id = cj.id),
             '[]'::json
           ) as photos
    FROM completed_jobs cj
    WHERE cj.org_id = ${orgId} AND cj.completed_at::date = ${date}::date
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
  blobPath: string | null,
  mapData: Record<string, unknown> | null,
): Promise<SiteMapWithOrgSchema> {
  const jsonMapData = mapData ? JSON.stringify(mapData) : null;

  const [row] = (await sql`
    INSERT INTO site_maps (address_id, name, blob_path, map_data)
    VALUES (${addressId}, ${name}, ${blobPath}, ${jsonMapData})
    RETURNING *
  `) as unknown as SiteMapRow[];

  const [orgRow] = (await sql`
    SELECT c.org_id FROM addresses a
    JOIN clients c ON a.client_id = c.id
    WHERE a.id = ${addressId}
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
): Promise<ClientRow[]> {
  "use cache";
  cacheTag(
    `clients-search${orgId}-${query}-${matchedAssigneeIds.sort().join("-")}`,
  );
  const searchPattern = `%${query}%`;
  const hasAssignees = matchedAssigneeIds.length > 0;

  const result = await sql`
    SELECT DISTINCT c.*
    FROM clients c
    LEFT JOIN addresses a ON c.id = a.client_id AND a.status != 'deleted'
    WHERE c.org_id = ${orgId}
    AND (
      c.name ILIKE ${searchPattern} OR
      c.email ILIKE ${searchPattern} OR
      c.phone ILIKE ${searchPattern} OR
      a.street ILIKE ${searchPattern} OR
      a.city ILIKE ${searchPattern} OR
      a.zip ILIKE ${searchPattern} OR
      (${hasAssignees}::boolean AND a.assigned_to = ANY(${matchedAssigneeIds}::text[]))
    )
    ORDER BY c.name ASC
  `;
  return result as unknown as ClientRow[];
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
