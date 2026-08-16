import { useTransition } from "react";
import type { DbInvoiceResult } from "@/db/queries/invoices";
import { useUpdateInvoiceStatus } from "@/mutations/invoices";

export interface OptimisticInvoiceState {
  invoices: DbInvoiceResult[];
  searchValue: string;
  statusValue: string;
  selectedInvoiceId: string;
}

export function useInvoiceActions({
  optimisticState,
  setOptimistic,
  updateSearchParams,
  setDetailModalOpen,
}: {
  optimisticState: OptimisticInvoiceState;
  setOptimistic: (update: Partial<OptimisticInvoiceState>) => void;
  updateSearchParams: (updates: Record<string, string | null>) => void;
  setDetailModalOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const updateStatusMutation = useUpdateInvoiceStatus();

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    startTransition(() => {
      setOptimistic({
        invoices: optimisticState.invoices.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                status: newStatus,
                sent_at: newStatus === "sent" ? new Date() : inv.sent_at,
                paid_at: newStatus === "paid" ? new Date() : inv.paid_at,
              }
            : inv,
        ),
      });
    });
    try {
      await updateStatusMutation.mutateAsync({ invoiceId, status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteSuccess = (invoiceId: string) => {
    startTransition(() => {
      setOptimistic({
        invoices: optimisticState.invoices.filter(
          (inv) => inv.id !== invoiceId,
        ),
        searchValue: "",
        selectedInvoiceId: "",
      });
    });
    updateSearchParams({
      search: null,
      page: null,
      clientId: null,
      invoice: null,
      invoiceId: null,
      date: null,
    });
  };

  const handleStatusFilterChange = (status: string) => {
    updateSearchParams({
      status: status && status !== "all" ? status : null,
      page: null,
    });
  };

  const handleInvoiceCreated = (invoice: DbInvoiceResult) => {
    startTransition(() => {
      setOptimistic({
        invoices: [invoice, ...optimisticState.invoices],
        searchValue: "",
      });
    });
    updateSearchParams({
      search: null,
      page: null,
      clientId: null,
      invoice: null,
      invoiceId: null,
      date: null,
    });
  };

  const onOpenDetailsModal = (invoiceId: string) => {
    startTransition(() => {
      setOptimistic({ selectedInvoiceId: invoiceId });
    });
    updateSearchParams({ invoiceId });
    setDetailModalOpen(true);
  };

  return {
    handleStatusChange,
    handleDeleteSuccess,
    handleStatusFilterChange,
    handleInvoiceCreated,
    onOpenDetailsModal,
    isPending,
  };
}
