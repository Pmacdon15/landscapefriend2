import { auth, clerkClient } from "@clerk/nextjs/server";
import { err, errAsync, okAsync, type ResultAsync } from "neverthrow";
import { connection } from "next/server";
import {
  type CreateInvoiceInput,
  CreateInvoiceInputSchema,
  UpdateInvoiceStatusInputSchema,
} from "@/zod/schemas";
import {
  addressesBelongToOrgDb,
  clientBelongsToOrgDb,
} from "../db/queries/clients";
import {
  countInvoicesSentSinceDb,
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
import { validateInvoicePdfAttachment } from "../lib/utils/pdf-attachment";

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

  // The client and every line-item address must belong to this org.
  const addressIds = validatedData.items
    .map((item) => item.address_id)
    .filter((id): id is string => Boolean(id));

  const ownership = await Promise.all([
    clientBelongsToOrgDb(validatedData.clientId, orgId),
    addressesBelongToOrgDb(addressIds, orgId),
  ]).catch((e: Error) => {
    console.error("Error verifying invoice ownership:", e.cause, e.message);
    return null;
  });

  if (!ownership) {
    return errAsync({ reason: "Failed to verify invoice ownership" } as const);
  }

  const [clientOwned, addressesOwned] = ownership;
  if (!clientOwned) return errAsync({ reason: "Client not found" } as const);
  if (!addressesOwned)
    return errAsync({ reason: "Invalid service address" } as const);

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

  return await updateInvoiceStatusDb(validId, orgId, validStatus)
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

  return await deleteInvoiceDb(invoiceId, orgId)
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

/** Minimum time between two sends of the same invoice. */
const INVOICE_RESEND_COOLDOWN_MS = 10 * 60 * 1000;
/** Most invoices one org may email in a rolling 24 hours. */
const MAX_INVOICE_EMAILS_PER_ORG_PER_DAY = 200;

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

  // The attachment is built in the browser, so verify it really is a PDF and
  // re-encode it before it goes out from the platform's SES sender (#81).
  const attachment = validateInvoicePdfAttachment(pdfBase64, filename);
  if (!attachment.ok) return errAsync({ reason: attachment.reason });

  const loaded = await Promise.all([
    getInvoiceByIdDb(invoiceId),
    getOrganizationInfoDal(),
  ]).catch((e: Error) => {
    console.error("Failed to load invoice for sending:", e.cause, e.message);
    return null;
  });

  if (!loaded) return errAsync({ reason: "Failed to load invoice." });

  const [invoice, orgInfo] = loaded;

  if (!invoice || invoice.org_id !== orgId)
    return errAsync({ reason: "Invoice not found." });

  // Throttle sends so the shared SES identity can't be used as a relay (#81).
  if (
    invoice.sent_at &&
    Date.now() - new Date(invoice.sent_at).getTime() <
      INVOICE_RESEND_COOLDOWN_MS
  ) {
    return errAsync({
      reason: "This invoice was just sent. Please wait a few minutes.",
    });
  }

  const sentToday = await Promise.resolve()
    .then(() =>
      countInvoicesSentSinceDb(
        orgId,
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      ),
    )
    .catch((e: Error) => {
      console.error("Failed to count sent invoices:", e.cause, e.message);
      return null;
    });
  if (sentToday === null)
    return errAsync({ reason: "Failed to load invoice." });
  if (sentToday >= MAX_INVOICE_EMAILS_PER_ORG_PER_DAY)
    return errAsync({
      reason: "Daily invoice email limit reached. Please try again tomorrow.",
    });

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
    pdfBase64: attachment.value?.pdfBase64,
    filename: attachment.value?.filename,
  })
    .then(() => {
      console.info(
        `Invoice email sent: org=${orgId} invoice=${invoiceId} attachment=${attachment.value ? "pdf" : "none"}`,
      );
      return updateInvoiceStatusDb(invoiceId, orgId, "sent");
    })
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
