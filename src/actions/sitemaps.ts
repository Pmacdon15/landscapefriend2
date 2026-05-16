"use server";

import { put } from "@vercel/blob";
import { updateTag } from "next/cache";
import {
  deleteSiteMapDal,
  saveSiteMapDal,
  updateSiteMapDal,
} from "@/dal/sitemap";

export async function saveSiteMapAction(formData: FormData) {
  const addressId = formData.get("addressId") as string;
  const name = formData.get("name") as string | null;
  const notes = formData.get("notes") as string | null;
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

  const result = await saveSiteMapDal(
    addressId,
    name,
    notes,
    blobPath,
    mapData,
  );

  return result.match(
    (siteMap) => {
      updateTag(`sitemaps-${siteMap.org_id}`);
      return { success: true, siteMap, error: null };
    },
    (err) => {
      console.error("Save site map failure:", err);
      return { success: false, siteMap: null, error: err.reason };
    },
  );
}

export async function updateSiteMapAction(formData: FormData) {
  const siteMapId = formData.get("siteMapId") as string;
  const name = formData.get("name") as string | null;
  const notes = formData.get("notes") as string | null;
  const mapDataRaw = formData.get("mapData") as string | null;

  const mapData = mapDataRaw ? JSON.parse(mapDataRaw) : null;

  const result = await updateSiteMapDal(siteMapId, name, notes, mapData);

  return result.match(
    (siteMap) => {
      updateTag(`sitemaps-${siteMap.org_id}`);
      return { success: true, siteMap, error: null };
    },
    (err) => {
      console.error("Update site map failure:", err);
      return { success: false, siteMap: null, error: err.reason };
    },
  );
}

export async function deleteSiteMapAction(siteMapId: string) {
  const result = await deleteSiteMapDal(siteMapId);

  return result.match(
    (siteMap) => {
      updateTag(`sitemaps-${siteMap.org_id}`);
      return { success: true, siteMap, error: null };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}
