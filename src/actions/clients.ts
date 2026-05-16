"use server";

import { updateTag } from "next/cache";
import {
  createClientDal,
  deleteClientDal,
  updateClientDal,
} from "@/dal/clients";
import { updateAddressAssigneeDal } from "@/dal/service";
import type { CreateClientInput } from "@/zod/schemas";

export async function createClientAction(data: CreateClientInput) {
  const result = await createClientDal(data);

  return result.match(
    (client) => {
      updateTag(`clients-info-${client.org_id}`);
      updateTag(`clients-cutlist-${client.org_id}`);
      updateTag(`clients-search-${client.org_id}`);
      return {
        success: true,
        client,
        error: null,
      };
    },
    (err) => ({ success: false, client: null, error: err.reason }),
  );
}

export async function updateClientAction(
  clientId: string,
  data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    addresses: {
      id?: string;
      street: string;
      city: string;
      state?: string | null;
      zip?: string | null;
      status: "active" | "disabled" | "deleted";
      assigned_to?: string | null;
    }[];
  },
) {
  const result = await updateClientDal(clientId, data);

  return result.match(
    (client) => {
      updateTag(`clients-info-${client.org_id}`);
      updateTag(`clients-cutlist-${client.org_id}`);
      updateTag(`clients-search-${client.org_id}`);
      return {
        success: true,
        client,
        error: null,
      };
    },
    (err) => ({ success: false, client: null, error: err.reason }),
  );
}

export async function updateAddressAssigneeAction(
  addressId: string,
  userId: string | null,
) {
  const result = await updateAddressAssigneeDal(addressId, userId);

  return result.match(
    (address) => {
      updateTag(`clients-info-${address.org_id}`);
      updateTag(`clients-cutlist-${address.org_id}`);
      updateTag(`addresses-${address.org_id}`);
      updateTag(`clients-search-${address.org_id}`);
      return {
        success: true,
        address,
        error: null,
      };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}

export async function deleteClientAction(clientId: string) {
  const result = await deleteClientDal(clientId);

  return result.match(
    (client) => {
      updateTag(`clients-info-${client.org_id}`);
      updateTag(`clients-cutlist-${client.org_id}`);
      updateTag(`job-history-${client.org_id}`);
      updateTag(`clients-search-${client.org_id}`);
      return {
        success: true,
        client,
        error: null,
      };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}
