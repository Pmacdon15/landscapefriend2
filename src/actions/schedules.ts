"use server";

import { updateTag } from "next/cache";
import { deleteScheduleDal, upsertScheduleDal } from "@/dal/service";

export async function upsertScheduleAction(
  addressId: string,
  frequency: string,
  firstCutDate: string,
) {
  const result = await upsertScheduleDal(addressId, frequency, firstCutDate);

  return result.match(
    (schedule) => {
      updateTag(`schedules-${schedule.org_id}`);
      updateTag(`clients-info-${schedule.org_id}`);
      updateTag(`clients-cutlist-${schedule.org_id}`);
      return { success: true, schedule, error: null };
    },
    (err) => ({ success: false, schedule: null, error: err.reason }),
  );
}

export async function deleteScheduleAction(addressId: string) {
  const result = await deleteScheduleDal(addressId);

  return result.match(
    (schedule) => {
      updateTag(`schedules-${schedule.org_id}`);
      updateTag(`clients-info-${schedule.org_id}`);
      updateTag(`clients-cutlist-${schedule.org_id}`);
      return { success: true, schedule, error: null };
    },
    (err) => ({ success: false, schedule: null, error: err.reason }),
  );
}
