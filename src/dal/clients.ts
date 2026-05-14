import { auth } from "@clerk/nextjs/server";
import {
  differenceInCalendarDays,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { errAsync, type Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import type {
  Address,
  AddressRow,
  Client,
  ClientRow,
  CutListItem,
  ScheduleRow,
  SiteMapRow,
} from "@/types/types";
import {
  type AddressInputSchema,
  type CreateClientInput,
  CreateClientInputSchema,
} from "@/zod/schemas";
import {
  deleteAddressDb,
  deleteClientDb,
  getAddressesDb,
  getAssignmentsDb,
  getClientsDb,
  getCompletedJobsDb,
  getRouteOrdersDb,
  getSchedulesDb,
  getSiteMapsDb,
  insertAddressDb,
  insertClientDb,
  searchClientsDb,
  updateAddressDb,
  updateClientDb,
} from "../db/queries/clients";
import { getOrganizationMembersDal } from "./clerk";

export async function getClientsForInfoDal(
  page: number,
  searchQuery?: string,
): Promise<{ clients: Client[]; totalPages: number }> {
  const { orgId } = await auth.protect();
  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

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
      getCompletedJobsDb(orgId),
    ]);

  const addressMap = new Map<string, AddressRow[]>();
  addresses.forEach((a) => {
    if (a.status !== "deleted") {
      const list = addressMap.get(a.client_id) || [];
      list.push(a);
      addressMap.set(a.client_id, list);
    }
  });

  const scheduleMap = new Map<string, ScheduleRow>();
  schedules.forEach((s) => {
    // Fallback for transition period/stale cache
    if (!s.first_cut_date && (s as any).next_cut_date) {
      s.first_cut_date = (s as any).next_cut_date;
    }
    scheduleMap.set(s.address_id, s);
  });

  const siteMapLookup = new Map<string, typeof siteMaps>();
  siteMaps.forEach((sm) => {
    const list = siteMapLookup.get(sm.address_id) || [];
    list.push(sm);
    siteMapLookup.set(sm.address_id, list);
  });

  const historyMap = new Map<string, (typeof jobHistory)[0]>();
  jobHistory.forEach((j) => {
    historyMap.set(j.address_id, j);
  });

  const mappedClients = clients.map((client: ClientRow) => {
    const clientAddresses = (addressMap.get(client.id) || []).map((address) => {
      return {
        ...address,
        schedule: scheduleMap.get(address.id) || null,
        sort_order: 0,
        assignment: null,
        completed_job: historyMap.get(address.id) || null,
        site_maps: siteMapLookup.get(address.id) || [],
      } as Address;
    });

    return { ...client, addresses: clientAddresses } as Client;
  });

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(mappedClients.length / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const paginatedClients = mappedClients.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return { clients: paginatedClients, totalPages };
}
export async function getClientsForCutListDal(
  date: string,
): Promise<CutListItem[]> {
  const { orgId, userId } = await auth.protect();
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

  const scheduleMap = new Map<string, ScheduleRow>();
  schedules.forEach((s) => {
    // Fallback for transition period/stale cache
    if (!s.first_cut_date && (s as any).next_cut_date) {
      s.first_cut_date = (s as any).next_cut_date;
    }
    scheduleMap.set(s.address_id, s);
  });

  const orderMap = new Map<string, number>();
  routeOrders?.forEach((r) => {
    orderMap.set(r.address_id, r.sort_order);
  });

  const assignmentMap = new Map<string, (typeof assignments)[0]>();
  assignments.forEach((a) => {
    assignmentMap.set(a.address_id, a);
  });

  const jobMap = new Map<string, (typeof completedJobs)[0]>();
  completedJobs.forEach((j) => {
    jobMap.set(j.address_id, j);
  });

  const clientMap = new Map<string, ClientRow>();
  clients.forEach((c) => {
    clientMap.set(c.id, c);
  });

  const siteMapGroupMap = new Map<string, SiteMapRow[]>();
  siteMaps.forEach((sm) => {
    const group = siteMapGroupMap.get(sm.address_id) || [];
    group.push(sm);
    siteMapGroupMap.set(sm.address_id, group);
  });

  const targetDate = startOfDay(parseISO(date));
  const results: CutListItem[] = [];

  for (const addr of addresses) {
    if (addr.status === "deleted") continue;

    const schedule = scheduleMap.get(addr.id);
    if (!schedule || !schedule.first_cut_date) continue;

    let scheduleDate: Date;
    try {
      const scheduleDateStr =
        schedule.first_cut_date instanceof Date
          ? isValid(schedule.first_cut_date)
            ? schedule.first_cut_date.toISOString().split("T")[0]
            : null
          : String(schedule.first_cut_date).split("T")[0];

      if (!scheduleDateStr) continue;
      scheduleDate = parseISO(scheduleDateStr);
      if (!isValid(scheduleDate)) continue;
    } catch (_e) {
      continue;
    }
    const diffDays = differenceInCalendarDays(targetDate, scheduleDate);
    if (diffDays < 0) continue;

    let isScheduled = false;
    const freq = schedule.frequency.toLowerCase();

    if (freq === "daily") isScheduled = true;
    else if (diffDays === 0) isScheduled = true;
    else if (freq === "weekly") isScheduled = diffDays % 7 === 0;
    else if (freq === "bi-weekly") isScheduled = diffDays % 14 === 0;
    else if (freq === "monthly")
      isScheduled = targetDate.getUTCDate() === scheduleDate.getUTCDate();
    else isScheduled = schedule.day_of_week === targetDate.getUTCDay();

    if (!isScheduled) continue;

    const assignment = assignmentMap.get(addr.id);
    const assigneeId = assignment?.user_id || addr.assigned_to;
    if (assigneeId !== userId) continue;

    const client = clientMap.get(addr.client_id);
    if (!client) continue;

    results.push({
      client: { id: client.id, name: client.name },
      address: {
        ...addr,
        schedule,
        sort_order: orderMap.get(addr.id) ?? 0,
        assignment: assignment ?? null,
        completed_job: jobMap.get(addr.id) ?? null,
        site_maps: siteMapGroupMap.get(addr.id) || [],
      } as Address,
    });
  }

  return results.sort((a, b) => a.address.sort_order - b.address.sort_order);
}

export async function createClientDal(
  data: CreateClientInput,
): Promise<Result<Client, { reason: string }>> {
  const { orgId } = await auth.protect();
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
  const { orgId } = await auth.protect();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const clientIdResult = z.uuid().safeParse(clientId);
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

export async function deleteClientDal(
  clientId: string,
): Promise<Result<ClientRow, { reason: string }>> {
  const { orgId } = await auth.protect();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedClientId = z.uuid().safeParse(clientId);
  if (!parsedClientId.success) return errAsync({ reason: "Invalid client ID" });

  return ResultAsync.fromPromise(
    deleteClientDb(parsedClientId.data, orgId),
    (error) => {
      console.error(error); // Good for debugging server-side
      return { reason: "Failed to delete client" };
    },
  ).andThen((client) => {
    if (!client) {
      return errAsync({ reason: "Client not found or already deleted" });
    }
    return ResultAsync.fromSafePromise(Promise.resolve(client));
  });
}

export async function searchClientsDal(query: string): Promise<Client[]> {
  const { orgId } = await auth.protect();
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
      getCompletedJobsDb(orgId),
    ]);

  const addressMap = new Map<string, AddressRow[]>();
  addresses.forEach((a) => {
    if (a.status !== "deleted") {
      const list = addressMap.get(a.client_id) || [];
      list.push(a);
      addressMap.set(a.client_id, list);
    }
  });

  const scheduleMap = new Map<string, ScheduleRow>();
  schedules.forEach((s) => {    
    if (!s.first_cut_date && (s as any).next_cut_date) {
      s.first_cut_date = (s as any).next_cut_date;
    }
    scheduleMap.set(s.address_id, s);
  });

  const siteMapLookup = new Map<string, SiteMapRow[]>();
  siteMaps.forEach((sm) => {
    const list = siteMapLookup.get(sm.address_id) || [];
    list.push(sm);
    siteMapLookup.set(sm.address_id, list);
  });

  const historyMap = new Map<string, (typeof jobHistory)[0]>();
  jobHistory.forEach((j) => {
    historyMap.set(j.address_id, j);
  });

  return clients.map((client: ClientRow) => {
    const clientAddresses = (addressMap.get(client.id) || []).map((address) => {
      return {
        ...address,
        schedule: scheduleMap.get(address.id) || null,
        sort_order: 0,
        assignment: null,
        completed_job: historyMap.get(address.id) || null,
        site_maps: siteMapLookup.get(address.id) || [],
      } as Address;
    });

    return { ...client, addresses: clientAddresses } as Client;
  });
}
