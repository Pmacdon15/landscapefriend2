"use server";

import { updateTag } from "next/cache";
import { upsertAssignmentDal } from "@/dal/service";

export async function upsertAssignmentAction(
  addressId: string,
  userId: string | null,
  date: string,
) {
  const result = await upsertAssignmentDal(addressId, userId, date);
  return result.match(
    (assignment) => {
      updateTag(`assignments-${assignment?.org_id}`);
      return {
        success: true,
        assignment,
        error: null,
      };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}
