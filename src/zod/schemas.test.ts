import { describe, expect, it } from "vitest";
import {
  AddressInputSchema,
  CreateClientInputSchema,
  CreateInvoiceInputSchema,
  UpdateInvoiceStatusInputSchema,
} from "./schemas";

const UUID = "3f2b8c1e-4a5d-4e6f-8a7b-9c0d1e2f3a4b";

describe("AddressInputSchema", () => {
  it("defaults status to active", () => {
    const parsed = AddressInputSchema.parse({ street: "1 Main", city: "X" });
    expect(parsed.status).toBe("active");
  });

  it("requires street and city", () => {
    const result = AddressInputSchema.safeParse({ street: "", city: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual(
      expect.arrayContaining(["Street is required", "City is required"]),
    );
  });

  it("rejects unknown statuses", () => {
    expect(
      AddressInputSchema.safeParse({ street: "a", city: "b", status: "gone" })
        .success,
    ).toBe(false);
  });
});

describe("CreateClientInputSchema", () => {
  const valid = {
    name: "Jane",
    email: "jane@example.com",
    phone: null,
    addresses: [{ street: "1 Main", city: "Calgary" }],
  };

  it("accepts a valid client", () => {
    expect(CreateClientInputSchema.safeParse(valid).success).toBe(true);
  });

  it("allows a null email", () => {
    expect(
      CreateClientInputSchema.safeParse({ ...valid, email: null }).success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      CreateClientInputSchema.safeParse({ ...valid, email: "nope" }).success,
    ).toBe(false);
  });

  it("requires a name and at least one address", () => {
    const result = CreateClientInputSchema.safeParse({
      ...valid,
      name: "",
      addresses: [],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([
        "Name is required",
        "At least one address is required",
      ]),
    );
  });
});

describe("CreateInvoiceInputSchema", () => {
  const item = {
    service_type: "grass",
    address_id: UUID,
    description: null,
    quantity: 2,
    unit_price: 45,
  };
  const valid = {
    clientId: UUID,
    invoiceNumber: "INV-0001",
    issueDate: "2026-06-01",
    dueDate: "2026-06-30",
    notes: null,
    taxRate: 5,
    items: [item],
  };

  it("accepts a valid invoice", () => {
    expect(CreateInvoiceInputSchema.safeParse(valid).success).toBe(true);
  });

  it("allows line items without an address", () => {
    expect(
      CreateInvoiceInputSchema.safeParse({
        ...valid,
        items: [{ ...item, address_id: null }],
      }).success,
    ).toBe(true);
  });

  it.each([
    ["an invalid client id", { clientId: "123" }, "Invalid client ID"],
    [
      "no line items",
      { items: [] },
      "Invoice must have at least one line item",
    ],
    ["a negative tax rate", { taxRate: -1 }, "Tax rate cannot be negative"],
    [
      "an empty invoice number",
      { invoiceNumber: "" },
      "Invoice number is required",
    ],
  ])("rejects %s", (_label, patch, message) => {
    const result = CreateInvoiceInputSchema.safeParse({ ...valid, ...patch });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });

  it.each([
    ["zero quantity", { quantity: 0 }, "Quantity must be greater than 0"],
    ["negative price", { unit_price: -5 }, "Unit price cannot be negative"],
    ["missing service type", { service_type: "" }, "Service type is required"],
  ])("rejects line items with %s", (_label, patch, message) => {
    const result = CreateInvoiceInputSchema.safeParse({
      ...valid,
      items: [{ ...item, ...patch }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });

  it("allows free line items", () => {
    expect(
      CreateInvoiceInputSchema.safeParse({
        ...valid,
        items: [{ ...item, unit_price: 0 }],
      }).success,
    ).toBe(true);
  });
});

describe("UpdateInvoiceStatusInputSchema", () => {
  it.each(["draft", "sent", "paid", "void", "overdue"])(
    "accepts status %s",
    (status) => {
      expect(
        UpdateInvoiceStatusInputSchema.safeParse({ invoiceId: UUID, status })
          .success,
      ).toBe(true);
    },
  );

  it("rejects unknown statuses and bad ids", () => {
    expect(
      UpdateInvoiceStatusInputSchema.safeParse({
        invoiceId: UUID,
        status: "refunded",
      }).error?.issues[0]?.message,
    ).toBe("Invalid status value");
    expect(
      UpdateInvoiceStatusInputSchema.safeParse({
        invoiceId: "abc",
        status: "paid",
      }).error?.issues[0]?.message,
    ).toBe("Invalid invoice ID");
  });
});
