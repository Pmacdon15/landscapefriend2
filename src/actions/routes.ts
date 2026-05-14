"use server";
import { updateTag } from "next/cache";
import { updateRouteOrderDal } from "@/dal/service";

export async function updateRouteOrderAction(
  addressId: string,
  newSortOrder: number,
) {
  const result = await updateRouteOrderDal(addressId, newSortOrder);

  return result.match(
    (route) => {
      updateTag(`route-order-${route.org_id}`);
      return {
        success: true,
        route,
        error: null,
      };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}
