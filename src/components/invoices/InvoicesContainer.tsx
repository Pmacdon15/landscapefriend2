"use client";

import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  use,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import type { DbInvoiceResult, RevenueStats } from "@/db/queries/invoices";
import { useUpdateInvoiceStatus } from "@/mutations/invoices";
import { Button } from "../ui/button";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { InvoiceCard } from "./InvoiceCard";
import { InvoiceDetailModal } from "./InvoiceDetailModal";
import InvoicesRevenueGraph from "./InvoicesRevenueGraph";
import { InvoicesSearchBar } from "./InvoicesSearchBar";

interface OrgInfo {
  name: string;
  logoUrl: string | null;
}

interface InvoicesContainerProps {
  invoicesPromise: Promise<DbInvoiceResult[]>;
  revenueStatsPromise: Promise<RevenueStats[]>;
  nextInvoiceNumberPromise: Promise<string>;
  existingInvoiceNumbersPromise: Promise<string[]>;
  organizationInfoPromise: Promise<OrgInfo | null>;
  searchPromise: Promise<string>;
  statusPromise: Promise<string>;
  hasSendInvoicesPromise: Promise<boolean>;
}

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export default function InvoicesContainer({
  invoicesPromise,
  revenueStatsPromise,
  nextInvoiceNumberPromise,
  existingInvoiceNumbersPromise,
  organizationInfoPromise,
  searchPromise,
  statusPromise,
  hasSendInvoicesPromise,
}: InvoicesContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();
  const updateStatusMutation = useUpdateInvoiceStatus();

  // Load promises
  const initialInvoices = use(invoicesPromise);
  const revenueStats = use(revenueStatsPromise);
  const nextInvoiceNumber = use(nextInvoiceNumberPromise);
  const initialExistingInvoiceNumbers = use(existingInvoiceNumbersPromise);
  const orgInfo = use(organizationInfoPromise);
  const searchValue = use(searchPromise);
  const statusValue = use(statusPromise);
  const hasSendInvoices = use(hasSendInvoicesPromise);

  const organizationName = orgInfo?.name || "Landscape Friend";
  const organizationLogo = orgInfo?.logoUrl || null;

  // Optimistic States
  const [optimisticState, setOptimistic] = useOptimistic(
    { invoices: initialInvoices, searchValue, statusValue },
    (
      state,
      action:
        | { type: "update-search"; value: string }
        | { type: "update-status"; value: string }
        | { type: "optimistic-search"; invoices: DbInvoiceResult[] }
        | { type: "add-invoice"; invoice: DbInvoiceResult }
        | { type: "edit-status"; invoiceId: string; status: string }
        | { type: "delete-invoice"; invoiceId: string },
    ) => {
      switch (action.type) {
        case "update-search":
          return { ...state, searchValue: action.value };
        case "update-status":
          return { ...state, statusValue: action.value };
        case "optimistic-search":
          return { ...state, invoices: action.invoices };
        case "add-invoice":
          return { ...state, invoices: [action.invoice, ...state.invoices] };
        case "edit-status":
          return {
            ...state,
            invoices: state.invoices.map((inv) =>
              inv.id === action.invoiceId
                ? {
                    ...inv,
                    status: action.status,
                    sent_at:
                      action.status === "sent" ? new Date() : inv.sent_at,
                    paid_at:
                      action.status === "paid" ? new Date() : inv.paid_at,
                  }
                : inv,
            ),
          };
        case "delete-invoice":
          return {
            ...state,
            invoices: state.invoices.filter(
              (inv) => inv.id !== action.invoiceId,
            ),
          };
        default:
          return state;
      }
    },
  );

  // Modal open states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<DbInvoiceResult | null>(null);

  const urlInvoice =
    searchParams.get("invoice") || searchParams.get("invoiceId");
  const lastOpenedInvoiceRef = useRef<string | null>(null);

  useEffect(() => {
    if (urlInvoice && urlInvoice !== lastOpenedInvoiceRef.current) {
      if (isUuid(urlInvoice)) {
        // Direct click "View details" (UUID) -> open detail modal
        const found = optimisticState.invoices.find(
          (inv) => inv.id === urlInvoice,
        );
        if (found) {
          if (selectedInvoice?.id !== found.id) {
            setSelectedInvoice(found);
          }
          if (!detailModalOpen) {
            setDetailModalOpen(true);
          }
          lastOpenedInvoiceRef.current = urlInvoice;
        }
      } else {
        // Search autocomplete / invoice query (Invoice Number) -> update state without popup modal
        const found = optimisticState.invoices.find(
          (inv) => inv.invoice_number === urlInvoice,
        );
        if (found) {
          if (selectedInvoice?.id !== found.id) {
            setSelectedInvoice(found);
          }
        }
        if (detailModalOpen) {
          setDetailModalOpen(false);
        }
        lastOpenedInvoiceRef.current = urlInvoice;
      }
    } else if (!urlInvoice) {
      if (detailModalOpen) {
        setDetailModalOpen(false);
      }
      lastOpenedInvoiceRef.current = null;
    }
  }, [urlInvoice, optimisticState.invoices, detailModalOpen, selectedInvoice]);

  // Status Change handler
  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    startTransition(() => {
      setOptimistic({ type: "edit-status", invoiceId, status: newStatus });
    });
    try {
      await updateStatusMutation.mutateAsync({ invoiceId, status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Delete Success handler
  const handleDeleteSuccess = (invoiceId: string) => {
    startTransition(() => {
      setOptimistic({ type: "delete-invoice", invoiceId });
      setOptimistic({ type: "update-search", value: "" });
    });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");
    params.delete("clientId");
    params.delete("invoice");
    params.delete("invoiceId");
    router.push(`?${params.toString()}`);
  };

  // Status Filter click
  const handleStatusFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams);
    startTransition(() => {
      setOptimistic({ type: "update-status", value: status });
    });
    if (status && status !== "all") {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const handleInvoiceCreated = (invoice: DbInvoiceResult) => {
    startTransition(() => {
      setOptimistic({
        type: "add-invoice",
        invoice,
      });
      setOptimistic({
        type: "update-search",
        value: "",
      });
    });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");
    params.delete("clientId");
    params.delete("invoice");
    params.delete("invoiceId");
    router.push(`?${params.toString()}`);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("invoice");
    params.delete("invoiceId");
    router.push(`?${params.toString()}`);
  };

  const activeInvoices = optimisticState.invoices;

  return (
    <div className="w-full flex flex-col gap-6 p-1 md:p-4">
      {/* Analytics Graph */}
      <div className="w-full">
        <InvoicesRevenueGraph stats={revenueStats} />
      </div>

      {/* Control Panel: Search & Add */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <InvoicesSearchBar
          setOptimisticSearch={setOptimistic}
          optimisticValue={optimisticState.searchValue}
          activeInvoices={activeInvoices}
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

      {/* Invoices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-2">
        {activeInvoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            hasSendInvoices={hasSendInvoices}
            onStatusChange={handleStatusChange}
            onDeleteSuccess={handleDeleteSuccess}
            orgName={organizationName}
            logoUrl={organizationLogo}
          />
        ))}

        {activeInvoices.length === 0 && (
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

      {/* EXTRACTED MODAL COMPONENTS */}
      <CreateInvoiceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        nextInvoiceNumber={nextInvoiceNumber}
        existingInvoiceNumbers={initialExistingInvoiceNumbers}
        onInvoiceCreated={handleInvoiceCreated}
      />

      <InvoiceDetailModal
        isOpen={detailModalOpen}
        onClose={handleCloseDetailModal}
        invoice={selectedInvoice}
        hasSendInvoices={hasSendInvoices}
        organizationName={organizationName}
        organizationLogo={organizationLogo}
      />
    </div>
  );
}
