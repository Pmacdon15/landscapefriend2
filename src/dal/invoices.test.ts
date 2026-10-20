import { auth, clerkClient } from "@clerk/nextjs/server";
import type { Result, ResultAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addressesBelongToOrgDb,
  clientBelongsToOrgDb,
} from "@/db/queries/clients";
import {
  claimInvoiceEmailSendDb,
  deleteInvoiceDb,
  getInvoiceByIdDb,
  getInvoicesDb,
  getNextInvoiceNumberDb,
  getRevenueGraphStatsDb,
  insertInvoiceDb,
  releaseInvoiceEmailSendDb,
  reserveInvoiceEmailQuotaDb,
  updateInvoiceStatusDb,
} from "@/db/queries/invoices";
import { generateInvoiceEmailHtml, sendEmailWithSes } from "@/lib/utils/email";
import { mockAuth } from "../../tests/helpers/clerk";
import {
  createInvoiceDal,
  deleteInvoiceDal,
  getInvoiceByIdDal,
  getInvoicesDal,
  getNextInvoiceNumberDal,
  getOrganizationInfoDal,
  getRevenueStatsDal,
  sendInvoiceEmailDal,
  updateInvoiceStatusDal,
} from "./invoices";

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: vi.fn() },
  clerkClient: vi.fn(),
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/db/queries/clients", () => ({
  addressesBelongToOrgDb: vi.fn(),
  clientBelongsToOrgDb: vi.fn(),
}));
vi.mock("@/db/queries/invoices", () => ({
  claimInvoiceEmailSendDb: vi.fn(),
  deleteInvoiceDb: vi.fn(),
  getInvoiceByIdDb: vi.fn(),
  getInvoicesDb: vi.fn(),
  getNextInvoiceNumberDb: vi.fn(),
  getRevenueGraphStatsDb: vi.fn(),
  insertInvoiceDb: vi.fn(),
  releaseInvoiceEmailSendDb: vi.fn(),
  reserveInvoiceEmailQuotaDb: vi.fn(),
  updateInvoiceStatusDb: vi.fn(),
}));
vi.mock("@/lib/utils/email", () => ({
  generateInvoiceEmailHtml: vi.fn(() => "<p>invoice</p>"),
  sendEmailWithSes: vi.fn(),
}));

const INVOICE = "00000000-0000-4000-8000-000000000010";
const CLIENT = "00000000-0000-4000-8000-000000000011";
const ADDRESS = "00000000-0000-4000-8000-000000000012";

const protect = vi.mocked(auth.protect);
const admin = (features = ["invoices"]) =>
  mockAuth({ orgId: "org_1", orgRole: "org:admin", features });

/** The DAL returns Promise<ResultAsync>; awaiting both gives the Result. */
async function settle<T, E>(
  p: Promise<ResultAsync<T, E>>,
): Promise<Result<T, E>> {
  return await p;
}

const invoiceInput = {
  clientId: CLIENT,
  invoiceNumber: "INV-0001",
  issueDate: "2026-06-01",
  dueDate: "2026-06-30",
  notes: null,
  taxRate: 5,
  items: [
    {
      service_type: "grass",
      address_id: ADDRESS,
      description: null,
      quantity: 2,
      unit_price: 40,
    },
  ],
};

const invoiceRow = (overrides = {}) =>
  ({
    id: INVOICE,
    org_id: "org_1",
    invoice_number: "INV-0001",
    client_email: "jane@example.com",
    ...overrides,
  }) as never;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  protect.mockResolvedValue(admin());
  vi.mocked(clientBelongsToOrgDb).mockResolvedValue(true);
  vi.mocked(addressesBelongToOrgDb).mockResolvedValue(true);
  vi.mocked(claimInvoiceEmailSendDb).mockImplementation(
    async (_i, _o, now) => now,
  );
  vi.mocked(reserveInvoiceEmailQuotaDb).mockResolvedValue(true);
  vi.mocked(releaseInvoiceEmailSendDb).mockResolvedValue();
  vi.mocked(clerkClient).mockResolvedValue({
    organizations: {
      getOrganization: vi
        .fn()
        .mockResolvedValue({ name: "Green Co", imageUrl: "" }),
    },
  } as never);
});

describe("access control", () => {
  it.each([
    ["no org", mockAuth({ orgId: null, orgRole: "org:admin" })],
    ["a member", mockAuth({ orgId: "org_1", features: ["invoices"] })],
    ["an admin without the invoices feature", admin([])],
  ])("blocks %s from every invoice read", async (_who, session) => {
    protect.mockResolvedValue(session);
    expect(await getInvoicesDal()).toEqual({ data: [], totalPages: 0 });
    expect(await getInvoiceByIdDal(INVOICE)).toBeNull();
    expect(await getNextInvoiceNumberDal()).toBe("");
    expect(await getRevenueStatsDal()).toEqual([]);
    expect(getInvoicesDb).not.toHaveBeenCalled();
    expect(getInvoiceByIdDb).not.toHaveBeenCalled();
  });

  it.each([
    ["create", () => settle(createInvoiceDal(invoiceInput))],
    ["update", () => settle(updateInvoiceStatusDal(INVOICE, "paid"))],
    ["delete", () => settle(deleteInvoiceDal(INVOICE))],
  ])("blocks members from %s", async (_action, run) => {
    protect.mockResolvedValue(
      mockAuth({ orgId: "org_1", features: ["invoices"] }),
    );
    expect((await run())._unsafeUnwrapErr().reason).toBe("Unauthorized");
  });
});

describe("getInvoicesDal", () => {
  it("pages by 10 and computes total pages", async () => {
    vi.mocked(getInvoicesDb).mockResolvedValue([
      { id: "i1", total_count: 23 },
    ] as never);
    const result = await getInvoicesDal(3, "jane", "paid");
    expect(getInvoicesDb).toHaveBeenCalledWith("org_1", 10, 20, "jane", "paid");
    expect(result.totalPages).toBe(3);
  });

  it("falls back to empty on database errors", async () => {
    vi.mocked(getInvoicesDb).mockRejectedValue(new Error("db"));
    expect(await getInvoicesDal()).toEqual({ data: [], totalPages: 0 });
  });
});

describe("getInvoiceByIdDal", () => {
  it("returns invoices from the caller's org", async () => {
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(invoiceRow());
    expect(await getInvoiceByIdDal(INVOICE)).toMatchObject({ id: INVOICE });
  });

  it("hides invoices from another org", async () => {
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(
      invoiceRow({ org_id: "org_2" }),
    );
    expect(await getInvoiceByIdDal(INVOICE)).toBeNull();
  });
});

describe("createInvoiceDal", () => {
  it("returns the first validation message", async () => {
    const result = await settle(
      createInvoiceDal({ ...invoiceInput, items: [] }),
    );
    expect(result._unsafeUnwrapErr().reason).toBe(
      "Invoice must have at least one line item",
    );
  });

  it("rejects a client from another org", async () => {
    vi.mocked(clientBelongsToOrgDb).mockResolvedValue(false);
    const result = await settle(createInvoiceDal(invoiceInput));
    expect(result._unsafeUnwrapErr().reason).toBe("Client not found");
    expect(insertInvoiceDb).not.toHaveBeenCalled();
  });

  it("rejects line items with an address from another org", async () => {
    vi.mocked(addressesBelongToOrgDb).mockResolvedValue(false);
    const result = await settle(createInvoiceDal(invoiceInput));
    expect(result._unsafeUnwrapErr().reason).toBe("Invalid service address");
    expect(addressesBelongToOrgDb).toHaveBeenCalledWith([ADDRESS], "org_1");
  });

  it("creates the invoice", async () => {
    vi.mocked(insertInvoiceDb).mockResolvedValue(invoiceRow());
    const result = await settle(createInvoiceDal(invoiceInput));
    expect(result._unsafeUnwrap()).toMatchObject({ id: INVOICE });
    expect(insertInvoiceDb).toHaveBeenCalledWith(
      "org_1",
      CLIENT,
      "INV-0001",
      "2026-06-01",
      "2026-06-30",
      null,
      5,
      invoiceInput.items,
    );
  });

  it("reports database failures", async () => {
    vi.mocked(insertInvoiceDb).mockRejectedValue(new Error("db"));
    const result = await settle(createInvoiceDal(invoiceInput));
    expect(result._unsafeUnwrapErr().reason).toBe(
      "Failed to create invoice in database",
    );
  });
});

describe("updateInvoiceStatusDal", () => {
  it("rejects unknown statuses", async () => {
    const result = await settle(updateInvoiceStatusDal(INVOICE, "lost"));
    expect(result._unsafeUnwrapErr().reason).toBe("Invalid status value");
  });

  it("updates within the caller's org", async () => {
    vi.mocked(updateInvoiceStatusDb).mockResolvedValue(invoiceRow());
    const result = await settle(updateInvoiceStatusDal(INVOICE, "paid"));
    expect(result.isOk()).toBe(true);
    expect(updateInvoiceStatusDb).toHaveBeenCalledWith(
      INVOICE,
      "org_1",
      "paid",
    );
  });

  it("fails when no invoice was updated", async () => {
    vi.mocked(updateInvoiceStatusDb).mockResolvedValue(null);
    const result = await settle(updateInvoiceStatusDal(INVOICE, "paid"));
    expect(result._unsafeUnwrapErr().reason).toBe("Invoice not updated");
  });
});

describe("deleteInvoiceDal", () => {
  it("deletes within the caller's org", async () => {
    vi.mocked(deleteInvoiceDb).mockResolvedValue(invoiceRow());
    const result = await settle(deleteInvoiceDal(INVOICE));
    expect(result.isOk()).toBe(true);
    expect(deleteInvoiceDb).toHaveBeenCalledWith(INVOICE, "org_1");
  });

  it("fails when nothing was deleted", async () => {
    vi.mocked(deleteInvoiceDb).mockResolvedValue(null);
    const result = await settle(deleteInvoiceDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toBe(
      "Invoice not found or already deleted",
    );
  });
});

describe("sendInvoiceEmailDal", () => {
  const canSend = () => admin(["invoices", "send_invoices"]);

  it("requires the send_invoices feature", async () => {
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toMatch(/feature flags/);
    expect(sendEmailWithSes).not.toHaveBeenCalled();
  });

  it("won't send another org's invoice", async () => {
    protect.mockResolvedValue(canSend());
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(
      invoiceRow({ org_id: "org_2" }),
    );
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toBe("Invoice not found.");
    expect(sendEmailWithSes).not.toHaveBeenCalled();
  });

  it("needs a client email address", async () => {
    protect.mockResolvedValue(canSend());
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(
      invoiceRow({ client_email: null }),
    );
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toMatch(/email address/);
  });

  it("sends from the org name and marks the invoice sent", async () => {
    protect.mockResolvedValue(canSend());
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(invoiceRow());
    vi.mocked(sendEmailWithSes).mockResolvedValue();
    vi.mocked(updateInvoiceStatusDb).mockResolvedValue(
      invoiceRow({ status: "sent" }),
    );

    const pdf = Buffer.from("%PDF-1.7\n%%EOF\n").toString("base64");
    const result = await settle(
      sendInvoiceEmailDal(INVOICE, pdf, "INV-0001.pdf"),
    );

    expect(result.isOk()).toBe(true);
    expect(generateInvoiceEmailHtml).toHaveBeenCalledWith(
      expect.objectContaining({ id: INVOICE }),
      "Green Co",
      null,
    );
    expect(sendEmailWithSes).toHaveBeenCalledWith(
      expect.objectContaining({
        senderEmail: "Green Co <no-reply@landscapefriend.com>",
        recipientEmail: "jane@example.com",
        subject: "Invoice INV-0001 from Green Co",
        pdfBase64: pdf,
        filename: "INV-0001.pdf",
      }),
    );
    expect(updateInvoiceStatusDb).toHaveBeenCalledWith(
      INVOICE,
      "org_1",
      "sent",
    );
  });

  it("doesn't mark the invoice sent when SES fails", async () => {
    protect.mockResolvedValue(canSend());
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(invoiceRow());
    vi.mocked(sendEmailWithSes).mockRejectedValue(new Error("rejected"));
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toMatch(/SES/);
    expect(updateInvoiceStatusDb).not.toHaveBeenCalled();
  });

  // Regression (#70): this error used to escape instead of being returned.
  it("returns an error result when loading the invoice fails", async () => {
    protect.mockResolvedValue(canSend());
    vi.mocked(getInvoiceByIdDb).mockRejectedValue(new Error("db"));
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toBe("Failed to load invoice.");
  });
});

// Security (#81): the attachment comes from the browser, so the server must
// check it really is a PDF and throttle sends from the platform's SES sender.
describe("sendInvoiceEmailDal hardening (#81)", () => {
  const canSend = () => admin(["invoices", "send_invoices"]);
  const toBase64 = (text: string) => Buffer.from(text).toString("base64");
  const pdf = toBase64("%PDF-1.7\n%%EOF\n");

  beforeEach(() => {
    protect.mockResolvedValue(canSend());
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(invoiceRow());
    vi.mocked(sendEmailWithSes).mockResolvedValue();
    vi.mocked(updateInvoiceStatusDb).mockResolvedValue(
      invoiceRow({ status: "sent" }),
    );
  });

  it.each([
    ["is not base64", "not base64 at all!", "INV-0001.pdf"],
    ["is not a PDF", toBase64("plain text, not a document"), "INV-0001.pdf"],
    ["has a name that is not .pdf", pdf, "INV-0001.exe"],
    ["has no name", pdf, undefined],
    [
      "is too large",
      Buffer.concat([
        Buffer.from("%PDF-"),
        Buffer.alloc(5 * 1024 * 1024),
      ]).toString("base64"),
      "INV-0001.pdf",
    ],
  ])("refuses an attachment that %s", async (_why, pdfBase64, filename) => {
    const result = await settle(
      sendInvoiceEmailDal(INVOICE, pdfBase64, filename),
    );
    expect(result.isErr()).toBe(true);
    expect(sendEmailWithSes).not.toHaveBeenCalled();
  });

  it("refuses to resend an invoice within the cooldown", async () => {
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(
      invoiceRow({ sent_at: new Date(Date.now() - 60 * 1000) }),
    );
    const result = await settle(sendInvoiceEmailDal(INVOICE, pdf, "a.pdf"));
    expect(result._unsafeUnwrapErr().reason).toMatch(/just sent/);
    expect(sendEmailWithSes).not.toHaveBeenCalled();
  });

  it("allows a resend after the cooldown", async () => {
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(
      invoiceRow({ sent_at: new Date(Date.now() - 60 * 60 * 1000) }),
    );
    const result = await settle(sendInvoiceEmailDal(INVOICE, pdf, "a.pdf"));
    expect(result.isOk()).toBe(true);
  });

  it("stops at the org's daily send limit", async () => {
    vi.mocked(reserveInvoiceEmailQuotaDb).mockResolvedValue(false);
    const result = await settle(sendInvoiceEmailDal(INVOICE, pdf, "a.pdf"));
    expect(result._unsafeUnwrapErr().reason).toMatch(/limit/);
    expect(sendEmailWithSes).not.toHaveBeenCalled();
  });
});

// Security (#97): the cooldown and the daily cap are claimed atomically in the
// database before SES is called, and every send counts toward the cap.
describe("sendInvoiceEmailDal send limits (#97)", () => {
  const canSend = () => admin(["invoices", "send_invoices"]);
  const previousSend = new Date("2026-06-01T12:00:00.000Z");

  beforeEach(() => {
    protect.mockResolvedValue(canSend());
    vi.mocked(getInvoiceByIdDb).mockResolvedValue(
      invoiceRow({ sent_at: previousSend }),
    );
    vi.mocked(sendEmailWithSes).mockResolvedValue();
    vi.mocked(updateInvoiceStatusDb).mockResolvedValue(
      invoiceRow({ status: "sent" }),
    );
  });

  it("claims the cooldown and a quota slot before sending", async () => {
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result.isOk()).toBe(true);

    const [invoiceId, orgId, now, cooldownStart] = vi.mocked(
      claimInvoiceEmailSendDb,
    ).mock.calls[0];
    expect([invoiceId, orgId]).toEqual([INVOICE, "org_1"]);
    expect(now.getTime() - cooldownStart.getTime()).toBe(10 * 60 * 1000);

    const [quotaOrg, quotaNow, windowStart, limit] = vi.mocked(
      reserveInvoiceEmailQuotaDb,
    ).mock.calls[0];
    expect(quotaOrg).toBe("org_1");
    expect(quotaNow.getTime() - windowStart.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
    expect(limit).toBe(200);

    const sesOrder = vi.mocked(sendEmailWithSes).mock.invocationCallOrder[0];
    expect(
      vi.mocked(claimInvoiceEmailSendDb).mock.invocationCallOrder[0],
    ).toBeLessThan(sesOrder);
    expect(
      vi.mocked(reserveInvoiceEmailQuotaDb).mock.invocationCallOrder[0],
    ).toBeLessThan(sesOrder);
    expect(releaseInvoiceEmailSendDb).not.toHaveBeenCalled();
  });

  it("refuses when a parallel send already claimed the invoice", async () => {
    vi.mocked(claimInvoiceEmailSendDb).mockResolvedValue(null);
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toMatch(/just sent/);
    expect(reserveInvoiceEmailQuotaDb).not.toHaveBeenCalled();
    expect(sendEmailWithSes).not.toHaveBeenCalled();
  });

  it("gives the cooldown back when the daily limit is reached", async () => {
    vi.mocked(reserveInvoiceEmailQuotaDb).mockResolvedValue(false);
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toMatch(/limit/);
    const [, , claimedAt, previous] = vi.mocked(releaseInvoiceEmailSendDb).mock
      .calls[0];
    expect(claimedAt).toBe(vi.mocked(claimInvoiceEmailSendDb).mock.calls[0][2]);
    expect(previous).toBe(previousSend);
    expect(sendEmailWithSes).not.toHaveBeenCalled();
  });

  it("gives the cooldown back when SES fails", async () => {
    vi.mocked(sendEmailWithSes).mockRejectedValue(new Error("rejected"));
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toMatch(/SES/);
    expect(releaseInvoiceEmailSendDb).toHaveBeenCalledWith(
      INVOICE,
      "org_1",
      expect.any(Date),
      previousSend,
    );
    expect(updateInvoiceStatusDb).not.toHaveBeenCalled();
  });

  it("keeps the claim when the email went out but the status update failed", async () => {
    vi.mocked(updateInvoiceStatusDb).mockRejectedValue(new Error("db"));
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result._unsafeUnwrapErr().reason).toMatch(/update invoice status/);
    expect(releaseInvoiceEmailSendDb).not.toHaveBeenCalled();
  });

  it("doesn't send when claiming the cooldown fails", async () => {
    vi.mocked(claimInvoiceEmailSendDb).mockRejectedValue(new Error("db"));
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result.isErr()).toBe(true);
    expect(sendEmailWithSes).not.toHaveBeenCalled();
  });

  it("doesn't send when reserving the quota fails", async () => {
    vi.mocked(reserveInvoiceEmailQuotaDb).mockRejectedValue(new Error("db"));
    const result = await settle(sendInvoiceEmailDal(INVOICE));
    expect(result.isErr()).toBe(true);
    expect(releaseInvoiceEmailSendDb).toHaveBeenCalled();
    expect(sendEmailWithSes).not.toHaveBeenCalled();
  });
});

describe("getOrganizationInfoDal", () => {
  it("returns the org name and logo", async () => {
    vi.mocked(clerkClient).mockResolvedValue({
      organizations: {
        getOrganization: vi
          .fn()
          .mockResolvedValue({ name: "Green Co", imageUrl: "https://x/logo" }),
      },
    } as never);
    expect(await getOrganizationInfoDal()).toEqual({
      name: "Green Co",
      logoUrl: "https://x/logo",
    });
  });

  it("returns null when Clerk fails", async () => {
    vi.mocked(clerkClient).mockRejectedValue(new Error("clerk"));
    expect(await getOrganizationInfoDal()).toBeNull();
  });
});

describe("getNextInvoiceNumberDal / getRevenueStatsDal", () => {
  it("return the database values for admins", async () => {
    vi.mocked(getNextInvoiceNumberDb).mockResolvedValue("INV-0007");
    vi.mocked(getRevenueGraphStatsDb).mockResolvedValue([
      { month: "Jun" },
    ] as never);
    expect(await getNextInvoiceNumberDal()).toBe("INV-0007");
    expect(await getRevenueStatsDal()).toEqual([{ month: "Jun" }]);
  });
});
