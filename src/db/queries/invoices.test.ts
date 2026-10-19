/**
 * Real SQL against src/db/schema.sql (PGlite) for creating invoices (#92).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countRows,
  resetDb,
  seedTwoOrgs,
  sql,
} from "../../../tests/helpers/db";
import { getRevenueGraphStatsDb, insertInvoiceDb } from "./invoices";

vi.mock("@/db/client", () => import("../../../tests/helpers/db"));
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

let seed: Awaited<ReturnType<typeof seedTwoOrgs>>;

beforeEach(async () => {
  await resetDb();
  seed = await seedTwoOrgs();
});

type Item = Parameters<typeof insertInvoiceDb>[7][number];

const item = (overrides: Partial<Item> = {}): Item => ({
  service_type: "grass",
  address_id: null,
  description: null,
  quantity: 1,
  unit_price: 40,
  ...overrides,
});

const create = (number: string, items: Item[]) =>
  insertInvoiceDb(
    "org_a",
    seed.clientA.id,
    number,
    "2026-06-01",
    "2026-06-30",
    null,
    5,
    items,
  );

describe("insertInvoiceDb", () => {
  it("stores every item in order with exact amounts", async () => {
    const invoice = await create("INV-0001", [
      item({ description: "First", address_id: seed.addressA.id }),
      item({ description: "Second", quantity: 3, unit_price: 0.1 }),
      item({ description: "Third", quantity: 2, unit_price: 12.5 }),
    ]);

    const { items } = invoice;
    expect(items.map((i) => i.description)).toEqual([
      "First",
      "Second",
      "Third",
    ]);
    // 3 * 0.1 in JS floats is 0.30000000000000004.
    expect(items.map((i) => Number(i.amount))).toEqual([40, 0.3, 25]);
    expect(items[0].address_id).toBe(seed.addressA.id);
  });

  // Regression (#92): items used to be inserted one by one after the
  // invoice, so a failing item left a partial invoice behind and blocked
  // retrying with the same number.
  it("saves nothing when an item fails", async () => {
    await expect(
      create("INV-0001", [
        item({ description: "Fine" }),
        // No such address: the foreign key rejects this item.
        item({ address_id: "00000000-0000-4000-8000-00000000dead" }),
      ]),
    ).rejects.toThrow();

    expect(await countRows("invoices")).toBe(0);
    expect(await countRows("invoice_items")).toBe(0);

    await expect(
      create("INV-0001", [item({ description: "Retry" })]),
    ).resolves.toMatchObject({ invoice_number: "INV-0001" });
  });
});

describe("getRevenueGraphStatsDb", () => {
  // Regression: the query sorted months ascending before LIMIT 12, so an org
  // with more than a year of invoices only ever saw its 12 oldest months.
  it("returns the 12 most recent months, oldest first", async () => {
    const months = Array.from({ length: 14 }, (_, i) => {
      const date = new Date(Date.UTC(2025, i, 15));
      return date.toISOString().slice(0, 7);
    });

    for (const [index, month] of months.entries()) {
      const invoice = await insertInvoiceDb(
        "org_a",
        seed.clientA.id,
        `INV-${String(index + 1).padStart(4, "0")}`,
        `${month}-15`,
        `${month}-28`,
        null,
        5,
        [item({ unit_price: 100 })],
      );
      await sql`UPDATE invoices SET status = 'sent' WHERE id = ${invoice.id}`;
    }

    // Drafts never count as revenue.
    await insertInvoiceDb(
      "org_a",
      seed.clientA.id,
      "INV-DRAFT",
      "2026-03-15",
      "2026-03-28",
      null,
      0,
      [item({ unit_price: 999 })],
    );

    const stats = await getRevenueGraphStatsDb("org_a");

    expect(stats.map((s) => s.month)).toEqual(months.slice(2));
    expect(stats[0].month).toBe("2025-03");
    expect(stats.at(-1)?.month).toBe("2026-02");
    expect(stats.every((s) => Number(s.revenue) === 105)).toBe(true);
  });

  it("only counts the org's own invoices", async () => {
    const invoice = await create("INV-0001", [item()]);
    await sql`UPDATE invoices SET status = 'paid' WHERE id = ${invoice.id}`;

    expect(await getRevenueGraphStatsDb("org_b")).toEqual([]);
    expect(await getRevenueGraphStatsDb("org_a")).toEqual([
      { month: "2026-06", revenue: 42 },
    ]);
  });
});
