"use server";

import { revalidatePath, updateTag } from "next/cache";
import { deleteScheduleDal, upsertScheduleDal } from "@/dal/service";

export async function upsertScheduleAction(
  addressId: string,
  frequency: string,
  firstCutDate: Date,
) {
  const result = await upsertScheduleDal(addressId, frequency, firstCutDate);
  revalidatePath("/client-info-list");
  revalidatePath("/clients-service");

  return result.match(
    (schedule) => {
      updateTag(`schedules-${schedule.org_id}`);
      return { success: true, schedule, error: null };
    },
    (err) => ({ success: false, schedule: null, error: err.reason }),
  );
}

export async function deleteScheduleAction(addressId: string) {
  const result = await deleteScheduleDal(addressId);
  revalidatePath("/client-info-list");
  revalidatePath("/clients-service");

  return result.match(
    (schedule) => {
      updateTag(`schedules-${schedule.org_id}`);
      return { success: true, schedule, error: null };
    },
    (err) => ({ success: false, schedule: null, error: err.reason }),
  );
}
