/**
 * Real SQL against src/db/schema.sql (PGlite) for creating clients.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countRows,
  resetDb,
  seedTwoOrgs,
  sql,
} from "../../../tests/helpers/db";
import { insertClientDb, type NewAddressInput } from "./clients";

vi.mock("@/db/client", () => import("../../../tests/helpers/db"));
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

beforeEach(async () => {
  await resetDb();
  await seedTwoOrgs();
});

const address = (
  overrides: Partial<NewAddressInput> = {},
): NewAddressInput => ({
  street: "1 Main St",
  city: "Calgary",
  status: "active",
  ...overrides,
});

describe("insertClientDb", () => {
  it("stores the client and every address in order", async () => {
    const client = await insertClientDb(
      "org_a",
      "Jane Doe",
      "jane@example.com",
      null,
      [
        address({ street: "First", assignedMemberIds: ["user_1"] }),
        address({ street: "Second", state: "AB", zip: "T2X" }),
        address({ street: "Third", status: "disabled" }),
      ],
    );

    expect(client).toMatchObject({
      org_id: "org_a",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: null,
      status: "active",
    });
    expect(client.addresses.map((a) => a.street)).toEqual([
      "First",
      "Second",
      "Third",
    ]);
    const clientIds = new Set(client.addresses.map((a) => a.client_id));
    expect([...clientIds]).toEqual([client.id]);
    expect(client.addresses[0].assigned_member_ids).toEqual(["user_1"]);
    expect(client.addresses[1]).toMatchObject({ state: "AB", zip: "T2X" });
    expect(client.addresses[2].status).toBe("disabled");

    const rows = await sql`
      SELECT street, assigned_member_ids FROM addresses
      WHERE client_id = ${client.id}
      ORDER BY created_at
    `;
    expect(rows).toEqual([
      { street: "First", assigned_member_ids: ["user_1"] },
      { street: "Second", assigned_member_ids: [] },
      { street: "Third", assigned_member_ids: [] },
    ]);
  });

  // Regression: the client used to be inserted first and each address in its
  // own statement, so a failing address left a half-created client behind
  // (counted against the plan limit and duplicated on retry).
  it("saves nothing when an address can't be stored", async () => {
    const clientsBefore = await countRows("clients");
    const addressesBefore = await countRows("addresses");

    await expect(
      insertClientDb("org_a", "Jane Doe", null, null, [
        address({ street: "Fine" }),
        // Postgres rejects NUL characters in text.
        address({ street: "Bad\u0000street" }),
      ]),
    ).rejects.toThrow();

    expect(await countRows("clients")).toBe(clientsBefore);
    expect(await countRows("addresses")).toBe(addressesBefore);
  });
});
