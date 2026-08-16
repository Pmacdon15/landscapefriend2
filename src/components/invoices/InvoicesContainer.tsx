"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useOptimistic, useState } from "react";
import type { DbInvoiceResult } from "@/db/queries/invoices";
import { useInvoiceActions } from "@/hooks/use-invoice-actions";
import type { InvoicesContainerProps } from "@/types/types";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { InvoiceDetailModal } from "./InvoiceDetailModal";
import { InvoicesControlPanel } from "./InvoicesControlPanel";
import { InvoicesGrid } from "./InvoicesGrid";
import InvoicesRevenueGraph from "./InvoicesRevenueGraph";

export default function InvoicesContainer({
  invoicesPromise,
  revenueStatsPromise,
  nextInvoiceNumberPromise,
  organizationInfoPromise,
  searchPromise,
  statusPromise,
  hasSendInvoicesPromise,
  invoiceIdPromise = Promise.resolve(""),
}: InvoicesContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`?${params.toString()}`);
  };

  const initialInvoices = use(invoicesPromise);
  const revenueStats = use(revenueStatsPromise);
  const nextInvoiceNumber = use(nextInvoiceNumberPromise);
  const orgInfo = use(organizationInfoPromise);
  const searchValue = use(searchPromise);
  const statusValue = use(statusPromise);
  const hasSendInvoices = use(hasSendInvoicesPromise);
  const selectedInvoiceId = use(invoiceIdPromise);

  const organizationName = orgInfo?.name || "Landscape Friend";
  const organizationLogo = orgInfo?.logoUrl || null;

  const [optimisticState, setOptimistic] = useOptimistic(
    {
      invoices: initialInvoices,
      searchValue,
      statusValue,
      selectedInvoiceId,
    },
    (
      state,
      partialUpdate: Partial<{
        invoices: DbInvoiceResult[];
        searchValue: string;
        statusValue: string;
        selectedInvoiceId: string;
      }>,
    ) => ({
      ...state,
      ...partialUpdate,
    }),
  );

  // Modal open states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const {
    handleStatusChange,
    handleDeleteSuccess,
    handleStatusFilterChange,
    handleInvoiceCreated,
    onOpenDetailsModal,
  } = useInvoiceActions({
    optimisticState,
    setOptimistic,
    updateSearchParams,
    setDetailModalOpen,
  });

  return (
    <div className="w-full flex flex-col gap-6 p-1 md:p-4">
      {/* Analytics Graph */}
      <div className="w-full">
        <InvoicesRevenueGraph stats={revenueStats} />
      </div>

      {/* Control Panel: Search & Add */}
      <InvoicesControlPanel
        optimisticState={optimisticState}
        setOptimisticSearch={setOptimistic}
        updateSearchParams={updateSearchParams}
        handleStatusFilterChange={handleStatusFilterChange}
        setCreateModalOpen={setCreateModalOpen}
      />

      {/* Invoices Grid */}
      <InvoicesGrid
        invoices={optimisticState.invoices}
        hasSendInvoices={hasSendInvoices}
        organizationName={organizationName}
        organizationLogo={organizationLogo}
        onOpenDetailsModal={onOpenDetailsModal}
        handleStatusChange={handleStatusChange}
        handleDeleteSuccess={handleDeleteSuccess}
        updateSearchParams={updateSearchParams}
      />

      {/* EXTRACTED MODAL COMPONENTS */}
      <CreateInvoiceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        nextInvoiceNumber={nextInvoiceNumber}
        onInvoiceCreated={handleInvoiceCreated}
      />

      <InvoiceDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        invoice={
          optimisticState.invoices.find(
            (invoice) => invoice.id === optimisticState.selectedInvoiceId,
          ) || null
        }
        hasSendInvoices={hasSendInvoices}
        organizationName={organizationName}
        organizationLogo={organizationLogo}
      />
    </div>
  );
}
