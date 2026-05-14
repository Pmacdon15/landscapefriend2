import { auth } from "@clerk/nextjs/server";
import { errAsync, type Result, ResultAsync } from "neverthrow";
import z from "zod";
import {
  deleteAssignmentDb,
  deleteScheduleDb,
  insertCompletedJobDb,
  insertCompletionPhotoDb,
  updateAddressAssigneeDb,
  updateRouteOrderDb,
  upsertAssignmentDb,
  upsertScheduleDb,
} from "@/db/queries/clients";
import type {
  AddressRow,
  Assignment,
  CompletedJob,
  RouteOrderRow,
} from "@/types/types";
import type { ScheduleWithOrgSchema } from "@/zod/schemas";

export async function updateRouteOrderDal(
  addressId: string,
  newSortOrder: number,
): Promise<Result<RouteOrderRow, { reason: string }>> {
  const { orgId } = await auth.protect();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.string().uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  const parsedSortOrder = z.number().safeParse(newSortOrder);
  if (!parsedSortOrder.success)
    return errAsync({ reason: "Invalid sort order" });

  return ResultAsync.fromPromise(
    updateRouteOrderDb(parsedAddressId.data, orgId, parsedSortOrder.data),
    () => ({ reason: "Failed to update route order" }),
  );
}

export async function upsertScheduleDal(
  addressId: string,
  frequency: string,
  firstCutDate: string,
): Promise<Result<ScheduleWithOrgSchema, { reason: string }>> {
  const { orgId } = await auth.protect();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  const parsedFrequency = z.string().min(1).safeParse(frequency);
  if (!parsedFrequency.success)
    return errAsync({ reason: "Invalid frequency" });

  const parsedDate = z.string().safeParse(firstCutDate);
  if (!parsedDate.success) return errAsync({ reason: "Invalid date" });

  return ResultAsync.fromPromise(
    upsertScheduleDb(
      parsedAddressId.data,
      orgId,
      parsedFrequency.data,
      parsedDate.data,
    ) as Promise<ScheduleWithOrgSchema>,
    () => ({ reason: "Failed to update schedule" }),
  );
}

export async function deleteScheduleDal(
  addressId: string,
): Promise<Result<ScheduleWithOrgSchema, { reason: string }>> {
  const { orgId } = await auth.protect();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  return ResultAsync.fromPromise(
    deleteScheduleDb(parsedAddressId.data).then((row) => {
      if (!row) throw new Error("Schedule not found");
      return { ...row, org_id: orgId } as ScheduleWithOrgSchema;
    }),
    () => ({ reason: "Failed to delete schedule" }),
  );
}

export async function completeJobDal(
  addressId: string,
  serviceType: "grass" | "snow",
  assignedTo?: string | null,
  notes?: string | null,
  photoBlobPath?: string | null,
  capturedAt?: Date | null,
  completedAt?: Date | null,
): Promise<Result<CompletedJob, { reason: string }>> {
  const { orgId, userId } = await auth.protect();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.string().uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  const parsedServiceType = z.enum(["grass", "snow"]).safeParse(serviceType);
  if (!parsedServiceType.success)
    return errAsync({ reason: "Invalid service type" });

  return ResultAsync.fromPromise(
    (async () => {
      const job = await insertCompletedJobDb(
        parsedAddressId.data,
        orgId,
        parsedServiceType.data,
        userId,
        assignedTo,
        completedAt || new Date(),
        capturedAt || null,
        notes,
      );

      if (photoBlobPath) {
        await insertCompletionPhotoDb(
          job.id,
          photoBlobPath,
          capturedAt || null,
        );
      }

      return job as CompletedJob;
    })(),
    () => ({ reason: "Failed to complete job" }),
  );
}

export async function upsertAssignmentDal(
  addressId: string,
  userId: string | null,
  date: string,
): Promise<Result<Assignment | null, { reason: string }>> {
  const { orgId } = await auth.protect();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  if (!userId || userId === "unassigned") {
    return ResultAsync.fromPromise(
      deleteAssignmentDb(parsedAddressId.data, date).then(() => null),
      () => ({ reason: "Failed to delete assignment" }),
    );
  }

  return ResultAsync.fromPromise(
    upsertAssignmentDb(
      parsedAddressId.data,
      orgId,
      userId,
      date,
    ) as Promise<Assignment>,
    () => ({ reason: "Failed to upsert assignment" }),
  );
}

export async function updateAddressAssigneeDal(
  addressId: string,
  userId: string | null,
): Promise<Result<AddressRow, { reason: string }>> {
  const { orgId } = await auth.protect();

  if (!orgId) return errAsync({ reason: "Unauthorized" });

  const parsedAddressId = z.uuid().safeParse(addressId);
  if (!parsedAddressId.success)
    return errAsync({ reason: "Invalid address ID" });

  return ResultAsync.fromPromise(
    updateAddressAssigneeDb(
      parsedAddressId.data,
      userId === "unassigned" ? null : userId,
    ),
    () => ({ reason: "Failed to update address assignee" }),
  );
}
