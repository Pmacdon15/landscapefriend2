import { describe, expect, it } from "vitest";
import { generateInvoiceEmailHtml } from "./email";

describe("generateInvoiceEmailHtml utility", () => {
  const mockInvoice = {
    id: "invoice-uuid-1",
    invoice_number: "INV-2026-105",
    client_id: "client-uuid-1",
    client_name: "Jane Smith",
    client_email: "jane.smith@example.com",
    issue_date: "2026-05-15",
    due_date: "2026-05-29",
    total_amount: 210.0, // Subtotal: 200, Tax: 5% (10), Total: 210
    tax_rate: 5.0,
    status: "sent",
    notes: "Thank you for your business! Please keep gate closed.",
    created_at: new Date("2026-05-15T00:00:00Z"),
    updated_at: new Date("2026-05-15T00:00:00Z"),
    items: [
      {
        id: "item-uuid-1",
        invoice_id: "invoice-uuid-1",
        service_type: "grass",
        street: "789 Pine Rd",
        city: "Sandy",
        state: "UT",
        zip: "84070",
        description: "Lawn cutting & edging",
        unit_price: 100.0,
        quantity: 2,
        amount: 200.0,
        completed_job_id: "job-uuid-1",
        created_at: new Date("2026-05-15T00:00:00Z"),
      },
    ],
  };

  it("should compile invoice details and perform accurate subtotal, tax, and total checks", () => {
    const html = generateInvoiceEmailHtml(
      mockInvoice,
      "Green Valley Landscaping",
      null,
    );

    // Verify basic client & org information
    expect(html).toContain("Jane Smith");
    expect(html).toContain("INV-2026-105");
    expect(html).toContain("Green Valley Landscaping");

    // Verify currency formatting and mathematical correctness
    expect(html).toContain("$200.00"); // Subtotal
    expect(html).toContain("$10.00"); // Tax (5% of 200)
    expect(html).toContain("$210.00"); // Total amount due

    // Verify line item details
    expect(html).toContain("grass");
    expect(html).toContain("789 Pine Rd");
    expect(html).toContain("Lawn cutting & edging");

    // Verify notes are rendered
    expect(html).toContain(
      "Thank you for your business! Please keep gate closed.",
    );
  });

  it("should render custom logo image when orgLogo path is provided", () => {
    const logoUrl = "https://example.com/assets/logo.png";
    const html = generateInvoiceEmailHtml(
      mockInvoice,
      "Green Valley Landscaping",
      logoUrl,
    );

    expect(html).toContain('src="https://example.com/assets/logo.png"');
    expect(html).toContain('alt="Green Valley Landscaping"');
  });

  it("should fall back to organization name's first character initials when logo is absent", () => {
    const html = generateInvoiceEmailHtml(
      mockInvoice,
      "Green Valley Landscaping",
      null,
    );

    // G is the first letter of Green Valley Landscaping
    expect(html).toContain(">G</div>");
    expect(html).not.toContain("<img src=");
  });

  it("should gracefully handle nullish/empty address and notes fields", () => {
    const minimalInvoice = {
      ...mockInvoice,
      notes: null,
      items: [
        {
          ...mockInvoice.items[0],
          street: "", // missing street
          city: "",
          description: "", // empty description
        },
      ],
    };

    const html = generateInvoiceEmailHtml(
      minimalInvoice,
      "Green Valley Landscaping",
      null,
    );

    // Verify missing address placeholder is rendered
    expect(html).toContain("N/A");

    // Verify notes section is not present in the HTML template
    expect(html).not.toContain("<strong>Notes:</strong>");
  });
});
