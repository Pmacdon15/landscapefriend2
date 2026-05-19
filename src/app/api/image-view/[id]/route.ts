import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { cacheLife } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import {
  getCompletionPhotoWithOrgDb,
  getSiteMapWithOrgDb,
} from "@/db/queries/clients";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const type = request.nextUrl.searchParams.get("type");

  // Fetch the path using the tenant-isolated cache helper
  const blobPath = await getCachedBlobPath(id, orgId, type);

  if (!blobPath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;

    const result = await get(blobPath, {
      access: "private",
      ifNoneMatch,
    });

    if (!result) {
      return new NextResponse("Not found in storage", { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("Site map fetch error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

async function getCachedBlobPath(
  id: string,
  orgId: string,
  type: string | null,
) {
  "use cache";
  cacheLife("hours");

  let blobPath: string | null = null;

  if (type === "sitemap") {
    const siteMap = await getSiteMapWithOrgDb(id, orgId);
    if (siteMap?.blob_path) blobPath = siteMap.blob_path;
  } else if (type === "photo") {
    const completionPhoto = await getCompletionPhotoWithOrgDb(id, orgId);
    if (completionPhoto?.blob_path) blobPath = completionPhoto.blob_path;
  } else {
    const siteMap = await getSiteMapWithOrgDb(id, orgId);
    if (siteMap?.blob_path) {
      blobPath = siteMap.blob_path;
    } else {
      const completionPhoto = await getCompletionPhotoWithOrgDb(id, orgId);
      if (completionPhoto?.blob_path) {
        blobPath = completionPhoto.blob_path;
      }
    }
  }

  return blobPath;
}
