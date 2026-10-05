import { auth, clerkClient } from "@clerk/nextjs/server";
import type { Result, ResultAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addressesBelongToOrgDb,
  clientBelongsToOrgDb,
} from "@/db/queries/clients";
import {
  deleteInvoiceDb,
  getInvoiceByIdDb,
  getInvoicesDb,
  getNextInvoiceNumberDb,
  getRevenueGraphStatsDb,
  insertInvoiceDb,
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
  deleteInvoiceDb: vi.fn(),
  getInvoiceByIdDb: vi.fn(),
  getInvoicesDb: vi.fn(),
  getNextInvoiceNumberDb: vi.fn(),
  getRevenueGraphStatsDb: vi.fn(),
  insertInvoiceDb: vi.fn(),
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

    const result = await settle(
      sendInvoiceEmailDal(INVOICE, "QUJD", "INV-0001.pdf"),
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
        pdfBase64: "QUJD",
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
