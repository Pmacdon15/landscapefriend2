import { auth } from "@clerk/nextjs/server";
import { errAsync, type Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import type { Address, Client, ClientRow } from "@/types/types";
import {
  type AddressInputSchema,
  type CreateClientInput,
  CreateClientInputSchema,
} from "@/zod/schemas";
import {
  deleteAddressDb,
  deleteClientDb,
  getClientsForCutListDb,
  getClientsForInfoDb,
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
  try {
    const { orgId, orgRole } = await auth.protect();
    const isAdmin = orgRole === "org:admin";

    if (!orgId || !isAdmin) {
      throw new Error("Unauthorized");
    }

    let matchedAssigneeIds: string[] = [];
    if (searchQuery) {
      const members = await getOrganizationMembersDal();
      matchedAssigneeIds = members
        .filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((m) => m.id);
    }

    const pageSize = 6;
    const offset = (page - 1) * pageSize;

    const results = await getClientsForInfoDb(
      orgId,
      pageSize,
      offset,
      searchQuery,
      matchedAssigneeIds,
    );

    if (results.length === 0) {
      return { clients: [], totalPages: 1 };
    }

    const totalCount = results[0].total_count;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return { clients: results, totalPages };
  } catch (error) {
    console.error("Error in getClientsForInfoDal:", error);
    return { clients: [], totalPages: 0 };
  }
}

export async function getClientsForCutListDal(
  date: string,
  userIdOverride?: string,
): Promise<Client[]> {
  try {
    const { orgId, userId, orgRole } = await auth.protect();
    if (!orgId || !userId) throw new Error("Unauthorized");

    const isAdmin = orgRole === "org:admin";
    const targetUserId = isAdmin && userIdOverride ? userIdOverride : userId;
    const showAll = isAdmin && userIdOverride === "all";

    const results = await getClientsForCutListDb(
      orgId,
      date,
      targetUserId,
      showAll,
    );

    return results;
  } catch (error) {
    console.error("DAL Error:", error);
    return [];
  }
}

export async function createClientDal(
  data: CreateClientInput,
): Promise<Result<Client, { reason: string }>> {
  const { orgId, orgRole } = await auth.protect();

  if (!orgId || orgRole !== "org:admin")
    return errAsync({ reason: "Unauthorized" });

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
  const { orgId, orgRole } = await auth.protect();

  if (!orgId || orgRole !== "org:admin")
    return errAsync({ reason: "Unauthorized" });

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
  const { orgId, orgRole } = await auth.protect();

  if (!orgId || orgRole !== "org:admin")
    return errAsync({ reason: "Unauthorized" });

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
  const { orgId, orgRole } = await auth.protect();
  if (!orgId || orgRole !== "org:admin") throw new Error("Unauthorized");

  const members = await getOrganizationMembersDal();
  const matchedAssigneeIds = members
    .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    .map((m) => m.id);

  const results = await searchClientsDb(orgId, query, matchedAssigneeIds);

  return results as Client[];
}
