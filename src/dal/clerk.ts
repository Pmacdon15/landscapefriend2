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

  return clerkClient().then((client) =>
    client.organizations
      .getOrganizationMembershipList({
        organizationId: orgId,
      })
      .then((members) =>
        members.data.map((m) => {
          const publicData = m.publicUserData;
          const firstName = publicData?.firstName || "";
          const lastName = publicData?.lastName || "";
          const identifier = publicData?.identifier;

          const fullName = `${firstName} ${lastName}`.trim();

          return {
            id: publicData?.userId || "",
            name: fullName || identifier || "Unknown Member",
          };
        }),
      )
      .catch((e) => {
        console.error("Failed to fetch organization members from Clerk:", e);
        return [];
      }),
  );
}
