import { clerkClient } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { sql } from "@/db/client";

/**
 * Rebalances clients for a given organization based on their subscription tier in Clerk.
 * If the organization has more active clients than their plan allows, older clients are kept
 * active and newer clients are disabled. If they have upgraded, disabled clients are re-enabled
 * up to the new limit.
 *
 * Limit tier structure:
 * - "200-clients" feature -> 200 clients
 * - "100-clients" feature -> 100 clients
 * - Default -> 3 clients (set to 3 for testing as requested)
 */
export async function rebalanceClientsForOrg(orgId: string): Promise<{
  success: boolean;
  limit: number;
  totalClients: number;
  activatedCount: number;
  disabledCount: number;
}> {
  let limit = 50;

  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({
      organizationId: orgId,
    });

    // Check organization features / public metadata for limits
    const metadata = org.publicMetadata as { features?: string[] } | undefined;
    const features = metadata?.features || [];

    if (features.includes("200-clients") || features.includes("200_clients")) {
      limit = 200;
    } else if (
      features.includes("100-clients") ||
      features.includes("100_clients")
    ) {
      limit = 100;
    }
  } catch (error) {
    console.error(
      `[Rebalance] Failed to fetch Clerk metadata details for org ${orgId}:`,
      error,
    );
  }

  // Also query Clerk's Billing Subscription API as a robust check
  try {
    const client = await clerkClient();

    const subscription =
      await client.billing.getOrganizationBillingSubscription(orgId);

    if (subscription) {
      const subscriptionStr = JSON.stringify(subscription).toLowerCase();
      if (
        subscriptionStr.includes("200-clients") ||
        subscriptionStr.includes("200_clients")
      ) {
        limit = 200;
      } else if (
        subscriptionStr.includes("100-clients") ||
        subscriptionStr.includes("100_clients")
      ) {
        limit = 100;
      }
    }
  } catch (billingError) {
    console.log(
      `[Rebalance] Clerk billing subscription check bypassed or not found for org ${orgId}:`,
      billingError,
    );
  }

  try {
    // Fetch all clients for the organization sorted by created_at ASC (oldest first)
    const clients = (await sql`
      SELECT id, status FROM clients
      WHERE org_id = ${orgId}
      ORDER BY created_at ASC
    `) as unknown as { id: string; status: string }[];

    const toActive: string[] = [];
    const toDisabled: string[] = [];

    clients.forEach((client, index) => {
      const targetStatus = index < limit ? "active" : "disabled";
      if (client.status !== targetStatus) {
        if (targetStatus === "active") {
          toActive.push(client.id);
        } else {
          toDisabled.push(client.id);
        }
      }
    });

    // Perform database updates
    if (toActive.length > 0) {
      await sql`
        UPDATE clients
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(${toActive})
      `;
    }

    if (toDisabled.length > 0) {
      await sql`
        UPDATE clients
        SET status = 'disabled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(${toDisabled})
      `;
    }

    // Instantly purge Next.js caches for this organization
    if (toActive.length > 0 || toDisabled.length > 0) {
      revalidateTag(`clients-info-${orgId}`, "max");
      revalidateTag(`clients-cutlist-${orgId}`, "max");
      revalidateTag(`clients-search-${orgId}`, "max");
      revalidateTag(`schedules-${orgId}`, "max");
    }

    console.log(
      `[Rebalance] Successfully rebalanced org ${orgId}. Limit: ${limit}. Activated: ${toActive.length}, Disabled: ${toDisabled.length}`,
    );

    return {
      success: true,
      limit,
      totalClients: clients.length,
      activatedCount: toActive.length,
      disabledCount: toDisabled.length,
    };
  } catch (error) {
    console.error(
      `[Rebalance] Error rebalancing clients for org ${orgId}:`,
      error,
    );
    return {
      success: false,
      limit,
      totalClients: 0,
      activatedCount: 0,
      disabledCount: 0,
    };
  }
}
