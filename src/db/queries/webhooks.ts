import { sql } from "../client";

export async function upsertUserDb(
  userId: string,
  fullName: string,
  email: string,
) {
  const result = await sql`
    INSERT INTO users (user_id, full_name, email)
    VALUES (${userId}, ${fullName}, ${email})
    ON CONFLICT (user_id) DO UPDATE SET 
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return result[0];
}

export async function upsertOrganizationDb(
  orgId: string,
  name: string,
) {
  const result = await sql`
    INSERT INTO organizations (org_id, name)
    VALUES (${orgId}, ${name})
    ON CONFLICT (org_id) DO UPDATE SET 
      name = EXCLUDED.name     
    RETURNING *
  `;
  return result[0];
}
