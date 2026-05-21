import { del, list } from "@vercel/blob";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import {
  getActiveCompletionPhotoUrlsDb,
  getExpiredCompletionPhotosDb,
} from "@/db/queries/clients";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const [expiredDbPhotos, activeDbPhotoUrls] = await Promise.all([
      getExpiredCompletionPhotosDb(),
      getActiveCompletionPhotoUrlsDb(),
    ]);

    const activeUrlsSet = new Set(activeDbPhotoUrls);
    const urlsToDelete = new Set<string>();
    const affectedOrgIds = new Set<string>();

    for (const photo of expiredDbPhotos) {
      if (photo.org_id) affectedOrgIds.add(photo.org_id);
    }

    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await list({ cursor, limit: 1000 });
      for (const blob of response.blobs) {
        if (
          blob.pathname.includes("completion-") &&
          !blob.pathname.includes("site-map")
        ) {
          const isNotInDb = !activeUrlsSet.has(blob.url);
          const isOlderThanTwoMonths = new Date(blob.uploadedAt) < twoMonthsAgo;

          if (isNotInDb || isOlderThanTwoMonths) {
            urlsToDelete.add(blob.url);
          }
        }
      }
      cursor = response.cursor;
      hasMore = response.hasMore;
    }

    const validUrlsToDelete = Array.from(urlsToDelete).filter((url) =>
      url.startsWith("https://"),
    );

    if (validUrlsToDelete.length === 0) {
      return NextResponse.json({
        message:
          "No orphaned or 2-month-old completion blobs found to clean up.",
        deletedBlobsCount: 0,
      });
    }

    for (let i = 0; i < validUrlsToDelete.length; i += 100) {
      await del(validUrlsToDelete.slice(i, i + 100));
    }

    for (const orgId of affectedOrgIds) {
      revalidateTag(`job-history-${orgId}`, "max");
      revalidateTag(`clients-info-${orgId}`, "max");
      revalidateTag(`clients-cutlist-${orgId}`, "max");
      revalidateTag(`clients-search-${orgId}`, "max");
    }

    return NextResponse.json({
      message: "Successfully cleaned up expired or unlinked completion blobs.",
      deletedBlobsCount: validUrlsToDelete.length,
      affectedOrgs: Array.from(affectedOrgIds),
    });
  } catch (error) {
    console.error("Cron cleanup error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
