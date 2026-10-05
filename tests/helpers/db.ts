/**
 * In-memory Postgres (PGlite) for tests that run the real SQL in
 * src/db/queries against src/db/schema.sql.
 *
 * Usage in a test file:
 *   vi.mock("@/db/client", () => import("../../../tests/helpers/db"));
 *   vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
 *   beforeEach(() => resetDb());
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const schema = readFileSync(
  fileURLToPath(new URL("../../src/db/schema.sql", import.meta.url)),
  "utf8",
);

let dbPromise: Promise<PGlite> | undefined;

function getDb() {
  dbPromise ??= (async () => {
    const db = new PGlite({ extensions: { uuid_ossp } });
    await db.exec(schema);
    return db;
  })();
  return dbPromise;
}

/**
 * Drop-in replacement for the Neon `sql` tagged template: interpolated
 * values become $1, $2, … parameters and the result is the row array.
 */
export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> {
  const text = strings.reduce(
    (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""),
    "",
  );
  const db = await getDb();
  const result = await db.query<Record<string, unknown>>(text, values);
  return result.rows;
}

/** Runs plain SQL text, for test assertions (e.g. counting rows). */
export async function query(text: string, params: unknown[] = []) {
  const db = await getDb();
  return (await db.query<Record<string, unknown>>(text, params)).rows;
}

/** Number of rows in a table. */
export async function countRows(table: string) {
  const [row] = await query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return row.n as number;
}

/** Removes all rows. Every other table cascades from these two. */
export async function resetDb() {
  const db = await getDb();
  await db.exec("TRUNCATE organizations, users CASCADE;");
}

// ---------------------------------------------------------------------------
// Seed helpers. Each returns the inserted row.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown> & { id: string };

export async function seedOrg(orgId: string, name = orgId) {
  await sql`INSERT INTO organizations (org_id, name) VALUES (${orgId}, ${name})`;
}

export async function seedUser(userId: string) {
  await sql`
    INSERT INTO users (user_id, full_name, email)
    VALUES (${userId}, ${userId}, ${`${userId}@example.com`})
  `;
}

export async function seedClient(
  orgId: string,
  name = "Client",
  status = "active",
) {
  const [row] = await sql`
    INSERT INTO clients (org_id, name, status)
    VALUES (${orgId}, ${name}, ${status})
    RETURNING *
  `;
  return row as Row;
}

export async function seedAddress(
  clientId: string,
  opts: { street?: string; assignedMemberIds?: string[] } = {},
) {
  const [row] = await sql`
    INSERT INTO addresses (client_id, street, city, assigned_member_ids)
    VALUES (${clientId}, ${opts.street ?? "1 Main St"}, 'Calgary', ${opts.assignedMemberIds ?? []})
    RETURNING *
  `;
  return row as Row;
}

export async function seedSchedule(
  addressId: string,
  frequency: string,
  firstCutDate: string,
) {
  const [row] = await sql`
    INSERT INTO schedules (address_id, frequency, first_cut_date)
    VALUES (${addressId}, ${frequency}, ${firstCutDate})
    RETURNING *
  `;
  return row as Row;
}

/** Two orgs, each with one client and one address. */
export async function seedTwoOrgs() {
  await seedOrg("org_a");
  await seedOrg("org_b");
  const clientA = await seedClient("org_a", "Alice");
  const clientB = await seedClient("org_b", "Bob");
  const addressA = await seedAddress(clientA.id);
  const addressB = await seedAddress(clientB.id);
  return { clientA, clientB, addressA, addressB };
}
