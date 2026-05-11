import { auth, clerkClient } from "@clerk/nextjs/server";
import { errAsync, type Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import type {
  AddressRow,
  AssignmentRow,
  ClientRow,
  CompletedJobRow,
  RouteOrderRow,
  ScheduleRow,
} from "@/types/types";
import {
  deleteAddressDb,
  deleteAssignmentDb,
  getAddressesDb,
  getAssignmentsDb,
  getClientsDb,
  getCompletedJobsDb,
  getRouteOrdersDb,
  getSchedulesDb,
  insertAddressDb,
  insertClientDb,
  insertCompletedJobDb,
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
} from "../zod/schemas";

export type { Client, Address, Schedule, CompletedJob, Assignment };

export async function getClientsForInfoDal(
  page: number,
): Promise<{ clients: Client[]; totalPages: number }> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  const [clients, addresses, schedules] = await Promise.all([
    getClientsDb(orgId),
    getAddressesDb(orgId),
    getSchedulesDb(orgId),
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
        return {
          ...address,
          schedule: schedule || null,
          sort_order: 0,
          assignment: null,
          completed_job: null,
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

export async function getClientsForCutListDal(date: string): Promise<Client[]> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  const [
    clients,
    addresses,
    schedules,
    routeOrders,
    assignments,
    completedJobs,
  ] = await Promise.all([
    getClientsDb(orgId),
    getAddressesDb(orgId),
    getSchedulesDb(orgId),
    getRouteOrdersDb(orgId),
    getAssignmentsDb(orgId, date),
    getCompletedJobsDb(orgId, date),
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
        const routeOrder = routeOrders?.find(
          (r: RouteOrderRow) => r.address_id === address.id,
        );
        const assignment = assignments.find(
          (as: AssignmentRow) => as.address_id === address.id,
        );
        const completedJob = completedJobs.find(
          (cj: CompletedJobRow) => cj.address_id === address.id,
        );
        return {
          ...address,
          schedule: schedule || null,
          sort_order: routeOrder?.sort_order ?? 0,
          assignment: assignment || null,
          completed_job: completedJob || null,
        } as Address;
      });

    return { ...client, addresses: clientAddresses } as Client;
  });

  return mappedClients;
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
    insertCompletedJobDb(
      parsedAddressId.data,
      orgId,
      parsedServiceType.data,
      userId,
      assignedTo,
      new Date(),
      notes,
    ) as Promise<CompletedJob>,
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
