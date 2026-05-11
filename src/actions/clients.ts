"use server";

import { revalidatePath } from "next/cache";
import type { CreateClientInput } from "@/zod/schemas";
import {
  createClientDal,
  updateAddressAssigneeDal,
  updateClientDal,
} from "../dal/clients";

export async function createClientAction(data: CreateClientInput) {
  const result = await createClientDal(data);

  return result.match(
    (client) => ({ success: true, client, error: null }),
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
  revalidatePath("/client-info-list");
  revalidatePath("/client-cut-list");

  return result.match(
    (client) => ({ success: true, client, error: null }),
    (err) => ({ success: false, client: null, error: err.reason }),
  );
}

export async function updateAddressAssigneeAction(
  addressId: string,
  userId: string | null,
) {
  const result = await updateAddressAssigneeDal(addressId, userId);
  revalidatePath("/client-info-list");
  revalidatePath("/client-cut-list");

  return result.match(
    () => ({ success: true, error: null }),
    (err) => ({ success: false, error: err.reason }),
  );
}
