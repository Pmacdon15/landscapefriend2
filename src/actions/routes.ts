"use server";

import { revalidatePath } from "next/cache";
import { updateRouteOrderDal } from "@/dal/clients";

export async function updateRouteOrderAction(
  addressId: string,
  newSortOrder: number,
) {
  try {
    await updateRouteOrderDal(addressId, newSortOrder);

    // Revalidate paths that show cuts
    revalidatePath("/client-cut-list");

    return { success: true };
  } catch (error) {
    console.error("Failed to update route order:", error);
    return { success: false, error: "Failed to update route order" };
  }
}
