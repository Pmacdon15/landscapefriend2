"use server";

import { revalidatePath } from "next/cache";
import { upsertAssignmentDal } from "@/dal/clients";

export async function upsertAssignmentAction(
  addressId: string,
  userId: string | null,
  date: string,
) {
  const result = await upsertAssignmentDal(addressId, userId, date);
  revalidatePath("/client-cut-list");

  return result.match(
    (assignment) => ({ success: true, assignment, error: null }),
    (err) => ({ success: false, assignment: null, error: err.reason }),
  );
}
