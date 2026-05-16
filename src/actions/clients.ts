"use server";

import { auth } from "@clerk/nextjs/server";
import { updateTag } from "next/cache";
import {
  createClientDal,
  deleteClientDal,
  updateClientDal,
} from "@/dal/clients";
import { updateAddressAssigneeDal } from "@/dal/service";
import type { CreateClientInput } from "@/zod/schemas";

export async function createClientAction(data: CreateClientInput) {
  const { orgId } = await auth.protect();
  const result = await createClientDal(data);

  return result.match(
    (client) => {
      updateTag(`clients-info-${orgId}`);
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
  const { orgId } = await auth.protect();
  const result = await updateClientDal(clientId, data);

  return result.match(
    (client) => {
      updateTag(`clients-info-${orgId}`);
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
  const { orgId } = await auth.protect();
  const result = await updateAddressAssigneeDal(addressId, userId);

  return result.match(
    (address) => {
      updateTag(`clients-info-${orgId}`);
      updateTag(`addresses-${orgId}`);
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
  const { orgId } = await auth.protect();
  const result = await deleteClientDal(clientId);

  return result.match(
    (client) => {
      updateTag(`clients-info-${orgId}`);
      updateTag(`job-history-${orgId}`);
      return {
        success: true,
        client,
        error: null,
      };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}
