import { auth, clerkClient } from "@clerk/nextjs/server";
import { err, errAsync, okAsync, type ResultAsync } from "neverthrow";
import { connection } from "next/server";
import {
  type CreateInvoiceInput,
  CreateInvoiceInputSchema,
  UpdateInvoiceStatusInputSchema,
} from "@/zod/schemas";
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
import { generateInvoiceEmailHtml, sendEmailWithSes } from "../lib/utils/email";

export async function getInvoicesDal(
  page = 1,
  search?: string,
  status?: string,
): Promise<{ data: DbInvoiceResult[]; totalPages: number }> {
  await connection();
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    console.error("Unauthorized");
    return { data: [], totalPages: 0 };
  }

  return await getInvoicesDb(orgId, 10, (page - 1) * 10, search, status)
    .then((list) => {
      return {
        data: list,
        totalPages: Math.ceil(
          (list.length > 0 ? Number(list[0].total_count) : 0) / 10,
        ),
      };
    })
    .catch((e) => {
      console.error("Error in getInvoicesDal:", e);
      return { data: [], totalPages: 0 };
    });
}

export async function getInvoiceByIdDal(
  invoiceId: string,
): Promise<DbInvoiceResult | null> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    console.error("Unauthorized");
    return null;
  }

  return await getInvoiceByIdDb(invoiceId)
    .then((invoice) => {
      if (!invoice || invoice.org_id !== orgId) {
        return null;
      }
      return invoice;
    })
    .catch((e) => {
      console.error("Error in getInvoiceByIdDal:", e);
      return null;
    });
}

export async function getNextInvoiceNumberDal(): Promise<string> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    console.error("Unauthorized");
    return "";
  }

  return getNextInvoiceNumberDb(orgId).catch((e) => {
    console.error("Error in getNextInvoiceNumberDal:", e);
    return "";
  });
}

export async function getRevenueStatsDal(): Promise<RevenueStats[]> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    console.error("Unauthorized");
    return [];
  }

  return await getRevenueGraphStatsDb(orgId).catch((e) => {
    console.error("Error in getRevenueStatsDal:", e);
    return [];
  });
}

export async function getOrganizationInfoDal(): Promise<{
  name: string;
  logoUrl: string | null;
} | null> {
  const { orgId } = await auth.protect();
  if (!orgId) {
    console.error("Unauthorized");
    return null;
  }

  return await clerkClient()
    .then((client) => {
      return client.organizations
        .getOrganization({
          organizationId: orgId,
        })
        .then((org) => {
          return {
            name: org.name,
            logoUrl: org.imageUrl || null,
          };
        });
    })
    .catch((e) => {
      console.error("Error fetching organization info from Clerk:", e);
      return null;
    });
}
export async function createInvoiceDal(
  data: CreateInvoiceInput,
): Promise<ResultAsync<DbInvoiceResult, { reason: string }>> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    return errAsync({ reason: "Unauthorized" } as const);
  }

  const parseResult = CreateInvoiceInputSchema.safeParse(data);
  if (!parseResult.success) {
    const firstError =
      parseResult.error.issues[0]?.message || "Invalid input data";
    return errAsync({ reason: firstError } as const);
  }

  const validatedData = parseResult.data;
  return insertInvoiceDb(
    orgId,
    validatedData.clientId,
    validatedData.invoiceNumber,
    validatedData.issueDate,
    validatedData.dueDate,
    validatedData.notes,
    validatedData.taxRate,
    validatedData.items,
  )
    .then(async (result) => okAsync(result))
    .catch((e: Error) => {
      console.error("Error in createInvoiceDal:", e.cause, e.message);
      return err({
        reason: "Failed to create invoice in database",
      } as const);
    });
}

export async function updateInvoiceStatusDal(
  invoiceId: string,
  status: string,
): Promise<ResultAsync<DbInvoiceResult, { reason: string }>> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    return errAsync({ reason: "Unauthorized" } as const);
  }

  const parseResult = UpdateInvoiceStatusInputSchema.safeParse({
    invoiceId,
    status,
  });

  if (!parseResult.success)
    return errAsync({
      reason:
        parseResult.error.issues[0]?.message || "Invalid input parameters",
    } as const);

  const { invoiceId: validId, status: validStatus } = parseResult.data;

  return await updateInvoiceStatusDb(validId, validStatus)
    .then(async (updated) => {
      if (updated) return okAsync(updated);
      return errAsync({ reason: "Invoice not updated" } as const);
    })
    .catch((e: Error) => {
      console.error("Invoice not status updated: ", e.cause, e.message);
      return errAsync({ reason: "Invoice not updated" } as const);
    });
}

export async function deleteInvoiceDal(
  invoiceId: string,
): Promise<ResultAsync<DbInvoiceResult, { reason: string }>> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (!orgId || !isAdmin || !has({ feature: "invoices" })) {
    return errAsync({ reason: "Unauthorized" } as const);
  }

  return await deleteInvoiceDb(invoiceId)
    .then(async (deleted) => {
      if (!deleted) {
        return errAsync({
          reason: "Invoice not found or already deleted",
        } as const);
      }
      return okAsync(deleted);
    })
    .catch(async (e: Error) => {
      console.error("Error in deleteInvoiceDal:", e.cause, e.message);
      return errAsync({ reason: "Failed to delete invoice" });
    });
}

export async function sendInvoiceEmailDal(
  invoiceId: string,
  pdfBase64?: string,
  filename?: string,
): Promise<ResultAsync<DbInvoiceResult, { reason: string }>> {
  const { orgId, orgRole, has } = await auth.protect();
  const isAdmin = orgRole === "org:admin" || has({ role: "org:admin" });

  if (
    !orgId ||
    !isAdmin ||
    !has({ feature: "invoices" }) ||
    !has({ feature: "send_invoices" })
  ) {
    return errAsync({
      reason: "Action blocked by feature flags or role policies.",
    });
  }

  const [invoice, orgInfo] = await Promise.all([
    getInvoiceByIdDb(invoiceId),
    getOrganizationInfoDal(),
  ]);

  if (!invoice || invoice.org_id !== orgId)
    return errAsync({ reason: "Invoice not found." });

  if (!invoice.client_email)
    return errAsync({
      reason: "Client does not have a configured email address.",
    } as const);

  const orgName = orgInfo?.name || "Landscape Friend";
  const orgLogo = orgInfo?.logoUrl || null;

  const senderEmail =
    process.env.SES_SENDER_EMAIL || "no-reply@landscapefriend.com";
  const formattedSender = `${orgName} <${senderEmail}>`;

  const emailSubject = `Invoice ${invoice.invoice_number} from ${orgName}`;

  const emailHtmlBody = generateInvoiceEmailHtml(invoice, orgName, orgLogo);

  return sendEmailWithSes({
    senderEmail: formattedSender,
    recipientEmail: invoice.client_email,
    subject: emailSubject,
    htmlBody: emailHtmlBody,
    pdfBase64,
    filename,
  })
    .then(() => updateInvoiceStatusDb(invoiceId, "sent"))
    .then(async (updated) => {
      if (!updated) {
        return errAsync({
          reason: "Failed to update invoice status after sending.",
        } as const);
      }
      return okAsync(updated);
    })
    .catch((e: Error) => {
      console.error(
        "Failed to send AWS SES email or update status:",
        e.cause,
        e.message,
      );
      return errAsync({
        reason: "SES connection failed or email rejected.",
      } as const);
    });
}
