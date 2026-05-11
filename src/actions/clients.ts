"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import type { CreateClientInput } from "@/zod/schemas";
import {
  createClientDal,
  deleteClientDal,
  deleteSiteMapDal,
  saveSiteMapDal,
  updateAddressAssigneeDal,
  updateClientDal,
} from "../dal/clients";

export async function createClientAction(data: CreateClientInput) {
  const result = await createClientDal(data);

  return result.match(
    (client) => ({ success: true, client, error: null }),
    (err) => ({ success: false, client: null, error: err.reason }),
  );
}

export async function updateClientAction(
  clientId: string,
  data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    addresses: {
      id?: string;
      street: string;
      city: string;
      state?: string | null;
      zip?: string | null;
      status: "active" | "disabled" | "deleted";
      assigned_to?: string | null;
    }[];
  },
) {
  const result = await updateClientDal(clientId, data);
  revalidatePath("/client-info-list");
  revalidatePath("/clients-service");

  return result.match(
    (client) => ({ success: true, client, error: null }),
    (err) => ({ success: false, client: null, error: err.reason }),
  );
}

export async function updateAddressAssigneeAction(
  addressId: string,
  userId: string | null,
) {
  const result = await updateAddressAssigneeDal(addressId, userId);
  revalidatePath("/client-info-list");
  revalidatePath("/clients-service");

  return result.match(
    () => ({ success: true, error: null }),
    (err) => ({ success: false, error: err.reason }),
  );
}

export async function deleteClientAction(clientId: string) {
  const result = await deleteClientDal(clientId);
  revalidatePath("/client-info-list");
  revalidatePath("/clients-service");

  return result.match(
    () => ({ success: true, error: null }),
    (err) => ({ success: false, error: err.reason }),
  );
}

export async function saveSiteMapAction(formData: FormData) {
  const addressId = formData.get("addressId") as string;
  const name = formData.get("name") as string | null;
  const mapDataRaw = formData.get("mapData") as string | null;
  const file = formData.get("file") as File | null;

  const mapData = mapDataRaw ? JSON.parse(mapDataRaw) : null;

  if (file && file.size > 1024 * 1024) {
    return {
      success: false,
      siteMap: null,
      error: "File size exceeds 1MB limit",
    };
  }

  let blobPath: string | null = null;

  if (file) {
    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const betterFileName = `sitemap-${addressId}-${timestamp}-${sanitizedName}`;

      const blob = await put(betterFileName, file, {
        access: "private",
      });

      blobPath = blob.url;
    } catch (error) {

      console.error("Blob upload error:", error);
      return {
        success: false,
        siteMap: null,
        error: "Failed to upload to storage",
      };
    }
  }

  const result = await saveSiteMapDal(addressId, name, blobPath, mapData);
  revalidatePath("/client-info-list");

  return result.match(
    (siteMap) => ({ success: true, siteMap, error: null }),
    (err) => {
      console.error("Save site map failure:", err);
      return { success: false, siteMap: null, error: err.reason };
    },
  );
}

export async function deleteSiteMapAction(siteMapId: string) {
  const result = await deleteSiteMapDal(siteMapId);
  revalidatePath("/client-info-list");

  return result.match(
    () => ({ success: true, error: null }),
    (err) => ({ success: false, error: err.reason }),
  );
}
