"use server";

import { revalidatePath } from "next/cache";
import { completeJobDal } from "@/dal/clients";

export async function completeJobAction(
  addressId: string,
  serviceType: "grass" | "snow",
  assignedTo?: string | null,
  notes?: string | null,
) {
  try {
    const job = await completeJobDal(addressId, serviceType, assignedTo, notes);

    // Revalidate paths that show schedules or cut lists
    revalidatePath("/client-cut-list");
    revalidatePath("/client-info-list");

    return { success: true, job };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to complete job";
    console.error("Job completion failed:", error);
    return { success: false, error: message };
  }
}
