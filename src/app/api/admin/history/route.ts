import { NextResponse } from "next/server";
import { getPastServicesListDal } from "@/dal/admin";

export async function GET(request: Request) {
  try {
    // const { orgId, orgRole } = await auth.protect();
    // if (!orgId || orgRole !== "org:admin") {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const clientId = searchParams.get("clientId") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getPastServicesListDal(page, clientId, search);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in history API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
