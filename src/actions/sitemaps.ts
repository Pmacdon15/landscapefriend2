"use server";

import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { updateTag } from "next/cache";
import z from "zod";
import {
  deleteSiteMapDal,
  saveSiteMapDal,
  updateSiteMapDal,
} from "@/dal/sitemap";
import { addressBelongsToOrgDb } from "@/db/queries/clients";
import { detectUploadedImage } from "@/lib/utils/image-upload";

function parseMapData(
  raw: string | null,
): { ok: true; value: Record<string, unknown> | null } | { ok: false } {
  if (!raw) return { ok: true, value: null };
  try {
    const value = JSON.parse(raw);
    if (value !== null && (typeof value !== "object" || Array.isArray(value)))
      return { ok: false };
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

export async function saveSiteMapAction(formData: FormData) {
  // Authenticate and authorize before touching storage, so callers who will be
  // rejected by the DAL can't leave orphaned blobs behind (#82).
  const { orgId, orgRole } = await auth.protect();
  if (!orgId || orgRole !== "org:admin") {
    return { success: false, siteMap: null, error: "Unauthorized" };
  }

  const parsedAddressId = z.uuid().safeParse(formData.get("addressId"));
  if (!parsedAddressId.success) {
    return { success: false, siteMap: null, error: "Invalid address ID" };
  }
  const addressId = parsedAddressId.data;
  const name = formData.get("name") as string | null;
  const notes = formData.get("notes") as string | null;
  const mapDataRaw = formData.get("mapData") as string | null;
  const file = formData.get("file") as File | null;

  const parsedMapData = parseMapData(mapDataRaw);
  if (!parsedMapData.ok) {
    return { success: false, siteMap: null, error: "Invalid map data" };
  }
  const mapData = parsedMapData.value;

  if (file && file.size > 1024 * 1024) {
    return {
      success: false,
      siteMap: null,
      error: "File size exceeds 1MB limit",
    };
  }

  // Only real images may be stored; type and extension come from the bytes,
  // never from the uploaded file name (#79).
  const image = file ? await detectUploadedImage(file) : null;
  if (file && !image) {
    return {
      success: false,
      siteMap: null,
      error: "Site map must be a JPEG, PNG, WebP or HEIC image",
    };
  }

  let blobPath: string | null = null;

  if (file && image) {
    if (!(await addressBelongsToOrgDb(addressId, orgId))) {
      return { success: false, siteMap: null, error: "Address not found" };
    }

    try {
      const timestamp = Date.now();
      const betterFileName = `sitemap-${addressId}-${timestamp}.${image.extension}`;

      const blob = await put(betterFileName, file, {
        access: "private",
        contentType: image.contentType,
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
      updateTag(`clients-info-${siteMap.org_id}`);
      updateTag(`clients-cutlist-${siteMap.org_id}`);
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

  const parsedMapData = parseMapData(mapDataRaw);
  if (!parsedMapData.ok) {
    return { success: false, siteMap: null, error: "Invalid map data" };
  }
  const mapData = parsedMapData.value;

  const result = await updateSiteMapDal(siteMapId, name, notes, mapData);

  return result.match(
    (siteMap) => {
      updateTag(`sitemaps-${siteMap.org_id}`);
      updateTag(`clients-info-${siteMap.org_id}`);
      updateTag(`clients-cutlist-${siteMap.org_id}`);
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
      updateTag(`clients-info-${siteMap.org_id}`);
      updateTag(`clients-cutlist-${siteMap.org_id}`);
      return { success: true, siteMap, error: null };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}
