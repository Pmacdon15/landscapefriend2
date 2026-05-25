import type { DbInvoiceResult } from "@/db/queries/invoices";

interface SendEmailParams {
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  htmlBody: string;
  pdfBase64?: string;
  filename?: string;
}

/**
 * Sends a rich HTML email using AWS SES, automatically compiling a raw MIME message
 * to attach a PDF document if pdfBase64 and filename are provided.
 */
export async function sendEmailWithSes(params: SendEmailParams): Promise<void> {
  const { senderEmail, recipientEmail, subject, htmlBody, pdfBase64, filename } = params;

  if (pdfBase64 && filename) {
    const boundary = `NextPart_${Date.now().toString(16)}`;
    
    // Chunk base64 string every 76 characters to follow MIME specs
    const chunkedBase64 = pdfBase64.match(/.{1,76}/g)?.join("\n") || pdfBase64;

    const rawMessage = [
      `From: ${senderEmail}`,
      `To: ${recipientEmail}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      htmlBody,
      "",
      `--${boundary}`,
      `Content-Type: application/pdf; name="${filename}"`,
      `Content-Description: ${filename}`,
      `Content-Disposition: attachment; filename="${filename}"; size=${Math.round(pdfBase64.length * 0.75)}`,
      "Content-Transfer-Encoding: base64",
      "",
      chunkedBase64,
      "",
      `--${boundary}--`,
    ].join("\n");

    const { SESClient, SendRawEmailCommand } = await import("@aws-sdk/client-ses");
    const ses = new SESClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    await ses.send(
      new SendRawEmailCommand({
        RawMessage: { Data: Buffer.from(rawMessage) },
      }),
    );
  } else {
    const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
    const ses = new SESClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new SendEmailCommand({
      Source: senderEmail,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Html: {
            Data: htmlBody,
          },
        },
      },
    });

    await ses.send(command);
  }
}

/**
 * Generates the rich HTML template body for the client invoice email.
 */
export function generateInvoiceEmailHtml(
  invoice: DbInvoiceResult,
  orgName: string,
  orgLogo: string | null,
): string {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(invoice.total_amount);

  // Build Table 1: Service Locations
  const locationsHtmlRows = invoice.items
    .map((item) => {
      const addressText = item.street
        ? `<div style="font-weight: 600; color: #334155;">${item.street}</div><div style="font-size: 0.85em; color: #64748b;">${item.city || ""}</div>`
        : `<span style="color: #94a3b8; font-style: italic; font-size: 0.85em;">N/A</span>`;

      return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; text-transform: capitalize; border-right: 1px solid #e2e8f0;">${item.service_type}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569; border-right: 1px solid #e2e8f0;">${addressText}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${item.description || "-"}</td>
      </tr>
    `;
    })
    .join("");

  // Build Table 2: Pricing Details
  const pricingHtmlRows = invoice.items
    .map((item) => {
      return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; text-transform: capitalize; border-right: 1px solid #e2e8f0;">${item.service_type}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569; border-right: 1px solid #e2e8f0;">${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.unit_price)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #334155; border-right: 1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.amount)}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 2px solid #15803d; padding-bottom: 15px;">
        ${orgLogo ? `<img src="${orgLogo}" alt="${orgName}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : `<div style="height: 40px; width: 40px; background-color: #15803d; color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; margin-right: 10px;">${orgName.charAt(0).toUpperCase()}</div>`}
        <div>
          <h2 style="color: #0f172a; margin: 0; font-size: 1.4em;">${orgName}</h2>
          <p style="color: #64748b; margin: 2px 0 0 0; font-size: 0.85em;">New Billing Invoice</p>
        </div>
      </div>

      <p style="font-size: 1em; color: #334155;">Dear ${invoice.client_name},</p>
      <p style="font-size: 1em; color: #334155;">A new invoice has been generated for your recent landscaping services. Please find the details below and the fully compiled official invoice PDF attached to this email.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
        <tr>
          <td style="padding: 10px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Invoice Number</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #0f172a;">${invoice.invoice_number}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Issue Date</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #334155;">${new Date(invoice.issue_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Due Date</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #334155; font-weight: 600;">${new Date(invoice.due_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold; color: #0f172a;">Total Amount Due</td>
          <td style="padding: 12px; text-align: right; font-weight: black; color: #15803d; font-size: 1.2em;">${formattedAmount}</td>
        </tr>
      </table>

      <h3 style="color: #0f172a; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 1.1em; margin-bottom: 5px;">1. Service Locations</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; font-size: 0.85em; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569; font-weight: bold;">
            <th style="padding: 10px; border-right: 1px solid #e2e8f0;">Service</th>
            <th style="padding: 10px; border-right: 1px solid #e2e8f0;">Property Address</th>
            <th style="padding: 10px;">Description</th>
          </tr>
        </thead>
        <tbody>
          ${locationsHtmlRows}
        </tbody>
      </table>

      <h3 style="color: #0f172a; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 1.1em; margin-bottom: 5px;">2. Pricing Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; font-size: 0.85em; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569; font-weight: bold;">
            <th style="padding: 10px; border-right: 1px solid #e2e8f0;">Service</th>
            <th style="padding: 10px; text-align: right; border-right: 1px solid #e2e8f0;">Price</th>
            <th style="padding: 10px; text-align: center; border-right: 1px solid #e2e8f0;">Qty</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${pricingHtmlRows}
        </tbody>
      </table>
      
      <p style="font-size: 0.95em; color: #334155; margin-top: 20px;">Please view or download the attached official invoice PDF version to complete your payment.</p>
      ${invoice.notes ? `<div style="background-color: #f8fafc; border-left: 4px solid #64748b; padding: 12px; margin: 20px 0; border-radius: 0 6px 6px 0;"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}
      
      <p style="margin-top: 35px; font-size: 0.9em; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        Thank you for choosing ${orgName}!<br/>
        If you have any questions, please contact us.
      </p>
    </div>
  `;
}
