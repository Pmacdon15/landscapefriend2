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

    // Fetch members, organization details, and billing subscription in parallel!
    const [members, org, subscription] = await Promise.all([
      client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      }),
      client.organizations.getOrganization({ organizationId: orgId }),
      client.billing
        .getOrganizationBillingSubscription(orgId)
        .catch(() => null),
    ]);

    // Check if the organization has exceeded its member limit
    const currentMembers = members.data.length;
    const maxMembers = org.maxAllowedMemberships;

    if (
      maxMembers !== undefined &&
      maxMembers !== null &&
      currentMembers > maxMembers
    ) {
      console.log(
        `[Rebalance] Org ${orgId} has exceeded membership limit. Allowed: ${maxMembers}, Current: ${currentMembers}. Disabling all clients and schedules.`,
      );
      limit = 0; // Exceeded member limit, disable all schedules by setting limit to 0
    } else {
      // Check organization features / public metadata for limits
      const metadata = org.publicMetadata as
        | { features?: string[] }
        | undefined;
      const features = metadata?.features || [];

      if (
        features.includes("200-clients") ||
        features.includes("200_clients")
      ) {
        limit = 200;
      } else if (
        features.includes("100-clients") ||
        features.includes("100_clients")
      ) {
        limit = 100;
      }

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
    }
  } catch (error) {
    console.error(
      `[Rebalance] Failed to fetch Clerk details or check member limit for org ${orgId}:`,
      error,
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

    // Perform database updates in a single atomic conditional transactional statement
    const allIds = [...toActive, ...toDisabled];
    if (allIds.length > 0) {
      await sql`
        UPDATE clients
        SET status = CASE 
          WHEN id = ANY(${toActive.length > 0 ? toActive : ["00000000-0000-0000-0000-000000000000"]}) THEN 'active'
          ELSE 'disabled'
        END,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(${allIds})
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
