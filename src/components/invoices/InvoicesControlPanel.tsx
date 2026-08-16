"use client";

import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { InvoicesSearchBar } from "./InvoicesSearchBar";
import type { DbInvoiceResult } from "@/db/queries/invoices";
import type { OptimisticInvoiceState } from "@/hooks/use-invoice-actions";

interface InvoicesControlPanelProps {
  optimisticState: OptimisticInvoiceState;
  setOptimisticSearch: (update: Partial<OptimisticInvoiceState>) => void;
  updateSearchParams: (updates: Record<string, string | null>) => void;
  handleStatusFilterChange: (status: string) => void;
  setCreateModalOpen: (open: boolean) => void;
}

export function InvoicesControlPanel({
  optimisticState,
  setOptimisticSearch,
  updateSearchParams,
  handleStatusFilterChange,
  setCreateModalOpen,
}: InvoicesControlPanelProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
      <InvoicesSearchBar
        setOptimisticSearch={setOptimisticSearch}
        optimisticValue={optimisticState.searchValue}
        activeInvoices={optimisticState.invoices}
        updateSearchParams={updateSearchParams}
      />

      {/* Tab Filters */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-stretch sm:self-auto justify-between sm:justify-start gap-1">
        {["all", "draft", "sent", "paid"].map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => handleStatusFilterChange(status)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all duration-200 ${
              optimisticState.statusValue === status
                ? "bg-white dark:bg-slate-900 shadow text-green-700 dark:text-green-400"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <Button
        onClick={() => setCreateModalOpen(true)}
        className="bg-green-600 hover:bg-green-700 text-white rounded-full font-bold shadow-lg shadow-green-600/20 px-6 h-10 w-full sm:w-auto"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Invoice
      </Button>
    </div>
  );
}
