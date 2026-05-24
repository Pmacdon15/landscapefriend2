import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/client";
import { rebalanceClientsForOrg } from "@/dal/rebalance";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  
  // Protect cron endpoint in production environment
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Fetch all organizations in the database
    const orgs = (await sql`
      SELECT org_id, name FROM organizations
    `) as unknown as { org_id: string; name: string }[];

    console.log(`[Cron Rebalance] Starting rebalance for ${orgs.length} organizations.`);

    const results = [];

    // 2. Iterate and rebalance each organization
    for (const org of orgs) {
      const result = await rebalanceClientsForOrg(org.org_id);
      results.push({
        orgId: org.org_id,
        name: org.name,
        ...result,
      });
    }

    return NextResponse.json({
      message: "Successfully rebalanced all organization clients.",
      organizationsProcessed: orgs.length,
      results,
    });
  } catch (error) {
    console.error("[Cron Rebalance] Error during client rebalancing:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
