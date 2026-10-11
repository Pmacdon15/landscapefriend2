"use server";

import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { format } from "date-fns";
import { updateTag } from "next/cache";
import { completeJobDal } from "@/dal/service";
import {
  detectUploadedImage,
  MAX_COMPLETION_PHOTO_BYTES,
} from "@/lib/utils/image-upload";

export async function completeJobAction(formData: FormData) {
  const { orgId } = await auth.protect();
  const addressId = formData.get("addressId") as string;
  const serviceType = formData.get("serviceType") as string;
  const assignedMemberIdsStr = formData.get("assignedMemberIds") as
    | string
    | null;
  const assignedMemberIds = assignedMemberIdsStr
    ? JSON.parse(assignedMemberIdsStr)
    : null;
  const notes = formData.get("notes") as string | null;
  const photoFile = formData.get("photoFile") as File | null;
  const capturedAtRaw = formData.get("capturedAt") as string | null;
  const completedAtRaw = formData.get("completedAt") as string | null;
  const scheduledDateRaw = formData.get("scheduledDate") as string | null;
  const oneTimeServiceId = formData.get("oneTimeServiceId") as string | null;

  const capturedAt = capturedAtRaw ? new Date(capturedAtRaw) : null;
  const completedAt = completedAtRaw ? new Date(completedAtRaw) : null;
  const scheduledDate = scheduledDateRaw ? new Date(scheduledDateRaw) : null;

  let photoBlobPath: string | null = null;

  if (photoFile && photoFile.size > 0) {
    // Never trust the client's file type or name: detect the image type from
    // its bytes and store it with a server-chosen extension and type (#79).
    if (photoFile.size > MAX_COMPLETION_PHOTO_BYTES) {
      return { success: false, job: null, error: "Photo is too large" };
    }
    const image = await detectUploadedImage(photoFile);
    if (!image) {
      return {
        success: false,
        job: null,
        error: "Photo must be a JPEG, PNG, WebP or HEIC image",
      };
    }

    try {
      const timestamp = Date.now();
      const fileName = `completion-${addressId}-${timestamp}.${image.extension}`;
      const blob = await put(fileName, photoFile, {
        access: "private",
        contentType: image.contentType,
      });
      photoBlobPath = blob.url;
    } catch (error) {
      console.error("Completion photo upload error:", error);
    }
  }

  const result = await completeJobDal(
    addressId,
    serviceType,
    assignedMemberIds,
    notes,
    photoBlobPath,
    capturedAt,
    completedAt,
    scheduledDate,
    oneTimeServiceId,
  );

  return result.match(
    (job) => {
      updateTag(`job-history-${orgId}`);
      updateTag(`clients-info-${orgId}`);
      updateTag(`clients-cutlist-${orgId}`);
      if (completedAt) {
        updateTag(`job-history-${orgId}-${format(completedAt, "yyyy-MM-dd")}`);
      }
      if (scheduledDate) {
        updateTag(
          `job-history-${orgId}-${format(scheduledDate, "yyyy-MM-dd")}`,
        );
      }
      return {
        success: true,
        job,
        error: null,
      };
    },
    (err) => ({
      success: false,
      job: null,
      error: err.reason,
    }),
  );
}
