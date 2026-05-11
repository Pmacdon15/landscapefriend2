"use server";

import { revalidatePath } from "next/cache";
import { upsertScheduleDal } from "@/dal/clients";

export async function upsertScheduleAction(
  addressId: string,
  frequency: string,
  nextCutDate: Date,
) {
  const result = await upsertScheduleDal(addressId, frequency, nextCutDate);
  revalidatePath("/client-info-list");
  revalidatePath("/clients-service");

  return result.match(
    (schedule) => ({ success: true, schedule, error: null }),
    (err) => ({ success: false, schedule: null, error: err.reason }),
  );
}
