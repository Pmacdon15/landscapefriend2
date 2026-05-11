import type {
  AddressRow,
  AssignmentRow,
  ClientRow,
  CompletedJobRow,
  RouteOrderRow,
  ScheduleRow,
} from "@/types/types";
import { sql } from "../client";

export async function getClientsDb(orgId: string): Promise<ClientRow[]> {
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
): Promise<void> {
  // Rely on ON DELETE CASCADE for schedules, route_orders, completed_jobs, assignments, and addresses.
  // We just need to delete the client record.
  await sql`
    DELETE FROM clients
    WHERE id = ${clientId} AND org_id = ${orgId}
  `;
}

export async function getAddressesDb(orgId: string): Promise<AddressRow[]> {
  const result = await sql`
    SELECT a.* FROM addresses a
    JOIN clients c ON a.client_id = c.id
    WHERE c.org_id = ${orgId} AND a.status != 'deleted'
  `;
  return result as unknown as AddressRow[];
}

export async function getSchedulesDb(orgId: string): Promise<ScheduleRow[]> {
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
  const result = await sql`
    SELECT * FROM route_orders
    WHERE org_id = ${orgId}
  `;
  return result as unknown as RouteOrderRow[];
}

export async function upsertScheduleDb(
  addressId: string,
  frequency: string,
  nextCutDate: Date,
): Promise<ScheduleRow> {
  const dayOfWeek = nextCutDate.getDay();
  const result = await sql`
    INSERT INTO schedules (address_id, day_of_week, frequency, next_cut_date)
    VALUES (${addressId}, ${dayOfWeek}, ${frequency}, ${nextCutDate})
    ON CONFLICT (address_id) 
    DO UPDATE SET 
      day_of_week = EXCLUDED.day_of_week,
      frequency = EXCLUDED.frequency,
      next_cut_date = EXCLUDED.next_cut_date,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return result[0] as unknown as ScheduleRow;
}

export async function getAssignmentsDb(
  orgId: string,
  date: string,
): Promise<AssignmentRow[]> {
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
        next_cut_date: nextCut,
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
): Promise<void> {
  await sql`
    INSERT INTO route_orders (address_id, org_id, sort_order)
    VALUES (${addressId}, ${orgId}, ${newSortOrder})
    ON CONFLICT (address_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_at = CURRENT_TIMESTAMP
  `;
}

export async function updateAddressAssigneeDb(
  addressId: string,
  assignedTo: string | null,
): Promise<void> {
  await sql`
    UPDATE addresses
    SET assigned_to = ${assignedTo}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${addressId}
  `;
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
  date: string,
): Promise<CompletedJobRow[]> {
  const result = await sql`
    SELECT cj.*, 
           COALESCE(
             (SELECT json_agg(cp.*) FROM completion_photos cp WHERE cp.completed_job_id = cj.id),
             '[]'::json
           ) as photos
    FROM completed_jobs cj
    WHERE cj.org_id = ${orgId} AND cj.completed_at::date = ${date}::date
  `;
  return result as unknown as CompletedJobRow[];
}

export async function getCompletedJobsHistoryDb(
  orgId: string,
): Promise<CompletedJobRow[]> {
  const result = await sql`
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
  mapData: any | null,
): Promise<SiteMapRow> {
  // Ensure mapData is passed as a string for JSONB to avoid driver issues with arrays/objects
  const jsonMapData = mapData ? JSON.stringify(mapData) : null;
  const result = await sql`
    INSERT INTO site_maps (address_id, name, blob_path, map_data)
    VALUES (${addressId}, ${name}, ${blobPath}, ${jsonMapData})
    RETURNING *
  `;
  return result[0] as unknown as SiteMapRow;
}

export async function deleteSiteMapDb(siteMapId: string): Promise<void> {
  await sql`
    DELETE FROM site_maps
    WHERE id = ${siteMapId}
  `;
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
