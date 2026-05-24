import { clerkClient } from "@clerk/nextjs/server"; // Ensure correct import context
import { errAsync, okAsync, type ResultAsync } from "neverthrow";

export async function checkOrgMemberLimit(
  orgId: string,
): Promise<ResultAsync<void, { reason: string }>> {
  console.log(`[LIMIT_CHECK] Starting check for orgId: ${orgId}`);

  try {
    const client = await clerkClient();

    
    const [membersPage, org] = await Promise.all([
      client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100,
      }),
      client.organizations.getOrganization({ organizationId: orgId }),
    ]);

    // Deep log exactly what Clerk is giving us
    console.log("[LIMIT_CHECK] Clerk API Responses:", {
      orgId,
      orgName: org.name,
      maxAllowedMemberships: org.maxAllowedMemberships,
      publicMetadata: org.publicMetadata, 
      membersReturnedOnThisPage: membersPage.data?.length ?? 0,
      totalCountFromClerkMetadata: membersPage.totalCount, 
    });

    // Fallback to metadata total count if available, otherwise use page length
    const currentCount = membersPage.totalCount ?? membersPage.data.length;
    const maxLimit = org.maxAllowedMemberships;

    console.log(
      `[LIMIT_CHECK] Evaluation -> Current: ${currentCount}, Max: ${maxLimit}`,
    );

    if (
      maxLimit !== undefined &&
      maxLimit !== null &&
      currentCount > maxLimit
    ) {
      console.warn(
        `[LIMIT_CHECK] Limit Hit! Blocking addition for org: ${orgId}`,
      );

      return errAsync({
        reason: `You have reached your plan limit of ${maxLimit} members. You currently have ${currentCount} members. Please upgrade your plan.`,
      });
    }

    console.log(`[LIMIT_CHECK] Success -> Limit not reached for org: ${orgId}`);
    return okAsync(undefined);
  } catch (error) {
    // Detailed error logging to catch Auth, Network, or API Version mismatches
    console.error("[LIMIT_CHECK] Critical Failure:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      rawError: error,
    });

    return errAsync({ reason: "Failed to verify organization member limit." });
  }
}
