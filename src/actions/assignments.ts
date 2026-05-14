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
      // Small fix: remove the optional chain if org_id is guaranteed
      updateTag(`assignments-${assignment?.org_id}`);
      return {
        success: true,
        assignment,
        error: null,
      };
    },
    (err) => ({
      success: false,
      assignment: null, // Add this to satisfy the type union
      error: err.reason,
    }),
  );
}
