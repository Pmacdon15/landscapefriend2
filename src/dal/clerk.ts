import { auth, clerkClient } from "@clerk/nextjs/server";

export async function getOrganizationMembersDal(): Promise<
  { id: string; name: string }[]
> {
  const { orgId } = await auth.protect();

  if (!orgId) {
    console.error("getOrganizationMembersDal: No orgId found after auth.protect()");
    return [];
  }

  try {
    const client = await clerkClient();
    const members = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    return members.data.map((m) => ({
      id: m.publicUserData?.userId || "",
      name:
        m.publicUserData?.firstName && m.publicUserData?.lastName
          ? `${m.publicUserData.firstName} ${m.publicUserData.lastName}`
          : m.publicUserData?.identifier || "Unknown Member",
    }));
  } catch (error) {
    const isAborted = error instanceof Error && error.message?.includes("aborted");
    if (isAborted) {
      console.warn("Clerk request was aborted (possibly due to navigation or revalidation)");
    } else {
      console.error("Failed to fetch organization members from Clerk:", error);
    }

    return [];
  }
}
