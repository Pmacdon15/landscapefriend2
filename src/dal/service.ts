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
  insertOneTimeServiceDb,
  deleteOneTimeServiceDb,
} from "@/db/queries/clients";
import type {
  AddressRow,
  Assignment,
  CompletedJob,
  RouteOrderRow,
} from "@/types/types";
import type { ScheduleWithOrgSchema, OneTimeService } from "@/zod/schemas";
import { sql } from "../db/client";
import { checkOrgMemberLimit } from "@/db/queries/clerk";

export async function updateRouteOrderDal(
  addressId: string,
  newSortOrder: number,
): Promise<Result<RouteOrderRow, { reason: string }>> {
  try {
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
  } catch (error) {
    console.error("Error in updateRouteOrderDal:", error);
    return errAsync({ reason: "An unexpected error occurred" } as const);
  }
}

export async function upsertScheduleDal(
  addressId: string,
  frequency: string,
  firstCutDate: string,
  notes?: string | null,
): Promise<Result<ScheduleWithOrgSchema, { reason: string }>> {
  try {
    const { orgId } = await auth.protect();

    if (!orgId) return errAsync({ reason: "Unauthorized" });

        const memberLimitCheck = await checkOrgMemberLimit(orgId);
    if (memberLimitCheck.isErr()) {
      return errAsync({ reason: memberLimitCheck.error.reason });
    }

    const parsedAddressId = z.uuid().safeParse(addressId);
    if (!parsedAddressId.success)
      return errAsync({ reason: "Invalid address ID" });

    const parsedFrequency = z.string().min(1).safeParse(frequency);
    if (!parsedFrequency.success)
      return errAsync({ reason: "Invalid frequency" });

    const parsedDate = z.string().safeParse(firstCutDate);
    if (!parsedDate.success) return errAsync({ reason: "Invalid date" });

    const parsedNotes = z.string().nullable().optional().safeParse(notes);
    if (!parsedNotes.success) return errAsync({ reason: "Invalid notes" });

    // Verify parent client is active (not disabled)
    try {
      const [clientStatus] = (await sql`
        SELECT c.status FROM addresses a
        JOIN clients c ON a.client_id = c.id
        WHERE a.id = ${parsedAddressId.data} AND c.org_id = ${orgId}
      `) as unknown as { status: string }[];

      if (clientStatus?.status === "disabled") {
        return errAsync({
          reason:
            "This client is disabled due to plan limits. Please upgrade your plan.",
        });
      }
    } catch (err) {
      console.error(
        "Failed to verify client status in upsertScheduleDal:",
        err,
      );
      return errAsync({ reason: "Failed to verify client status." });
    }

    return ResultAsync.fromPromise(
      upsertScheduleDb(
        parsedAddressId.data,
        orgId,
        parsedFrequency.data,
        parsedDate.data,
        parsedNotes.data,
      ) as Promise<ScheduleWithOrgSchema>,
      () => ({ reason: "Failed to update schedule" }),
    );
  } catch (error) {
    console.error("Error in upsertScheduleDal:", error);
    return errAsync({ reason: "An unexpected error occurred" });
  }
}

export async function deleteScheduleDal(
  addressId: string,
): Promise<Result<ScheduleWithOrgSchema, { reason: string }>> {
  try {
    const { orgId } = await auth.protect();

    if (!orgId) return errAsync({ reason: "Unauthorized" });

    const parsedAddressId = z.uuid().safeParse(addressId);
    if (!parsedAddressId.success)
      return errAsync({ reason: "Invalid address ID" });

    // Verify parent client is active (not disabled)
    try {
      const [clientStatus] = (await sql`
        SELECT c.status FROM addresses a
        JOIN clients c ON a.client_id = c.id
        WHERE a.id = ${parsedAddressId.data} AND c.org_id = ${orgId}
      `) as unknown as { status: string }[];

      if (clientStatus?.status === "disabled") {
        return errAsync({
          reason:
            "This client is disabled due to plan limits. Please upgrade your plan.",
        });
      }
    } catch (err) {
      console.error(
        "Failed to verify client status in deleteScheduleDal:",
        err,
      );
      return errAsync({ reason: "Failed to verify client status." });
    }

    return ResultAsync.fromPromise(
      deleteScheduleDb(parsedAddressId.data).then((row) => {
        if (!row) throw new Error("Schedule not found");
        return { ...row, org_id: orgId } as ScheduleWithOrgSchema;
      }),
      () => ({ reason: "Failed to delete schedule" }),
    );
  } catch (error) {
    console.error("Error in deleteScheduleDal:", error);
    return errAsync({ reason: "An unexpected error occurred" });
  }
}

export async function completeJobDal(
  addressId: string,
  serviceType: string,
  assignedTo?: string | null,
  notes?: string | null,
  photoBlobPath?: string | null,
  capturedAt?: Date | null,
  completedAt?: Date | null,
  scheduledDate?: Date | null,
  oneTimeServiceId?: string | null,
): Promise<Result<CompletedJob, { reason: string }>> {
  try {
    const { orgId, userId } = await auth.protect();

    if (!orgId) return errAsync({ reason: "Unauthorized" });

    const parsedAddressId = z.string().uuid().safeParse(addressId);
    if (!parsedAddressId.success)
      return errAsync({ reason: "Invalid address ID" });

    const parsedServiceType = z.string().min(1).safeParse(serviceType);
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
          scheduledDate || null,
          oneTimeServiceId,
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
  } catch (error) {
    console.error("Error in completeJobDal:", error);
    return errAsync({ reason: "An unexpected error occurred" });
  }
}

export async function upsertAssignmentDal(
  addressId: string,
  userId: string | null,
  date: string,
): Promise<Result<Assignment | null, { reason: string }>> {
  try {
    const { orgId } = await auth.protect();

    if (!orgId) return errAsync({ reason: "Unauthorized" });

    const parsedAddressId = z.uuid().safeParse(addressId);
    if (!parsedAddressId.success)
      return errAsync({ reason: "Invalid address ID" });

    if (!userId || userId === "unassigned") {
      return ResultAsync.fromPromise(
        deleteAssignmentDb(parsedAddressId.data, date).then(() => null),
        (error) => {
          console.error(
            `Failed to delete assignment for address ${addressId} on date ${date}:`,
            error,
          );
          return { reason: "Failed to delete assignment" };
        },
      );
    }

    return ResultAsync.fromPromise(
      upsertAssignmentDb(
        parsedAddressId.data,
        orgId,
        userId,
        date,
      ) as Promise<Assignment>,
      (error) => {
        console.error(
          `Failed to upsert assignment for address ${addressId} to user ${userId} on date ${date}:`,
          error,
        );
        return { reason: "Failed to upsert assignment" };
      },
    );
  } catch (error) {
    console.error(
      `Unexpected error in upsertAssignmentDal (addressId: ${addressId}, userId: ${userId}, date: ${date}):`,
      error,
    );
    return errAsync({ reason: "An unexpected error occurred" });
  }
}

export async function updateAddressAssigneeDal(
  addressId: string,
  userId: string | null,
): Promise<Result<AddressRow, { reason: string }>> {
  try {
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
      (error) => {
        console.error(
          `Failed to update address assignee for address ${addressId} to user ${userId}:`,
          error,
        );
        return { reason: "Failed to update address assignee" };
      },
    );
  } catch (error) {
    console.error(
      `Unexpected error in updateAddressAssigneeDal (addressId: ${addressId}, userId: ${userId}):`,
      error,
    );
    return errAsync({ reason: "An unexpected error occurred" });
  }
}

export async function insertOneTimeServiceDal(
  addressId: string,
  name: string,
  serviceType: string,
  serviceDate: string,
  notes?: string | null,
  assignedMemberIds?: string[] | null,
): Promise<Result<OneTimeService, { reason: string }>> {
  try {
    const { orgId } = await auth.protect();

    if (!orgId) return errAsync({ reason: "Unauthorized" });

    const parsedAddressId = z.uuid().safeParse(addressId);
    if (!parsedAddressId.success)
      return errAsync({ reason: "Invalid address ID" });

    const parsedName = z.string().min(1).safeParse(name);
    if (!parsedName.success)
      return errAsync({ reason: "Invalid name" });

    const parsedServiceType = z.string().min(1).safeParse(serviceType);
    if (!parsedServiceType.success)
      return errAsync({ reason: "Invalid service type" });

    const parsedDate = z.string().safeParse(serviceDate);
    if (!parsedDate.success) return errAsync({ reason: "Invalid date" });

    const parsedNotes = z.string().nullable().optional().safeParse(notes);
    if (!parsedNotes.success) return errAsync({ reason: "Invalid notes" });

    const parsedAssignedMembers = z.array(z.string()).nullable().optional().safeParse(assignedMemberIds);
    if (!parsedAssignedMembers.success) return errAsync({ reason: "Invalid assigned members" });

    return ResultAsync.fromPromise(
      insertOneTimeServiceDb(
        parsedAddressId.data,
        orgId,
        parsedName.data,
        parsedServiceType.data,
        parsedDate.data,
        parsedNotes.data,
        parsedAssignedMembers.data,
      ) as Promise<OneTimeService>,
      () => ({ reason: "Failed to insert one-time service" }),
    );
  } catch (error) {
    console.error("Error in insertOneTimeServiceDal:", error);
    return errAsync({ reason: "An unexpected error occurred" });
  }
}

export async function deleteOneTimeServiceDal(
  serviceId: string,
): Promise<Result<OneTimeService, { reason: string }>> {
  try {
    const { orgId } = await auth.protect();

    if (!orgId) return errAsync({ reason: "Unauthorized" });

    const parsedServiceId = z.uuid().safeParse(serviceId);
    if (!parsedServiceId.success)
      return errAsync({ reason: "Invalid service ID" });

    return ResultAsync.fromPromise(
      deleteOneTimeServiceDb(parsedServiceId.data, orgId) as Promise<OneTimeService>,
      () => ({ reason: "Failed to delete one-time service" }),
    );
  } catch (error) {
    console.error("Error in deleteOneTimeServiceDal:", error);
    return errAsync({ reason: "An unexpected error occurred" });
  }
}
