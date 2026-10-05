/**
 * Real SQL against src/db/schema.sql (PGlite). Every org-scoped query must
 * refuse to read or change another org's rows. See #55 and #70.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countRows,
  resetDb,
  seedSchedule,
  seedTwoOrgs,
  sql,
} from "../../../tests/helpers/db";
import {
  addressBelongsToOrgDb,
  addressesBelongToOrgDb,
  checkClientLimit,
  clientBelongsToOrgDb,
  deleteAssignmentDb,
  deleteClientDb,
  deleteOneTimeServiceDb,
  deleteScheduleDb,
  deleteSiteMapDb,
  getCompletionPhotoWithOrgDb,
  getSiteMapWithOrgDb,
  insertCompletedJobDb,
  insertCompletionPhotoDb,
  insertOneTimeServiceDb,
  insertSiteMapDb,
  updateAddressAssigneeDb,
  updateClientDb,
  updateRouteOrderDb,
  updateSiteMapDb,
  upsertAssignmentDb,
} from "./clients";
import {
  deleteInvoiceDb,
  insertInvoiceDb,
  updateInvoiceStatusDb,
} from "./invoices";

vi.mock("@/db/client", () => import("../../../tests/helpers/db"));
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

let seed: Awaited<ReturnType<typeof seedTwoOrgs>>;

beforeEach(async () => {
  await resetDb();
  seed = await seedTwoOrgs();
});

describe("ownership checks", () => {
  it("clientBelongsToOrgDb / addressBelongsToOrgDb", async () => {
    const { clientA, clientB, addressA, addressB } = seed;
    expect(await clientBelongsToOrgDb(clientA.id, "org_a")).toBe(true);
    expect(await clientBelongsToOrgDb(clientB.id, "org_a")).toBe(false);
    expect(await addressBelongsToOrgDb(addressA.id, "org_a")).toBe(true);
    expect(await addressBelongsToOrgDb(addressB.id, "org_a")).toBe(false);
  });

  it("addressesBelongToOrgDb needs every address to be in the org", async () => {
    const { addressA, addressB } = seed;
    expect(await addressesBelongToOrgDb([], "org_a")).toBe(true);
    expect(
      await addressesBelongToOrgDb([addressA.id, addressA.id], "org_a"),
    ).toBe(true);
    expect(
      await addressesBelongToOrgDb([addressA.id, addressB.id], "org_a"),
    ).toBe(false);
  });
});

describe("clients", () => {
  it("updateClientDb can't rename another org's client", async () => {
    expect(
      await updateClientDb(seed.clientB.id, "org_a", "Hacked"),
    ).toBeUndefined();
    const [row] =
      await sql`SELECT name FROM clients WHERE id = ${seed.clientB.id}`;
    expect(row.name).toBe("Bob");
  });

  it("deleteClientDb can't delete another org's client", async () => {
    expect(await deleteClientDb(seed.clientB.id, "org_a")).toBeUndefined();
    expect(await countRows("clients")).toBe(2);
  });

  it("checkClientLimit only counts the org's active clients", async () => {
    await sql`INSERT INTO clients (org_id, name) VALUES ('org_b', 'Bob 2'), ('org_b', 'Bob 3')`;
    await sql`INSERT INTO clients (org_id, name, status) VALUES ('org_a', 'Old', 'disabled')`;
    // org_a has 1 active client (and 1 disabled); org_b has 3.
    expect((await checkClientLimit("org_a", 2)).isOk()).toBe(true);
    expect((await checkClientLimit("org_a", 1)).isErr()).toBe(true);
    expect((await checkClientLimit("org_b", 3)).isErr()).toBe(true);
  });
});

describe("schedules and route order", () => {
  it("deleteScheduleDb can't delete another org's schedule", async () => {
    await seedSchedule(seed.addressB.id, "weekly", "2026-06-01");
    expect(await deleteScheduleDb(seed.addressB.id, "org_a")).toBeUndefined();
    expect(await countRows("schedules")).toBe(1);
    expect(await deleteScheduleDb(seed.addressB.id, "org_b")).toBeDefined();
    expect(await countRows("schedules")).toBe(0);
  });

  it("updateRouteOrderDb can't move another org's address", async () => {
    await updateRouteOrderDb(seed.addressB.id, "org_b", 1000);
    expect(
      await updateRouteOrderDb(seed.addressB.id, "org_a", 1),
    ).toBeUndefined();
    const [row] =
      await sql`SELECT org_id, sort_order FROM route_orders WHERE address_id = ${seed.addressB.id}`;
    expect(row).toEqual({ org_id: "org_b", sort_order: 1000 });
  });

  it("updateAddressAssigneeDb can't reassign another org's address", async () => {
    expect(
      await updateAddressAssigneeDb(seed.addressB.id, "org_a", ["user_x"]),
    ).toBeUndefined();
    const updated = await updateAddressAssigneeDb(seed.addressA.id, "org_a", [
      "user_1",
      "user_2",
    ]);
    expect(updated).toMatchObject({
      org_id: "org_a",
      assigned_member_ids: ["user_1", "user_2"],
    });
  });
});

describe("assignments", () => {
  it("upsertAssignmentDb can't take over another org's assignment", async () => {
    await upsertAssignmentDb(seed.addressB.id, "org_b", "user_b", "2026-06-15");
    expect(
      await upsertAssignmentDb(
        seed.addressB.id,
        "org_a",
        "user_a",
        "2026-06-15",
      ),
    ).toBeUndefined();
    const [row] =
      await sql`SELECT org_id, user_id FROM assignments WHERE address_id = ${seed.addressB.id}`;
    expect(row).toEqual({ org_id: "org_b", user_id: "user_b" });
  });

  it("deleteAssignmentDb can't delete another org's assignment", async () => {
    await upsertAssignmentDb(seed.addressB.id, "org_b", "user_b", "2026-06-15");
    await deleteAssignmentDb(seed.addressB.id, "org_a", "2026-06-15");
    expect(await countRows("assignments")).toBe(1);
  });
});

describe("one-time services and completed jobs", () => {
  it("deleteOneTimeServiceDb can't delete another org's service", async () => {
    const service = await insertOneTimeServiceDb(
      seed.addressB.id,
      "org_b",
      "Aeration",
      "other",
      "2026-06-20",
    );
    expect(await deleteOneTimeServiceDb(service.id, "org_a")).toBeUndefined();
    expect(await countRows("one_time_services")).toBe(1);
  });

  it("completing a job can't link another org's one-time service", async () => {
    const service = await insertOneTimeServiceDb(
      seed.addressB.id,
      "org_b",
      "Aeration",
      "other",
      "2026-06-20",
    );
    await insertCompletedJobDb(
      seed.addressA.id,
      "org_a",
      "other",
      null,
      null,
      new Date(),
      null,
      null,
      null,
      service.id,
    );
    const [row] =
      await sql`SELECT completed_job_id FROM one_time_services WHERE id = ${service.id}`;
    expect(row.completed_job_id).toBeNull();
  });

  it("getCompletionPhotoWithOrgDb hides another org's photos", async () => {
    const job = await insertCompletedJobDb(seed.addressB.id, "org_b", "grass");
    const photo = await insertCompletionPhotoDb(job.id, "completion-b.jpg");
    expect(await getCompletionPhotoWithOrgDb(photo.id, "org_a")).toBeNull();
    expect(await getCompletionPhotoWithOrgDb(photo.id, "org_b")).toMatchObject({
      blob_path: "completion-b.jpg",
    });
  });
});

describe("site maps", () => {
  it("read, update and delete are limited to the owning org", async () => {
    const map = await insertSiteMapDb(
      seed.addressB.id,
      "Front",
      null,
      "site-map-b.png",
      { lines: [] },
    );
    expect(map.org_id).toBe("org_b");

    expect(await getSiteMapWithOrgDb(map.id, "org_a")).toBeNull();
    expect(
      await updateSiteMapDb(map.id, "org_a", "Hacked", null, null),
    ).toBeUndefined();
    expect(await deleteSiteMapDb(map.id, "org_a")).toBeUndefined();

    const [row] = await sql`SELECT name FROM site_maps WHERE id = ${map.id}`;
    expect(row.name).toBe("Front");
    expect(await deleteSiteMapDb(map.id, "org_b")).toMatchObject({
      org_id: "org_b",
    });
  });
});

describe("invoices", () => {
  const createFor = (orgId: string, clientId: string, number: string) =>
    insertInvoiceDb(
      orgId,
      clientId,
      number,
      "2026-06-01",
      "2026-06-30",
      null,
      5,
      [
        {
          service_type: "grass",
          address_id: null,
          description: null,
          quantity: 2,
          unit_price: 40,
        },
      ],
    );

  it("status updates and deletes are limited to the owning org", async () => {
    const invoice = await createFor("org_b", seed.clientB.id, "INV-0001");

    expect(await updateInvoiceStatusDb(invoice.id, "org_a", "paid")).toBeNull();
    expect(await deleteInvoiceDb(invoice.id, "org_a")).toBeNull();

    const [row] =
      await sql`SELECT status FROM invoices WHERE id = ${invoice.id}`;
    expect(row.status).toBe("draft");
  });

  it("the same invoice number can be used by different orgs", async () => {
    await createFor("org_a", seed.clientA.id, "INV-0001");
    await expect(
      createFor("org_b", seed.clientB.id, "INV-0001"),
    ).resolves.toBeDefined();
    await expect(
      createFor("org_a", seed.clientA.id, "INV-0001"),
    ).rejects.toThrow();
  });
});
