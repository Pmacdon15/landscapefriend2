import { auth } from "@clerk/nextjs/server";
import { errAsync, type Result, ResultAsync } from "neverthrow";
import z from "zod";
import {
  deleteSiteMapDb,
  insertSiteMapDb,
  updateSiteMapDb,
} from "@/db/queries/clients";
import type { SiteMapWithOrgSchema } from "@/zod/schemas";

export async function saveSiteMapDal(
  addressId: string,
  name: string | null,
  notes: string | null,
  blobPath: string | null,
  mapData: Record<string, unknown> | null,
): Promise<Result<SiteMapWithOrgSchema, { reason: string }>> {
  try {
    const { orgId, orgRole } = await auth.protect();
    if (!orgId || orgRole !== "org:admin")
      return errAsync({ reason: "Unauthorized" });

    const parsedAddressId = z.uuid().safeParse(addressId);
    if (!parsedAddressId.success)
      return errAsync({ reason: "Invalid address ID" });

    return ResultAsync.fromPromise(
      insertSiteMapDb(
        parsedAddressId.data,
        name,
        notes,
        blobPath,
        mapData,
      ) as Promise<SiteMapWithOrgSchema>,
      () => ({ reason: "Failed to save site map" }),
    );
  } catch (error) {
    console.error("Error in saveSiteMapDal:", error);
    return errAsync({ reason: "An unexpected error occurred" });
  }
}

export async function updateSiteMapDal(
  siteMapId: string,
  name: string | null,
  notes: string | null,
  mapData: Record<string, unknown> | null,
): Promise<Result<SiteMapWithOrgSchema, { reason: string }>> {
  try {
    const { orgId, orgRole } = await auth.protect();
    if (!orgId || orgRole !== "org:admin")
      return errAsync({ reason: "Unauthorized" });

    const parsedSiteMapId = z.uuid().safeParse(siteMapId);
    if (!parsedSiteMapId.success)
      return errAsync({ reason: "Invalid site map ID" });

    return ResultAsync.fromPromise(
      updateSiteMapDb(
        parsedSiteMapId.data,
        name,
        notes,
        mapData,
      ) as Promise<SiteMapWithOrgSchema>,
      () => ({ reason: "Failed to update site map" }),
    );
  } catch (error) {
    console.error("Error in updateSiteMapDal:", error);
    return errAsync({ reason: "An unexpected error occurred" });
  }
}

export async function deleteSiteMapDal(
  siteMapId: string,
): Promise<Result<SiteMapWithOrgSchema, { reason: string }>> {
  try {
    const { orgId, orgRole } = await auth.protect();
    if (!orgId || orgRole !== "org:admin")
      return errAsync({ reason: "Unauthorized" });

    const parsedSiteMapId = z.uuid().safeParse(siteMapId);
    if (!parsedSiteMapId.success)
      return errAsync({ reason: "Invalid site map ID" });

    return ResultAsync.fromPromise(
      deleteSiteMapDb(parsedSiteMapId.data),
      () => ({
        reason: "Failed to delete site map",
      }),
    );
  } catch (error) {
    console.error("Error in deleteSiteMapDal:", error);
    return errAsync({ reason: "An unexpected error occurred" });
  }
}
