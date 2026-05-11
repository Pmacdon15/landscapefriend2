"use server";

import { revalidatePath } from "next/cache";
import { upsertAssignmentDal } from "@/dal/clients";

export async function upsertAssignmentAction(
  addressId: string,
  userId: string | null,
  date: string,
) {
  try {
    const assignment = await upsertAssignmentDal(addressId, userId, date);
    revalidatePath("/client-cut-list");
    return { success: true, assignment };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save assignment";
    console.error("Assignment failed:", error);
    return { success: false, error: message };
  }
}
