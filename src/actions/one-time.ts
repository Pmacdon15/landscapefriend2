"use server";

import { auth } from "@clerk/nextjs/server";
import { updateTag } from "next/cache";
import { deleteOneTimeServiceDal, insertOneTimeServiceDal } from "@/dal/service";

export async function insertOneTimeServiceAction(
  addressId: string,
  name: string,
  serviceType: string,
  serviceDate: string,
  notes?: string | null,
  assignedMemberIds?: string[] | null,
) {
  const { orgId } = await auth.protect();
  const result = await insertOneTimeServiceDal(
    addressId,
    name,
    serviceType,
    serviceDate,
    notes,
    assignedMemberIds,
  );

  return result.match(
    (service) => {
      updateTag(`schedules-${orgId}`);
      updateTag(`clients-info-${orgId}`);
      updateTag(`clients-cutlist-${orgId}`);
      updateTag(`clients-search-${orgId}`);
      return { success: true, service, error: null };
    },
    (err) => ({ success: false, service: null, error: err.reason }),
  );
}

export async function deleteOneTimeServiceAction(serviceId: string) {
  const { orgId } = await auth.protect();
  const result = await deleteOneTimeServiceDal(serviceId);

  return result.match(
    (service) => {
      updateTag(`schedules-${orgId}`);
      updateTag(`clients-info-${orgId}`);
      updateTag(`clients-cutlist-${orgId}`);
      updateTag(`clients-search-${orgId}`);
      return { success: true, service, error: null };
    },
    (err) => ({ success: false, service: null, error: err.reason }),
  );
}
