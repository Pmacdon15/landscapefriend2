import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { getSiteMapWithOrgDb } from "@/db/queries/clients";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId } = await auth();
  if (!orgId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const siteMap = await getSiteMapWithOrgDb(id, orgId);
  if (!siteMap || !siteMap.blob_path) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const result = await get(siteMap.blob_path, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    });

    if (!result) {
      return new NextResponse("Not found in storage", { status: 404 });
    }

    // Blob hasn't changed — tell the browser to use its cached copy
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
