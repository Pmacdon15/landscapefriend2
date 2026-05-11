"use server";

import { revalidatePath } from "next/cache";
import {
  createClientDal,
  updateAddressAssigneeDal,
  updateClientDal,
} from "../dal/clients";

export async function createClientAction(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  addresses: {
    street: string;
    city: string;
    state?: string | null;
    zip?: string | null;
    status: "active" | "disabled" | "deleted";
    assigned_to?: string | null;
  }[];
}) {
  try {
    const newClient = await createClientDal(data);
    revalidatePath("/client-info-list");
    revalidatePath("/client-cut-list");
    return { success: true, client: newClient };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create client";
    return {
      success: false,
      error: message,
    };
  }
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
  try {
    const updatedClient = await updateClientDal(clientId, data);
    revalidatePath("/client-info-list");
    revalidatePath("/client-cut-list");
    return { success: true, client: updatedClient };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update client";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateAddressAssigneeAction(
  addressId: string,
  userId: string | null,
) {
  try {
    await updateAddressAssigneeDal(addressId, userId);
    revalidatePath("/client-info-list");
    revalidatePath("/client-cut-list");
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update assignee";
    return { success: false, error: message };
  }
}
