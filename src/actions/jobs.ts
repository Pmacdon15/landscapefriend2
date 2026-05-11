"use server";

import { revalidatePath } from "next/cache";
import { completeJobDal } from "@/dal/clients";

export async function completeJobAction(
  addressId: string,
  serviceType: "grass" | "snow",
  assignedTo?: string | null,
  notes?: string | null,
) {
  const result = await completeJobDal(
    addressId,
    serviceType,
    assignedTo,
    notes,
  );

  // Revalidate paths that show schedules or cut lists
  revalidatePath("/clients-service");
  revalidatePath("/client-info-list");

  return result.match(
    (job) => ({ success: true, job, error: null }),
    (err) => ({ success: false, job: null, error: err.reason }),
  );
}
