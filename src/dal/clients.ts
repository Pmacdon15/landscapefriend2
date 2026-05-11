import { auth, clerkClient } from "@clerk/nextjs/server";
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
  AddressInputSchema,
  type Assignment,
  type Client,
  type CompletedJob,
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
): Promise<void> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  // Validate inputs
  const parsedAddressId = z.string().uuid().parse(addressId);
  const parsedSortOrder = z.number().parse(newSortOrder);

  await updateRouteOrderDb(parsedAddressId, orgId, parsedSortOrder);
}

export async function createClientDal(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  addresses: z.infer<typeof AddressInputSchema>[];
}): Promise<Client> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  const parsedName = z.string().min(1, "Name is required").parse(data.name);
  const parsedEmail = data.email ? z.string().email().parse(data.email) : null;
  const parsedPhone = data.phone ? z.string().parse(data.phone) : null;
  const parsedAddresses = z
    .array(AddressInputSchema)
    .min(1, "At least one address is required")
    .parse(data.addresses);

  const newClient = await insertClientDb(
    orgId,
    parsedName,
    parsedEmail,
    parsedPhone,
  );

  const createdAddresses = await Promise.all(
    parsedAddresses.map((addr) =>
      insertAddressDb(
        newClient.id,
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
    ...newClient,
    addresses: createdAddresses.map((addr) => ({ ...addr, sort_order: 0 })),
  } as unknown as Client;
}

export async function updateClientDal(
  clientId: string,
  data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    addresses: z.infer<typeof AddressInputSchema>[];
  },
): Promise<Client> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  const parsedClientId = z.string().uuid().parse(clientId);
  const parsedName = z.string().min(1, "Name is required").parse(data.name);
  const parsedEmail = data.email ? z.string().email().parse(data.email) : null;
  const parsedPhone = data.phone ? z.string().parse(data.phone) : null;
  const parsedAddresses = z
    .array(AddressInputSchema)
    .min(1, "At least one address is required")
    .parse(data.addresses);

  const updatedClient = await updateClientDb(
    parsedClientId,
    orgId,
    parsedName,
    parsedEmail,
    parsedPhone,
  );

  const finalAddresses: Address[] = [];

  for (const addr of parsedAddresses) {
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
        } as unknown as Address);
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
      finalAddresses.push({ ...newAddr, sort_order: 0 } as unknown as Address);
    }
  }

  return {
    ...updatedClient,
    addresses: finalAddresses,
  } as unknown as Client;
}

export async function upsertScheduleDal(
  addressId: string,
  frequency: string,
  nextCutDate: Date,
): Promise<Schedule> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  const parsedAddressId = z.string().uuid().parse(addressId);
  const parsedFrequency = z.string().min(1).parse(frequency);
  const parsedDate = z.date().parse(nextCutDate);

  const schedule = await upsertScheduleDb(
    parsedAddressId,
    parsedFrequency,
    parsedDate,
  );

  return schedule as unknown as Schedule;
}

export async function completeJobDal(
  addressId: string,
  serviceType: "grass" | "snow",
  assignedTo?: string | null,
  notes?: string | null,
): Promise<CompletedJob> {
  const { orgId, userId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  const parsedAddressId = z.string().uuid().parse(addressId);
  const parsedServiceType = z.enum(["grass", "snow"]).parse(serviceType);

  const completedJob = await insertCompletedJobDb(
    parsedAddressId,
    orgId,
    parsedServiceType,
    userId,
    assignedTo,
    new Date(),
    notes,
  );

  return completedJob as unknown as CompletedJob;
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
): Promise<Assignment | null> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  const parsedAddressId = z.string().uuid().parse(addressId);

  if (!userId || userId === "unassigned") {
    await deleteAssignmentDb(parsedAddressId, date);
    return null;
  }

  const assignment = await upsertAssignmentDb(
    parsedAddressId,
    orgId,
    userId,
    date,
  );

  return assignment as unknown as Assignment;
}

export async function updateAddressAssigneeDal(
  addressId: string,
  userId: string | null,
): Promise<void> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  const parsedAddressId = z.string().uuid().parse(addressId);
  await updateAddressAssigneeDb(
    parsedAddressId,
    userId === "unassigned" ? null : userId,
  );
}
