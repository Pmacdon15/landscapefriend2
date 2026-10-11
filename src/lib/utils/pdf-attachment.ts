/** Largest invoice PDF we will attach to an email (decoded bytes). */
export const MAX_INVOICE_PDF_BYTES = 5 * 1024 * 1024;

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Strictly decodes standard base64. Returns null when the input contains
 * anything other than base64 characters (whitespace and line breaks are
 * ignored) or has an invalid length, instead of silently skipping bad bytes
 * the way `Buffer.from(x, "base64")` does.
 */
export function decodeBase64Strict(value: string): Buffer | null {
  const compact = value.replace(/\s+/g, "");
  if (compact.length === 0 || compact.length % 4 !== 0) return null;
  if (!BASE64_PATTERN.test(compact)) return null;
  return Buffer.from(compact, "base64");
}

export type InvoiceAttachment = { pdfBase64: string; filename: string };

/**
 * Validates an invoice attachment supplied by the browser before it is sent
 * from the platform's SES identity (#81): it must be real base64, decode to a
 * PDF (`%PDF-` header), stay under the size cap, and have a `.pdf` name.
 * Returns the attachment re-encoded server-side so only canonical base64 ever
 * reaches the raw MIME message.
 */
export function validateInvoicePdfAttachment(
  pdfBase64: string | undefined,
  filename: string | undefined,
):
  | { ok: true; value: InvoiceAttachment | null }
  | { ok: false; reason: string } {
  if (!pdfBase64 && !filename) return { ok: true, value: null };
  if (!pdfBase64 || !filename)
    return { ok: false, reason: "Invoice attachment is incomplete." };

  // Client names end up in the file name, so neutralise path and header
  // characters rather than rejecting the send.
  const trimmedName = filename
    .replace(/[\r\n]+/g, " ")
    .replace(/["\\/]/g, "_")
    .trim();
  if (
    trimmedName.length === 0 ||
    trimmedName.length > 200 ||
    !/\.pdf$/i.test(trimmedName)
  ) {
    return { ok: false, reason: "Invoice attachment must be a .pdf file." };
  }

  const bytes = decodeBase64Strict(pdfBase64);
  if (!bytes) return { ok: false, reason: "Invoice attachment is not valid." };

  if (bytes.length > MAX_INVOICE_PDF_BYTES)
    return { ok: false, reason: "Invoice attachment is too large." };

  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-")
    return { ok: false, reason: "Invoice attachment must be a PDF." };

  return {
    ok: true,
    value: { pdfBase64: bytes.toString("base64"), filename: trimmedName },
  };
}
