import { auth, clerkClient } from "@clerk/nextjs/server";

export async function getOrganizationMembersDal(): Promise<
  { id: string; name: string }[]
> {
  const { orgId } = await auth.protect();

  if (!orgId) {
    console.error(
      "getOrganizationMembersDal: No orgId found after auth.protect()",
    );
    return [];
  }

  try {
    const client = await clerkClient();
    const members = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    return members.data.map((m) => {
      const publicData = m.publicUserData;
      const firstName = publicData?.firstName || "";
      const lastName = publicData?.lastName || "";
      const identifier = publicData?.identifier || "Unknown Member";

      const fullName = `${firstName} ${lastName}`.trim();

      return {
        id: publicData?.userId || "",
        name: fullName || identifier || "Unknown Member",
      };
    });
  } catch (error) {
    const isAborted =
      error instanceof Error && error.message?.includes("aborted");
    if (isAborted) {
      console.warn(
        "Clerk request was aborted (possibly due to navigation or revalidation)",
      );
    } else {
      console.error("Failed to fetch organization members from Clerk:", error);
    }

    return [];
  }
}
