import { upsertOrganizationDb, upsertUserDb } from "@/db/queries/webhooks";

/**
 * DAL for handling Webhooks.
 * NO AUTH for webhook: This DAL bypasses the standard session-based auth
 * because it is triggered by Clerk's servers. Security is handled
 * at the API route layer via signature verification.
 */

export async function handleUserCreatedDal(
  userId: string,
  fullName: string,
  email: string,
) {
  return upsertUserDb(userId, fullName, email);
}

export async function handleOrganizationCreatedDal(
  orgId: string,
  name: string,
) {
  return upsertOrganizationDb(orgId, name);
}
