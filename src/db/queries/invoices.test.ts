/**
 * Real SQL against src/db/schema.sql (PGlite) for creating invoices (#92).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countRows,
  query,
  resetDb,
  seedTwoOrgs,
  sql,
} from "../../../tests/helpers/db";
import {
  claimInvoiceEmailSendDb,
  deleteInvoiceDb,
  getRevenueGraphStatsDb,
  insertInvoiceDb,
  releaseInvoiceEmailSendDb,
  reserveInvoiceEmailQuotaDb,
} from "./invoices";

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

// Security (#97): the send limits are claimed in the database, so they hold
// for resends, deleted invoices and parallel requests.
describe("invoice email send limits (#97)", () => {
  const NOW = new Date("2026-06-10T12:00:00.000Z");
  const minutes = (n: number) => n * 60 * 1000;
  const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);
  const COOLDOWN = minutes(10);
  const DAY = minutes(24 * 60);

  const sentAt = async (invoiceId: string) => {
    const [row] = await query("SELECT sent_at FROM invoices WHERE id = $1", [
      invoiceId,
    ]);
    return row.sent_at ? new Date(row.sent_at as string).getTime() : null;
  };
  const claim = (invoiceId: string, now: Date, orgId = "org_a") =>
    claimInvoiceEmailSendDb(
      invoiceId,
      orgId,
      now,
      new Date(now.getTime() - COOLDOWN),
    );
  const reserve = (now: Date, limit: number, orgId = "org_a") =>
    reserveInvoiceEmailQuotaDb(
      orgId,
      now,
      new Date(now.getTime() - DAY),
      limit,
    );

  describe("claimInvoiceEmailSendDb", () => {
    it("claims an unsent invoice and blocks a resend within the cooldown", async () => {
      const invoice = await create("INV-0001", [item()]);

      expect(await claim(invoice.id, NOW)).toEqual(NOW);
      expect(await sentAt(invoice.id)).toBe(NOW.getTime());

      expect(await claim(invoice.id, at(minutes(5)))).toBeNull();
      expect(await sentAt(invoice.id)).toBe(NOW.getTime());
    });

    it("allows a resend once the cooldown has passed", async () => {
      const invoice = await create("INV-0001", [item()]);
      await claim(invoice.id, NOW);

      expect(await claim(invoice.id, at(COOLDOWN))).toEqual(at(COOLDOWN));
    });

    it("lets only one of many parallel sends claim the invoice", async () => {
      const invoice = await create("INV-0001", [item()]);
      const results = await Promise.all(
        Array.from({ length: 5 }, () => claim(invoice.id, NOW)),
      );
      expect(results.filter((r) => r !== null)).toHaveLength(1);
    });

    it("won't claim another org's invoice", async () => {
      const invoice = await create("INV-0001", [item()]);
      expect(await claim(invoice.id, NOW, "org_b")).toBeNull();
      expect(await sentAt(invoice.id)).toBeNull();
    });
  });

  describe("releaseInvoiceEmailSendDb", () => {
    it("restores the previous sent_at", async () => {
      const invoice = await create("INV-0001", [item()]);
      const previous = at(-minutes(60));
      await claim(invoice.id, previous);
      await claim(invoice.id, NOW);

      await releaseInvoiceEmailSendDb(invoice.id, "org_a", NOW, previous);
      expect(await sentAt(invoice.id)).toBe(previous.getTime());
    });

    it("leaves a newer send alone", async () => {
      const invoice = await create("INV-0001", [item()]);
      const newer = at(minutes(20));
      await claim(invoice.id, NOW);
      await claim(invoice.id, newer);

      await releaseInvoiceEmailSendDb(invoice.id, "org_a", NOW, null);
      expect(await sentAt(invoice.id)).toBe(newer.getTime());
    });
  });

  describe("reserveInvoiceEmailQuotaDb", () => {
    it("allows sends up to the limit, then refuses", async () => {
      expect(await reserve(NOW, 3)).toBe(true);
      expect(await reserve(at(1), 3)).toBe(true);
      expect(await reserve(at(2), 3)).toBe(true);
      expect(await reserve(at(3), 3)).toBe(false);
    });

    it("counts resends of the same invoice", async () => {
      const invoice = await create("INV-0001", [item()]);
      for (let send = 0; send < 3; send++) {
        const now = at(send * COOLDOWN);
        expect(await claim(invoice.id, now)).toEqual(now);
        expect(await reserve(now, 3)).toBe(true);
      }
      const now = at(3 * COOLDOWN);
      expect(await claim(invoice.id, now)).toEqual(now);
      expect(await reserve(now, 3)).toBe(false);
    });

    it("doesn't give sends back when invoices are deleted", async () => {
      const first = await create("INV-0001", [item()]);
      const second = await create("INV-0002", [item()]);
      expect(await reserve(NOW, 2)).toBe(true);
      expect(await reserve(at(1), 2)).toBe(true);

      await deleteInvoiceDb(first.id, "org_a");
      await deleteInvoiceDb(second.id, "org_a");

      expect(await reserve(at(2), 2)).toBe(false);
    });

    it("frees sends older than the window", async () => {
      expect(await reserve(NOW, 2)).toBe(true);
      expect(await reserve(at(minutes(60)), 2)).toBe(true);
      expect(await reserve(at(minutes(120)), 2)).toBe(false);

      // A day after the first send, only the second one is in the window.
      expect(await reserve(at(DAY + 1), 2)).toBe(true);
      expect(await reserve(at(DAY + 2), 2)).toBe(false);

      const [row] = await query(
        "SELECT cardinality(recent_sends) AS n FROM invoice_email_quotas WHERE org_id = 'org_a'",
      );
      expect(row.n).toBe(2);
    });

    it("never lets parallel sends past the limit", async () => {
      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) => reserve(at(i), 3)),
      );
      expect(results.filter(Boolean)).toHaveLength(3);
    });

    it("keeps each org's quota separate", async () => {
      expect(await reserve(NOW, 1)).toBe(true);
      expect(await reserve(at(1), 1)).toBe(false);
      expect(await reserve(at(2), 1, "org_b")).toBe(true);
    });
  });
});
