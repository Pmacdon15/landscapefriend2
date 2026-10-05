/**
 * getClientsForCutListDb against real SQL (PGlite): which addresses appear on
 * the cut list for a given day.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetDb,
  seedAddress,
  seedClient,
  seedOrg,
  seedSchedule,
  sql,
} from "../../../tests/helpers/db";
import {
  getClientsForCutListDb,
  insertCompletedJobDb,
  insertOneTimeServiceDb,
  upsertAssignmentDb,
} from "./clients";

vi.mock("@/db/client", () => import("../../../tests/helpers/db"));
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const ORG = "org_a";

/** Client names on the "show all" cut list for a date. */
async function namesOn(date: string) {
  const clients = await getClientsForCutListDb(ORG, date, undefined, true);
  return clients.map((c) => c.name).sort();
}

/** A client with one address and a recurring schedule. */
async function scheduled(name: string, frequency: string, firstCut: string) {
  const client = await seedClient(ORG, name);
  const address = await seedAddress(client.id);
  await seedSchedule(address.id, frequency, firstCut);
  return { client, address };
}

beforeEach(async () => {
  await resetDb();
  await seedOrg(ORG);
});

describe("recurring schedules", () => {
  it.each([
    ["daily", "2026-06-10", true],
    ["daily", "2026-06-20", false], // starts after the date
    ["weekly", "2026-06-01", true], // 14 days before
    ["weekly", "2026-06-15", true], // first cut is today
    ["weekly", "2026-06-02", false],
    ["bi-weekly", "2026-06-01", true],
    ["bi-weekly", "2026-06-08", false], // the off week
    ["monthly", "2026-03-15", true],
    ["monthly", "2026-05-14", false],
  ])("%s starting %s is due on 2026-06-15: %s", async (freq, first, due) => {
    await scheduled("Jane", freq, first);
    expect(await namesOn("2026-06-15")).toEqual(due ? ["Jane"] : []);
  });

  it("marks recurring addresses as due", async () => {
    await scheduled("Jane", "weekly", "2026-06-01");
    const [client] = await getClientsForCutListDb(
      ORG,
      "2026-06-15",
      undefined,
      true,
    );
    expect(client.addresses?.[0]).toMatchObject({ is_recurring_due: true });
  });

  // Known bug: a monthly schedule on the 29th–31st is skipped in shorter
  // months, because the query compares the day of the month exactly.
  // getNextCutDate (fixed in #60) says the next cut is June 30. See #72.
  it.fails("monthly on the 31st is due on the last day of a 30-day month", async () => {
    await scheduled("Jane", "monthly", "2026-01-31");
    expect(await namesOn("2026-06-30")).toEqual(["Jane"]);
  });

  it.fails("monthly on the 30th is due on Feb 28", async () => {
    await scheduled("Jane", "monthly", "2026-01-30");
    expect(await namesOn("2026-02-28")).toEqual(["Jane"]);
  });
});

describe("what is left off", () => {
  it("skips disabled clients, deleted addresses and other orgs", async () => {
    await scheduled("Active", "weekly", "2026-06-01");
    const disabled = await seedClient(ORG, "Disabled", "disabled");
    await seedSchedule(
      (await seedAddress(disabled.id)).id,
      "weekly",
      "2026-06-01",
    );
    const { address } = await scheduled(
      "Deleted address",
      "weekly",
      "2026-06-01",
    );
    await sql`UPDATE addresses SET status = 'deleted' WHERE id = ${address.id}`;
    await seedOrg("org_b");
    const other = await seedClient("org_b", "Other org");
    await seedSchedule(
      (await seedAddress(other.id)).id,
      "weekly",
      "2026-06-01",
    );

    expect(await namesOn("2026-06-15")).toEqual(["Active"]);
  });

  it("returns nothing for a day with no work", async () => {
    await scheduled("Jane", "weekly", "2026-06-01");
    expect(await namesOn("2026-06-16")).toEqual([]);
  });
});

describe("one-time services", () => {
  it("shows an address with a one-time service on that day only", async () => {
    const client = await seedClient(ORG, "Jane");
    const address = await seedAddress(client.id);
    await insertOneTimeServiceDb(
      address.id,
      ORG,
      "Aeration",
      "other",
      "2026-06-15",
    );

    expect(await namesOn("2026-06-15")).toEqual(["Jane"]);
    expect(await namesOn("2026-06-16")).toEqual([]);

    const [result] = await getClientsForCutListDb(
      ORG,
      "2026-06-15",
      undefined,
      true,
    );
    expect(result.addresses?.[0].one_time_services).toEqual([
      expect.objectContaining({ name: "Aeration", service_date: "2026-06-15" }),
    ]);
  });
});

describe("who sees which address", () => {
  async function setup() {
    const { address: sam } = await scheduled("Sam's", "weekly", "2026-06-01");
    await sql`UPDATE addresses SET assigned_member_ids = ${["user_sam"]} WHERE id = ${sam.id}`;
    const { address: alex } = await scheduled("Alex's", "weekly", "2026-06-01");
    await sql`UPDATE addresses SET assigned_member_ids = ${["user_alex"]} WHERE id = ${alex.id}`;
    return { sam, alex };
  }

  const namesFor = async (userId: string) =>
    (await getClientsForCutListDb(ORG, "2026-06-15", userId, false))
      .map((c) => c.name)
      .sort();

  it("a member sees only addresses assigned to them", async () => {
    await setup();
    expect(await namesFor("user_sam")).toEqual(["Sam's"]);
    expect(await namesFor("user_alex")).toEqual(["Alex's"]);
    expect(await namesFor("user_nobody")).toEqual([]);
  });

  it("a day's assignment overrides the address's usual members", async () => {
    const { sam } = await setup();
    await upsertAssignmentDb(sam.id, ORG, "user_alex", "2026-06-15");
    expect(await namesFor("user_sam")).toEqual([]);
    expect(await namesFor("user_alex")).toEqual(["Alex's", "Sam's"]);
  });

  it("members of a one-time service see it", async () => {
    const client = await seedClient(ORG, "Extra");
    const address = await seedAddress(client.id);
    await insertOneTimeServiceDb(
      address.id,
      ORG,
      "Cleanup",
      "other",
      "2026-06-15",
      null,
      ["user_sam"],
    );
    expect(await namesFor("user_sam")).toEqual(["Extra"]);
  });
});

describe("filters", () => {
  it("filters by search text on name, street or city", async () => {
    await scheduled("Jane Doe", "weekly", "2026-06-01");
    const { address } = await scheduled("Bob", "weekly", "2026-06-01");
    await sql`UPDATE addresses SET street = '9 Elm Ave' WHERE id = ${address.id}`;

    const search = async (q: string) =>
      (await getClientsForCutListDb(ORG, "2026-06-15", undefined, true, q)).map(
        (c) => c.name,
      );
    expect(await search("jane")).toEqual(["Jane Doe"]);
    expect(await search("elm")).toEqual(["Bob"]);
    expect(await search("zzz")).toEqual([]);
  });

  it("filters to a single client", async () => {
    const { client } = await scheduled("Jane", "weekly", "2026-06-01");
    await scheduled("Bob", "weekly", "2026-06-01");
    const result = await getClientsForCutListDb(
      ORG,
      "2026-06-15",
      undefined,
      true,
      undefined,
      client.id,
    );
    expect(result.map((c) => c.name)).toEqual(["Jane"]);
  });
});

describe("completed jobs", () => {
  it("attaches the job completed for that day", async () => {
    const { address } = await scheduled("Jane", "weekly", "2026-06-01");
    await insertCompletedJobDb(
      address.id,
      ORG,
      "grass",
      null,
      null,
      new Date("2026-06-15T18:00:00Z"),
      null,
      "All done",
      new Date("2026-06-15T12:00:00Z"),
    );
    const [client] = await getClientsForCutListDb(
      ORG,
      "2026-06-15",
      undefined,
      true,
    );
    expect(client.addresses?.[0].completed_job).toMatchObject({
      service_type: "grass",
      notes: "All done",
    });

    const [nextWeek] = await getClientsForCutListDb(
      ORG,
      "2026-06-22",
      undefined,
      true,
    );
    expect(nextWeek.addresses?.[0].completed_job).toBeNull();
  });
});
