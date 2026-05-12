import { auth, clerkClient } from "@clerk/nextjs/server";
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { errAsync, type Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import type { AddressRow, ClientRow, ScheduleRow } from "@/types/types";
import {
  deleteAddressDb,
  deleteAssignmentDb,
  deleteClientDb,
  deleteSiteMapDb,
  getAddressesDb,
  getAssignmentsDb,
  getClientByIdDb,
  getClientsDb,
  getCompletedJobsDb,
  getCompletedJobsHistoryDb,
  getRouteOrdersDb,
  getSchedulesDb,
  getSiteMapsDb,
  insertAddressDb,
  insertClientDb,
  insertCompletedJobDb,
  insertCompletionPhotoDb,
  insertSiteMapDb,
  searchClientsDb,
  updateAddressAssigneeDb,
  updateAddressDb,
  updateClientDb,
  updateRouteOrderDb,
  upsertAssignmentDb,
  upsertScheduleDb,
} from "../db/queries/clients";
import {
  type Address,
  type AddressInputSchema,
  type Assignment,
  type Client,
  type CompletedJob,
  type CreateClientInput,
  CreateClientInputSchema,
  type Schedule,
  type SiteMap,
} from "../zod/schemas";

export type { Client, Address, Schedule, CompletedJob, Assignment };

export interface CutListItem {
  client: {
    id: string;
    name: string;
  };
  address: Address;
}

export async function getClientsForInfoDal(
  page: number,
  searchQuery?: string,
): Promise<{ clients: Client[]; totalPages: number }> {
  const { orgId } = await auth();
  // await new Promise((resolve) => setTimeout(resolve, 2000));
  let matchedAssigneeIds: string[] = [];
  if (searchQuery) {
    const members = await getOrganizationMembersDal();
    matchedAssigneeIds = members
      .filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((m) => m.id);
  }

  const [clients, addresses, schedules, siteMaps, jobHistory] =
    await Promise.all([
      searchQuery
        ? searchClientsDb(orgId, searchQuery, matchedAssigneeIds)
        : getClientsDb(orgId),
      getAddressesDb(orgId),
      getSchedulesDb(orgId),
      getSiteMapsDb(orgId),
      getCompletedJobsHistoryDb(orgId),
    ]);

  const mappedClients = clients.map((client: ClientRow) => {
    const clientAddresses = addresses
      .filter(
        (a: AddressRow) => a.client_id === client.id && a.status !== "deleted",
      )
      .map((address: AddressRow) => {
        const schedule = schedules.find(
          (s: ScheduleRow) => s.address_id === address.id,
        );
        const addressSiteMaps = siteMaps.filter(
          (sm) => sm.address_id === address.id,
        );
        // Find latest completed job for basic preview, but we could provide the whole array
        const latestJob = jobHistory.find((j) => j.address_id === address.id);

        return {
          ...address,
          schedule: schedule || null,
          sort_order: 0,
          assignment: null,
          completed_job: latestJob || null,
          site_maps: addressSiteMaps,
        } as Address;
      });

    return { ...client, addresses: clientAddresses } as Client;
  });

  const allClients = mappedClients;
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(allClients.length / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const paginatedClients = allClients.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return { clients: paginatedClients, totalPages };
}

export async function getClientsForCutListDal(
  date: string,
): Promise<CutListItem[]> {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) throw new Error("Unauthorized");

  const [
    clients,
    addresses,
    schedules,
    routeOrders,
    assignments,
    completedJobs,
    siteMaps,
  ] = await Promise.all([
    getClientsDb(orgId),
    getAddressesDb(orgId),
    getSchedulesDb(orgId),
    getRouteOrdersDb(orgId),
    getAssignmentsDb(orgId, date),
    getCompletedJobsDb(orgId, date),
    getSiteMapsDb(orgId),
  ]);

  // Create lookup maps for O(1) access
  const scheduleMap = new Map(schedules.map((s) => [s.address_id, s]));
  const orderMap = new Map(
    routeOrders?.map((r) => [r.address_id, r.sort_order]),
  );
  const assignmentMap = new Map(assignments.map((a) => [a.address_id, a]));
  const jobMap = new Map(completedJobs.map((j) => [j.address_id, j]));
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const siteMapGroupMap = new Map<string, any[]>();
  for (const sm of siteMaps) {
    const group = siteMapGroupMap.get(sm.address_id) || [];
    group.push(sm);
    siteMapGroupMap.set(sm.address_id, group);
  }

  const targetDate = startOfDay(parseISO(date));

  // Map directly over addresses instead of nesting under clients
  const results = addresses
    .filter((addr) => addr.status !== "deleted")
    .map((addr) => {
      const schedule = scheduleMap.get(addr.id);
      if (!schedule) return null;

      // Normalize dates to avoid timezone issues (use UTC to avoid local day shifts)
      const scheduleDateStr =
        schedule.next_cut_date instanceof Date
          ? schedule.next_cut_date.toISOString().split("T")[0]
          : String(schedule.next_cut_date).split("T")[0];
      const scheduleDate = parseISO(scheduleDateStr);
      const diffDays = differenceInCalendarDays(targetDate, scheduleDate);
      if (diffDays < 0) return null;

      let isScheduled = false;
      const freq = schedule.frequency.toLowerCase();

      if (freq === "daily") isScheduled = true;
      else if (diffDays === 0) isScheduled = true;
      else if (freq === "weekly") isScheduled = diffDays % 7 === 0;
      else if (freq === "bi-weekly") isScheduled = diffDays % 14 === 0;
      else if (freq === "monthly")
        isScheduled = targetDate.getUTCDate() === scheduleDate.getUTCDate();
      else isScheduled = schedule.day_of_week === targetDate.getUTCDay();

      if (!isScheduled) return null;

      // Check Assignment
      const assignment = assignmentMap.get(addr.id);
      const assigneeId = assignment?.user_id || addr.assigned_to;

      if (assigneeId !== userId) return null;

      const client = clientMap.get(addr.client_id);
      if (!client) return null;

      return {
        client: { id: client.id, name: client.name },
        address: {
          ...addr,
          schedule,
          sort_order: orderMap.get(addr.id) ?? 0,
          assignment: assignment ?? null,
          completed_job: jobMap.get(addr.id) ?? null,
          site_maps: siteMapGroupMap.get(addr.id) || [],
        } as Address,
      };
    })
    .filter((item): item is CutListItem => item !== null);

  return results.sort((a, b) => a.address.sort_order - b.address.sort_order);
}

export async function updateRouteOrderDal(
  addressId: string,
  newSortOrder: number,
): Promise<Result<void, { reason: string }>> {
  const { orgId } = await auth();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.string().uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  const parsedSortOrder = z.number().safeParse(newSortOrder);
  if (!parsedSortOrder.success)
    return errAsync({ reason: "Invalid sort order" });

  return ResultAsync.fromPromise(
    updateRouteOrderDb(parsedAddressId.data, orgId, parsedSortOrder.data),
    () => ({ reason: "Failed to update route order" }),
  );
}

export async function createClientDal(
  data: CreateClientInput,
): Promise<Result<Client, { reason: string }>> {
  const { orgId } = await auth();
  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const result = CreateClientInputSchema.safeParse(data);
  if (!result.success) return errAsync({ reason: result.error.message });

  const { name, email, phone, addresses } = result.data;

  // Wrap the entire DB transaction logic
  return ResultAsync.fromPromise(
    (async () => {
      const client = await insertClientDb(
        orgId,
        name,
        email ?? null,
        phone ?? null,
      );

      const createdAddresses = await Promise.all(
        addresses.map((addr) =>
          insertAddressDb(
            client.id,
            addr.street,
            addr.city,
            addr.state,
            addr.zip,
            addr.status,
            addr.assigned_to,
          ),
        ),
      );

      return {
        ...client,
        addresses: createdAddresses.map((addr) => ({
          ...addr,
          sort_order: 0,
          schedule: null,
          assignment: null,
          completed_job: null,
        })),
      } as Client;
    })(),
    () => ({ reason: "Database command failed" }),
  );
}

export async function updateClientDal(
  clientId: string,
  data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    addresses: z.infer<typeof AddressInputSchema>[];
  },
): Promise<Result<Client, { reason: string }>> {
  const { orgId } = await auth();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const clientIdResult = z.string().uuid().safeParse(clientId);
  if (!clientIdResult.success) return errAsync({ reason: "Invalid client ID" });

  const result = CreateClientInputSchema.safeParse(data);
  if (!result.success) return errAsync({ reason: result.error.message });

  const { name, email, phone, addresses } = result.data;
  const parsedClientId = clientIdResult.data;

  return ResultAsync.fromPromise(
    (async () => {
      const updatedClient = await updateClientDb(
        parsedClientId,
        orgId,
        name,
        email || null,
        phone || null,
      );

      const finalAddresses: Address[] = [];

      for (const addr of addresses) {
        if (addr.id) {
          if (addr.status === "deleted") {
            await deleteAddressDb(addr.id, parsedClientId);
          } else {
            const updatedAddr = await updateAddressDb(
              addr.id,
              parsedClientId,
              addr.street,
              addr.city,
              addr.state,
              addr.zip,
              addr.status,
              addr.assigned_to,
            );
            finalAddresses.push({
              ...updatedAddr,
              sort_order: 0,
              schedule: null,
              assignment: null,
              completed_job: null,
            } as Address);
          }
        } else if (addr.status !== "deleted") {
          const newAddr = await insertAddressDb(
            parsedClientId,
            addr.street,
            addr.city,
            addr.state,
            addr.zip,
            addr.status,
            addr.assigned_to,
          );
          finalAddresses.push({
            ...newAddr,
            sort_order: 0,
            schedule: null,
            assignment: null,
            completed_job: null,
          } as Address);
        }
      }

      return {
        ...updatedClient,
        addresses: finalAddresses,
      } as Client;
    })(),
    () => ({ reason: "Failed to update client" }),
  );
}

export async function upsertScheduleDal(
  addressId: string,
  frequency: string,
  nextCutDate: Date,
): Promise<Result<Schedule, { reason: string }>> {
  const { orgId } = await auth();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.string().uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  const parsedFrequency = z.string().min(1).safeParse(frequency);
  if (!parsedFrequency.success)
    return errAsync({ reason: "Invalid frequency" });

  const parsedDate = z.date().safeParse(nextCutDate);
  if (!parsedDate.success) return errAsync({ reason: "Invalid date" });

  return ResultAsync.fromPromise(
    upsertScheduleDb(
      parsedAddressId.data,
      parsedFrequency.data,
      parsedDate.data,
    ) as Promise<Schedule>,
    () => ({ reason: "Failed to update schedule" }),
  );
}

export async function completeJobDal(
  addressId: string,
  serviceType: "grass" | "snow",
  assignedTo?: string | null,
  notes?: string | null,
  photoBlobPath?: string | null,
  capturedAt?: Date | null,
  completedAt?: Date | null,
): Promise<Result<CompletedJob, { reason: string }>> {
  const { orgId, userId } = await auth();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.string().uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  const parsedServiceType = z.enum(["grass", "snow"]).safeParse(serviceType);
  if (!parsedServiceType.success)
    return errAsync({ reason: "Invalid service type" });

  return ResultAsync.fromPromise(
    (async () => {
      const job = await insertCompletedJobDb(
        parsedAddressId.data,
        orgId,
        parsedServiceType.data,
        userId,
        assignedTo,
        completedAt || new Date(),
        capturedAt || null,
        notes,
      );

      if (photoBlobPath) {
        await insertCompletionPhotoDb(
          job.id,
          photoBlobPath,
          capturedAt || null,
        );
      }

      return job as CompletedJob;
    })(),
    () => ({ reason: "Failed to complete job" }),
  );
}

export async function getOrganizationMembersDal(): Promise<
  { id: string; name: string }[]
> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  try {
    const client = await clerkClient();
    const members = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    return members.data.map((m) => ({
      id: m.publicUserData?.userId || "",
      name:
        m.publicUserData?.firstName && m.publicUserData?.lastName
          ? `${m.publicUserData.firstName} ${m.publicUserData.lastName}`
          : m.publicUserData?.identifier || "Unknown Member",
    }));
  } catch (error) {
    console.error("Failed to fetch organization members from Clerk:", error);
    return [];
  }
}

export async function upsertAssignmentDal(
  addressId: string,
  userId: string | null,
  date: string,
): Promise<Result<Assignment | null, { reason: string }>> {
  const { orgId } = await auth();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.string().uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  if (!userId || userId === "unassigned") {
    return ResultAsync.fromPromise(
      deleteAssignmentDb(parsedAddressId.data, date).then(() => null),
      () => ({ reason: "Failed to delete assignment" }),
    );
  }

  return ResultAsync.fromPromise(
    upsertAssignmentDb(
      parsedAddressId.data,
      orgId,
      userId,
      date,
    ) as Promise<Assignment>,
    () => ({ reason: "Failed to upsert assignment" }),
  );
}

export async function updateAddressAssigneeDal(
  addressId: string,
  userId: string | null,
): Promise<Result<void, { reason: string }>> {
  const { orgId } = await auth();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.string().uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  return ResultAsync.fromPromise(
    updateAddressAssigneeDb(
      parsedAddressId.data,
      userId === "unassigned" ? null : userId,
    ),
    () => ({ reason: "Failed to update address assignee" }),
  );
}

export async function deleteClientDal(
  clientId: string,
): Promise<Result<void, { reason: string }>> {
  const { orgId } = await auth();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedClientId = z.string().uuid().safeParse(clientId);
  if (!parsedClientId.success) return errAsync({ reason: "Invalid client ID" });

  return ResultAsync.fromPromise(
    deleteClientDb(parsedClientId.data, orgId),
    () => ({ reason: "Failed to delete client" }),
  );
}

export async function saveSiteMapDal(
  addressId: string,
  name: string | null,
  blobPath: string | null,
  mapData: any | null,
): Promise<Result<SiteMap, { reason: string }>> {
  const { orgId } = await auth();
  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.string().uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  return ResultAsync.fromPromise(
    insertSiteMapDb(
      parsedAddressId.data,
      name,
      blobPath,
      mapData,
    ) as Promise<SiteMap>,
    () => ({ reason: "Failed to save site map" }),
  );
}

export async function deleteSiteMapDal(
  siteMapId: string,
): Promise<Result<void, { reason: string }>> {
  const { orgId } = await auth();
  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedSiteMapId = z.string().uuid().safeParse(siteMapId);
  if (!parsedSiteMapId.success)
    return errAsync({ reason: "Invalid site map ID" });

  return ResultAsync.fromPromise(deleteSiteMapDb(parsedSiteMapId.data), () => ({
    reason: "Failed to delete site map",
  }));
}

export async function getClientByIdDal(id: string): Promise<Client | null> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");

  const [clientRow, addresses, schedules, siteMaps, jobHistory] =
    await Promise.all([
      getClientByIdDb(id, orgId),
      getAddressesDb(orgId),
      getSchedulesDb(orgId),
      getSiteMapsDb(orgId),
      getCompletedJobsHistoryDb(orgId),
    ]);

  if (!clientRow) return null;

  const clientAddresses = addresses
    .filter((a: AddressRow) => a.client_id === id && a.status !== "deleted")
    .map((address: AddressRow) => {
      const schedule = schedules.find(
        (s: ScheduleRow) => s.address_id === address.id,
      );
      const addressSiteMaps = siteMaps.filter(
        (sm) => sm.address_id === address.id,
      );
      const latestJob = jobHistory.find((j) => j.address_id === address.id);

      return {
        ...address,
        schedule: schedule || null,
        sort_order: 0,
        assignment: null,
        completed_job: latestJob || null,
        site_maps: addressSiteMaps,
      } as Address;
    });

  return { ...clientRow, addresses: clientAddresses } as Client;
}

export async function searchClientsDal(query: string): Promise<Client[]> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");

  const members = await getOrganizationMembersDal();
  const matchedAssigneeIds = members
    .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    .map((m) => m.id);

  const [clients, addresses, schedules, siteMaps, jobHistory] =
    await Promise.all([
      searchClientsDb(orgId, query, matchedAssigneeIds),
      getAddressesDb(orgId),
      getSchedulesDb(orgId),
      getSiteMapsDb(orgId),
      getCompletedJobsHistoryDb(orgId),
    ]);

  return clients.map((client: ClientRow) => {
    const clientAddresses = addresses
      .filter(
        (a: AddressRow) => a.client_id === client.id && a.status !== "deleted",
      )
      .map((address: AddressRow) => {
        const schedule = schedules.find(
          (s: ScheduleRow) => s.address_id === address.id,
        );
        const addressSiteMaps = siteMaps.filter(
          (sm) => sm.address_id === address.id,
        );
        const latestJob = jobHistory.find((j) => j.address_id === address.id);

        return {
          ...address,
          schedule: schedule || null,
          sort_order: 0,
          assignment: null,
          completed_job: latestJob || null,
          site_maps: addressSiteMaps,
        } as Address;
      });

    return { ...client, addresses: clientAddresses } as Client;
  });
}
