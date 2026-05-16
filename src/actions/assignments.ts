"use server";

import { auth } from "@clerk/nextjs/server";
import { updateTag } from "next/cache";
import { upsertAssignmentDal } from "@/dal/service";

export async function upsertAssignmentAction(
  addressId: string,
  userId: string | null,
  date: string,
) {
  const { orgId } = await auth.protect();
  const result = await upsertAssignmentDal(addressId, userId, date);

  return result.match(
    (assignment) => {
      updateTag(`assignments-${orgId}`);
      updateTag(`assignments-${orgId}-${date}`);
      updateTag(`clients-info-${orgId}`);
      updateTag(`clients-cutlist-${orgId}`);
      return {
        success: true,
        assignment,
        error: null,
      };
    },
    (err) => ({
      success: false,
      assignment: null,
      error: err.reason,
    }),
  );
}
