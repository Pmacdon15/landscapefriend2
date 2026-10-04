import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbInvoiceResult } from "@/db/queries/invoices";

const { sesSend } = vi.hoisted(() => ({ sesSend: vi.fn() }));

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: vi.fn(function SESClient() {
    return { send: sesSend };
  }),
  SendEmailCommand: vi.fn(function SendEmailCommand(input: unknown) {
    return { kind: "SendEmail", input };
  }),
  SendRawEmailCommand: vi.fn(function SendRawEmailCommand(input: unknown) {
    return { kind: "SendRawEmail", input };
  }),
}));

import { generateInvoiceEmailHtml, sendEmailWithSes } from "./email";

function makeInvoice(
  overrides: Partial<DbInvoiceResult> = {},
): DbInvoiceResult {
  return {
    id: "inv_1",
    org_id: "org_test",
    client_id: "client_1",
    invoice_number: "INV-0042",
    status: "draft",
    issue_date: "2026-06-01T12:00:00",
    due_date: "2026-06-30T12:00:00",
    notes: null,
    tax_rate: 5,
    created_at: new Date(),
    updated_at: new Date(),
    sent_at: null,
    paid_at: null,
    client_name: "Jane Doe",
    client_email: "jane@example.com",
    total_amount: 157.5,
    items: [
      {
        id: "i1",
        invoice_id: "inv_1",
        service_type: "grass",
        address_id: "a1",
        description: "Front and back",
        quantity: 2,
        unit_price: 50,
        amount: 100,
        street: "123 Main St",
        city: "Calgary",
      },
      {
        id: "i2",
        invoice_id: "inv_1",
        service_type: "snow",
        address_id: null,
        description: null,
        quantity: 1,
        unit_price: 50,
        amount: 50,
      },
    ],
    ...overrides,
  };
}

describe("generateInvoiceEmailHtml", () => {
  it("shows subtotal, tax and total", () => {
    const html = generateInvoiceEmailHtml(makeInvoice(), "Green Co", null);
    expect(html).toContain("$150.00"); // subtotal
    expect(html).toContain("Tax (5.00%)");
    expect(html).toContain("$7.50"); // tax
    expect(html).toContain("$157.50"); // total
  });

  it("includes invoice details, client and line items", () => {
    const html = generateInvoiceEmailHtml(makeInvoice(), "Green Co", null);
    expect(html).toContain("INV-0042");
    expect(html).toContain("Dear Jane Doe,");
    expect(html).toContain("123 Main St");
    expect(html).toContain("Front and back");
    expect(html).toContain("Jun 1, 2026");
    expect(html).toContain("Jun 30, 2026");
  });

  it("shows N/A for items without an address", () => {
    const html = generateInvoiceEmailHtml(makeInvoice(), "Green Co", null);
    expect(html).toContain("N/A");
  });

  it("uses the org logo when present, otherwise the initial", () => {
    const withLogo = generateInvoiceEmailHtml(
      makeInvoice(),
      "Green Co",
      "https://example.com/logo.png",
    );
    expect(withLogo).toContain('<img src="https://example.com/logo.png"');

    const noLogo = generateInvoiceEmailHtml(makeInvoice(), "green co", null);
    expect(noLogo).not.toContain("<img");
    expect(noLogo).toMatch(/>G<\/div>/);
  });

  it("renders notes only when present", () => {
    expect(
      generateInvoiceEmailHtml(makeInvoice(), "Green Co", null),
    ).not.toContain("Notes:");
    expect(
      generateInvoiceEmailHtml(
        makeInvoice({ notes: "Thanks!" }),
        "Green Co",
        null,
      ),
    ).toContain("Thanks!");
  });

  it("handles a 0% tax rate", () => {
    const html = generateInvoiceEmailHtml(
      makeInvoice({ tax_rate: 0 }),
      "Green Co",
      null,
    );
    expect(html).toContain("Tax (0.00%)");
    expect(html).toContain("$0.00");
  });

  // Regression (#59): user-entered text used to be inserted without escaping.
  it("escapes HTML in client-entered fields", () => {
    const html = generateInvoiceEmailHtml(
      makeInvoice({ client_name: '<script>alert("x")</script>' }),
      "Green Co",
      null,
    );
    expect(html).not.toContain("<script>");
  });

  // Added for #59: the test above would also pass if the text were dropped,
  // so this one checks that each field is still shown, but escaped.
  it("keeps user-entered text visible but escaped in every field", () => {
    const base = makeInvoice();
    const html = generateInvoiceEmailHtml(
      makeInvoice({
        client_name: "Tom & Jerry <b>",
        notes: "Gate code <1234>",
        items: [
          {
            ...base.items[0],
            description: 'Mow "front" & back',
            street: "<i>12 Elm</i>",
            city: "A&B",
          },
        ],
      }),
      'Green & <Co> "Lawn"',
      'https://x.test/logo.png" onerror="alert(1)',
    );

    expect(html).toContain("Dear Tom &amp; Jerry &lt;b&gt;,");
    expect(html).toContain("Gate code &lt;1234&gt;");
    expect(html).toContain("Mow &quot;front&quot; &amp; back");
    expect(html).toContain("&lt;i&gt;12 Elm&lt;/i&gt;");
    expect(html).toContain("A&amp;B");
    expect(html).toContain("Green &amp; &lt;Co&gt; &quot;Lawn&quot;");
    expect(html).not.toContain('" onerror="');
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<i>");
  });
});

describe("sendEmailWithSes", () => {
  beforeEach(() => {
    sesSend.mockReset();
    sesSend.mockResolvedValue({});
  });

  const base = {
    senderEmail: "Green Co <no-reply@example.com>",
    recipientEmail: "jane@example.com",
    subject: "Invoice INV-0042",
    htmlBody: "<p>Hello</p>",
  };

  it("sends a simple HTML email when there is no attachment", async () => {
    await sendEmailWithSes(base);
    expect(sesSend).toHaveBeenCalledTimes(1);
    const command = sesSend.mock.calls[0][0];
    expect(command.kind).toBe("SendEmail");
    expect(command.input).toMatchObject({
      Source: base.senderEmail,
      Destination: { ToAddresses: ["jane@example.com"] },
      Message: {
        Subject: { Data: base.subject },
        Body: { Html: { Data: base.htmlBody } },
      },
    });
  });

  it("sends a raw MIME email with the PDF attached", async () => {
    const pdfBase64 = "A".repeat(200);
    await sendEmailWithSes({ ...base, pdfBase64, filename: "INV-0042.pdf" });

    const command = sesSend.mock.calls[0][0];
    expect(command.kind).toBe("SendRawEmail");
    const raw = Buffer.from(command.input.RawMessage.Data).toString("utf8");

    expect(raw).toContain("To: jane@example.com");
    expect(raw).toContain("Subject: Invoice INV-0042");
    expect(raw).toContain('filename="INV-0042.pdf"');
    expect(raw).toContain("<p>Hello</p>");
    // base64 must be wrapped at 76 characters per MIME spec
    expect(raw).toContain(
      `${"A".repeat(76)}\n${"A".repeat(76)}\n${"A".repeat(48)}`,
    );
  });

  it("propagates SES failures", async () => {
    sesSend.mockRejectedValueOnce(new Error("rejected"));
    await expect(sendEmailWithSes(base)).rejects.toThrow("rejected");
  });
});
