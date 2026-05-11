"use server";

import { revalidatePath } from "next/cache";
import { updateRouteOrderDal } from "@/dal/clients";

export async function updateRouteOrderAction(
  addressId: string,
  newSortOrder: number,
) {
  const result = await updateRouteOrderDal(addressId, newSortOrder);

  // Revalidate paths that show cuts
  revalidatePath("/client-cut-list");

  return result.match(
    () => ({ success: true, error: null }),
    (err) => ({ success: false, error: err.reason }),
  );
}
