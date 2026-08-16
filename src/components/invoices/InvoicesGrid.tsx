"use client";

import type { DbInvoiceResult } from "@/db/queries/invoices";
import { InvoiceCard } from "./InvoiceCard";

interface InvoicesGridProps {
  invoices: DbInvoiceResult[];
  hasSendInvoices: boolean;
  organizationName: string;
  organizationLogo: string | null;
  onOpenDetailsModal: (invoiceId: string) => void;
  handleStatusChange: (invoiceId: string, newStatus: string) => Promise<void>;
  handleDeleteSuccess: (invoiceId: string) => void;
  updateSearchParams: (updates: Record<string, string | null>) => void;
}

export function InvoicesGrid({
  invoices,
  hasSendInvoices,
  organizationName,
  organizationLogo,
  onOpenDetailsModal,
  handleStatusChange,
  handleDeleteSuccess,
  updateSearchParams,
}: InvoicesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-2">
      {invoices.map((invoice) => (
        <InvoiceCard
          onOpenDetailsModal={onOpenDetailsModal}
          key={invoice.id}
          invoice={invoice}
          hasSendInvoices={hasSendInvoices}
          onStatusChange={handleStatusChange}
          onDeleteSuccess={handleDeleteSuccess}
          orgName={organizationName}
          logoUrl={organizationLogo}
          updateSearchParams={updateSearchParams}
        />
      ))}

      {invoices.length === 0 && (
        <div className="col-span-full text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">
            No invoices found
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm">
            Create a new invoice or adjust your search filter to populate
            billing logs.
          </p>
        </div>
      )}
    </div>
  );
}
