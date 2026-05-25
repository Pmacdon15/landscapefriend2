import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createInvoiceAction,
  deleteInvoiceWithOrgAction,
  sendInvoiceEmailAction,
  updateInvoiceStatusAction,
} from "@/actions/invoices";

export function useCreateInvoice() {
  return useMutation({
    mutationFn: async (data: Parameters<typeof createInvoiceAction>[0]) => {
      const { success, invoice, error } = await createInvoiceAction(data);
      if (!success || !invoice) {
        throw new Error(error ?? "Failed to create invoice");
      }
      return invoice;
    },
    onSuccess: (invoice) => {
      toast.success(`Invoice ${invoice.invoice_number} created successfully!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateInvoiceStatus() {
  return useMutation({
    mutationFn: async ({
      invoiceId,
      status,
    }: {
      invoiceId: string;
      status: string;
    }) => {
      const { success, invoice, error } = await updateInvoiceStatusAction(
        invoiceId,
        status,
      );
      if (!success || !invoice) {
        throw new Error(error ?? "Failed to update status");
      }
      return { invoice, status };
    },
    onSuccess: ({ invoice, status }) => {
      toast.success(`Invoice ${invoice.invoice_number} updated to ${status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteInvoice() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { success, error } = await deleteInvoiceWithOrgAction(invoiceId);
      if (!success) {
        throw new Error(error ?? "Failed to delete invoice");
      }
      return invoiceId;
    },
    onSuccess: () => {
      toast.success("Invoice deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSendInvoiceEmail() {
  return useMutation({
    mutationFn: async ({
      invoiceId,
      pdfBase64,
      filename,
    }: {
      invoiceId: string;
      pdfBase64?: string;
      filename?: string;
    }) => {
      const { success, error } = await sendInvoiceEmailAction(
        invoiceId,
        pdfBase64,
        filename,
      );
      if (!success) {
        throw new Error(error ?? "Failed to send email");
      }
      return invoiceId;
    },
    onSuccess: () => {
      toast.success("Invoice sent to client email successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
