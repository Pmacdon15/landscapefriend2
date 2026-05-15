import { auth } from "@clerk/nextjs/server";
import { errAsync, type Result, ResultAsync } from "neverthrow";
import z from "zod";
import {
  deleteSiteMapDb,
  getAddressesDb,
  getClientByIdDb,
  getCompletedJobsDb,
  getSchedulesDb,
  getSiteMapsDb,
  insertSiteMapDb,
} from "@/db/queries/clients";
import type { AddressRow, ScheduleRow } from "@/types/types";
import type { Address, Client, SiteMapWithOrgSchema } from "@/zod/schemas";

export async function saveSiteMapDal(
  addressId: string,
  name: string | null,
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

export async function getClientByIdDal(id: string): Promise<Client | null> {
  try {
    const { orgId, orgRole } = await auth.protect();
    if (!orgId || orgRole !== "org:admin") throw new Error("Unauthorized");

    const [clientRow, addresses, schedules, siteMaps, jobHistory] =
      await Promise.all([
        getClientByIdDb(id, orgId),
        getAddressesDb(orgId),
        getSchedulesDb(orgId),
        getSiteMapsDb(orgId),
        getCompletedJobsDb(orgId),
      ]);

    if (!clientRow) return null;

    const clientAddresses = addresses
      .filter((a: AddressRow) => a.client_id === id && a.status !== "deleted")
      .map((address: AddressRow) => {
        const schedule = schedules.find(
          (s: ScheduleRow) => s.address_id === address.id,
        );
        const addressSiteMaps = siteMaps.filter(
          (sm) => sm.address_id === address.id,
        );
        const latestJob = jobHistory.find((j) => j.address_id === address.id);

        return {
          ...address,
          schedule: schedule || null,
          sort_order: 0,
          assignment: null,
          completed_job: latestJob || null,
          site_maps: addressSiteMaps,
        } as Address;
      });

    return { ...clientRow, addresses: clientAddresses } as Client;
  } catch (error) {
    console.error("Error in getClientByIdDal:", error);
    return null;
  }
}
