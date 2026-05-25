import { auth, clerkClient } from "@clerk/nextjs/server";
import { err, ok, type Result } from "neverthrow";
import { connection } from "next/server";
import {
  type DbInvoiceResult,
  deleteInvoiceDb,
  getInvoiceByIdDb,
  getInvoicesDb,
  getNextInvoiceNumberDb,
  getRevenueGraphStatsDb,
  insertInvoiceDb,
  type RevenueStats,
  updateInvoiceStatusDb,
} from "../db/queries/invoices";
import { generateInvoiceEmailHtml, sendEmailWithSes } from "../utils/email";

export async function getInvoicesDal(
  page = 1,
  search?: string,
  status?: string,
): Promise<{ data: DbInvoiceResult[]; totalPages: number }> {
  await connection();
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    throw new Error("Unauthorized");
  }

  try {
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const list = await getInvoicesDb(orgId, pageSize, offset, search, status);
    const totalCount = list.length > 0 ? Number(list[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: list,
      totalPages,
    };
  } catch (error) {
    console.error("Error in getInvoicesDal:", error);
    return { data: [], totalPages: 0 };
  }
}

export async function getInvoiceByIdDal(
  invoiceId: string,
): Promise<DbInvoiceResult | null> {
  await connection();
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    throw new Error("Unauthorized");
  }

  try {
    const invoice = await getInvoiceByIdDb(invoiceId);
    if (!invoice || invoice.org_id !== orgId) {
      return null;
    }
    return invoice;
  } catch (error) {
    console.error("Error in getInvoiceByIdDal:", error);
    return null;
  }
}

export async function getNextInvoiceNumberDal(): Promise<string> {
  await connection();
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    throw new Error("Unauthorized");
  }

  return getNextInvoiceNumberDb(orgId);
}

export async function getRevenueStatsDal(): Promise<RevenueStats[]> {
  await connection();
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    throw new Error("Unauthorized");
  }

  try {
    return await getRevenueGraphStatsDb(orgId);
  } catch (error) {
    console.error("Error in getRevenueStatsDal:", error);
    return [];
  }
}

export async function getOrganizationInfoDal(): Promise<{
  name: string;
  logoUrl: string | null;
} | null> {
  await connection();
  const { orgId } = await auth.protect();
  if (!orgId) return null;

  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({
      organizationId: orgId,
    });
    return {
      name: org.name,
      logoUrl: org.imageUrl || null,
    };
  } catch (error) {
    console.error("Error fetching organization info from Clerk:", error);
    return null;
  }
}

export async function createInvoiceDal(data: {
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  items: {
    service_type: string;
    address_id: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
  }[];
}): Promise<Result<DbInvoiceResult, { reason: string }>> {
  await connection();
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    return err({ reason: "Unauthorized" });
  }

  if (data.items.length === 0) {
    return err({ reason: "Invoice must have at least one line item" });
  }

  try {
    const invoice = await insertInvoiceDb(
      orgId,
      data.clientId,
      data.invoiceNumber,
      data.issueDate,
      data.dueDate,
      data.notes,
      data.items,
    );
    return ok(invoice);
  } catch (error) {
    const errObj = error as Error;
    console.error("Error in createInvoiceDal:", error);
    return err({
      reason: errObj.message || "Failed to create invoice in database",
    });
  }
}

export async function updateInvoiceStatusDal(
  invoiceId: string,
  status: string,
): Promise<Result<DbInvoiceResult, { reason: string }>> {
  await connection();
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    return err({ reason: "Unauthorized" });
  }

  try {
    const existing = await getInvoiceByIdDb(invoiceId);
    if (!existing || existing.org_id !== orgId) {
      return err({ reason: "Invoice not found" });
    }

    const updated = await updateInvoiceStatusDb(invoiceId, status);
    if (!updated) {
      return err({ reason: "Failed to update invoice status" });
    }

    return ok(updated);
  } catch (error) {
    const errObj = error as Error;
    console.error("Error in updateInvoiceStatusDal:", error);
    return err({ reason: errObj.message || "Failed to update status" });
  }
}

export async function deleteInvoiceDal(
  invoiceId: string,
): Promise<Result<DbInvoiceResult, { reason: string }>> {
  await connection();
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    return err({ reason: "Unauthorized" });
  }

  try {
    const existing = await getInvoiceByIdDb(invoiceId);
    if (!existing || existing.org_id !== orgId) {
      return err({ reason: "Invoice not found" });
    }

    const deleted = await deleteInvoiceDb(invoiceId);
    if (!deleted) {
      return err({ reason: "Invoice not found or already deleted" });
    }
    return ok(deleted);
  } catch (error) {
    const errObj = error as Error;
    console.error("Error in deleteInvoiceDal:", error);
    return err({ reason: errObj.message || "Failed to delete invoice" });
  }
}

export async function sendInvoiceEmailDal(
  invoiceId: string,
  pdfBase64?: string,
  filename?: string,
): Promise<Result<DbInvoiceResult, { reason: string }>> {
  await connection();
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  // 1. Double block: Feature flag `send_invoices` must be present.
  if (
    !orgId ||
    !isAdmin ||
    !has({ feature: "invoices" }) ||
    !has({ feature: "send_invoices" })
  ) {
    return err({ reason: "Action blocked by feature flags or role policies." });
  }

  try {
    const invoice = await getInvoiceByIdDb(invoiceId);
    if (!invoice || invoice.org_id !== orgId) {
      return err({ reason: "Invoice not found." });
    }

    if (!invoice.client_email) {
      return err({
        reason: "Client does not have a configured email address.",
      });
    }

    // Fetch org details for the email brand
    const orgInfo = await getOrganizationInfoDal();
    const orgName = orgInfo?.name || "Landscape Friend";
    const orgLogo = orgInfo?.logoUrl || null;

    const senderEmail =
      process.env.SES_SENDER_EMAIL || "no-reply@landscapefriend.com";
    const formattedSender = `${orgName} <${senderEmail}>`;

    const emailSubject = `Invoice ${invoice.invoice_number} from ${orgName}`;

    // 1. Generate the HTML body
    const emailHtmlBody = generateInvoiceEmailHtml(invoice, orgName, orgLogo);

    // 2. Dispatch using AWS SES (handles attachments internally!)
    await sendEmailWithSes({
      senderEmail: formattedSender,
      recipientEmail: invoice.client_email,
      subject: emailSubject,
      htmlBody: emailHtmlBody,
      pdfBase64,
      filename,
    });

    // Update status to sent automatically
    const updated = await updateInvoiceStatusDb(invoiceId, "sent");
    if (!updated) {
      return err({ reason: "Failed to update invoice status after sending." });
    }

    return ok(updated);
  } catch (error) {
    const errObj = error as Error;
    console.error("Failed to send AWS SES email:", error);
    return err({
      reason: errObj.message || "SES connection failed or email rejected.",
    });
  }
}
