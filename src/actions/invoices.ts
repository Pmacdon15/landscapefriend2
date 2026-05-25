"use server";

import { updateTag } from "next/cache";
import {
  createInvoiceDal,
  deleteInvoiceDal,
  sendInvoiceEmailDal,
  updateInvoiceStatusDal,
} from "@/dal/invoices";

export async function createInvoiceAction(data: {
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
}) {
  const result = await createInvoiceDal(data);

  return result.match(
    (invoice) => {
      updateTag(`invoices-${invoice.org_id}`);
      updateTag(`invoices-revenue-${invoice.org_id}`);
      return {
        success: true,
        invoice,
        error: null,
      };
    },
    (err) => ({ success: false, invoice: null, error: err.reason }),
  );
}

export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: string,
) {
  const result = await updateInvoiceStatusDal(invoiceId, status);

  return result.match(
    (invoice) => {
      updateTag(`invoices-${invoice.org_id}`);
      updateTag(`invoice-detail-${invoice.id}`);
      updateTag(`invoices-revenue-${invoice.org_id}`);
      return {
        success: true,
        invoice,
        error: null,
      };
    },
    (err) => ({ success: false, invoice: null, error: err.reason }),
  );
}

export async function deleteInvoiceAction(invoiceId: string) {
  const result = await deleteInvoiceDal(invoiceId);

  return result.match(
    (_deleted) => {
      // Note: we can't easily read orgId from a deleted result directly,
      // but the DAL checks orgId first. If we need to clear all, we can clear the client-side tag or rely on manual refresh.
      // Actually, let's have deleteInvoiceDal return the deleted invoice's orgId in the ok result so we can revalidate!
      // Wait, deleteInvoiceDal in dal returns ok(deleted), where deleted is boolean.
      // Let's modify deleteInvoiceDal to return ok(existing.org_id) or similar, or we can just pass it or call updateTag if we know it.
      // Let's check how deleteClientDal does it: it returns the client row on success so we can read org_id!
      // Yes! Our deleteInvoiceDal can return ok(existing) on success so we have its org_id!
      // Let's check deleteInvoiceDal in src/dal/invoices.ts: it deletes and returns ok(deleted) which is a boolean. Let's make it return ok(existing) instead!
      // Let's see: yes! That is perfect.
      return {
        success: true,
        error: null,
      };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}

// Action wrapper for deleting invoice that receives invoice and clears cache
export async function deleteInvoiceWithOrgAction(invoiceId: string) {
  const result = await deleteInvoiceDal(invoiceId);

  return result.match(
    (deleted) => {
      updateTag(`invoices-${deleted.org_id}`);
      updateTag(`invoices-revenue-${deleted.org_id}`);
      updateTag(`invoice-detail-${invoiceId}`);
      return {
        success: true,
        error: null,
      };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}

export async function sendInvoiceEmailAction(
  invoiceId: string,
  pdfBase64?: string,
  filename?: string,
) {
  const result = await sendInvoiceEmailDal(invoiceId, pdfBase64, filename);

  return result.match(
    (invoice) => {
      // Revalidate cache tags for the updated invoice status
      updateTag(`invoices-${invoice.org_id}`);
      updateTag(`invoice-detail-${invoice.id}`);
      return {
        success: true,
        error: null,
      };
    },
    (err) => ({ success: false, error: err.reason }),
  );
}
