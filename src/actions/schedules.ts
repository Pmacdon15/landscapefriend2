"use server";

import { revalidatePath } from "next/cache";
import { upsertScheduleDal } from "@/dal/clients";

export async function upsertScheduleAction(
  addressId: string,
  frequency: string,
  nextCutDate: Date,
) {
  try {
    const schedule = await upsertScheduleDal(addressId, frequency, nextCutDate);
    revalidatePath("/client-info-list");
    revalidatePath("/client-cut-list");
    return { success: true, schedule };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save schedule";
    return { success: false, error: message };
  }
}
