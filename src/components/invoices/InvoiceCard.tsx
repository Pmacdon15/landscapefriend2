"use client";


import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileCheck,
  Loader2,
  Mail,
  MoreVertical,
  Trash2,
} from "lucide-react";

import { type MouseEvent, useState } from "react";
import { toast } from "sonner";
import type { DbInvoiceResult } from "@/db/queries/invoices";
import { formatCurrency, formatStandardDate } from "@/lib/utils";
import { useDeleteInvoice, useSendInvoiceEmail } from "@/mutations/invoices";
import { Button } from "../ui/button";
import { DeleteInvoiceDialog } from "./DeleteInvoiceDialog";
import { InvoicePDFView } from "./InvoicePDFView";
import { downloadInvoicePDF, sendInvoiceEmailPDF } from "@/lib/utils/invoice-pdf-utils";

interface InvoiceCardProps {
  invoice: DbInvoiceResult;
  hasSendInvoices: boolean;
  onStatusChange: (invoiceId: string, newStatus: string) => Promise<void>;
  onDeleteSuccess: (invoiceId: string) => void;
  orgName: string;
  logoUrl: string | null;
  onOpenDetailsModal: (invoiceId: string) => void;
  updateSearchParams: (updates: Record<string, string | null>) => void;
}

export function InvoiceCard({
  invoice,
  hasSendInvoices,
  onStatusChange,
  onDeleteSuccess,
  orgName,
  logoUrl,
  onOpenDetailsModal,
  updateSearchParams,
}: InvoiceCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const deleteInvoiceMutation = useDeleteInvoice();
  const sendEmailMutation = useSendInvoiceEmail();

  const handleViewDetails = () => {
    updateSearchParams({
      invoiceId: invoice.id,
      clientId: invoice.client_id,
      search: null,
    });
    onOpenDetailsModal(invoice.id);
  };

  const handleClientClick = (e: MouseEvent) => {
    e.stopPropagation();
    updateSearchParams({
      page: "1",
      clientId: invoice.client_id,
      invoiceId: null,
    });
  };

  const handleInvoiceNumberClick = (e: MouseEvent) => {
    e.stopPropagation();
    updateSearchParams({
      search: invoice.invoice_number,
      page: "1",
      clientId: null,
      invoiceId: invoice.id,
    });
  };

  const handleDeleteInvoice = async () => {
    onDeleteSuccess(invoice.id);
    try {
      await deleteInvoiceMutation.mutateAsync(invoice.id);
    } catch (err) {
      console.error("Failed to delete invoice:", err);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      await downloadInvoicePDF({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientName: invoice.client_name,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEmail = async () => {
    setIsExporting(true);
    try {
      await sendInvoiceEmailPDF(
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          clientName: invoice.client_name,
        },
        sendEmailMutation
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleAction = async (name: string, fn: () => Promise<void>) => {
    setLoadingAction(name);
    setDropdownOpen(false);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message || "Action failed");
    } finally {
      setLoadingAction(null);
    }
  };

  // Status Badge Colors
  const statusStyles =
    {
      paid: "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200/50 dark:border-green-800/40",
      sent: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/40",
      draft:
        "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/40",
    }[invoice.status] || "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <>
      {/* Hidden print-ready container for html2canvas to capture */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          zIndex: -100,
        }}
      >
        <InvoicePDFView invoice={invoice} orgName={orgName} logoUrl={logoUrl} />
      </div>

      <div
        className={`relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 group flex flex-col justify-between h-[230px] ${
          dropdownOpen ? "z-30" : "z-10 hover:z-20"
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-green-700 dark:text-green-400 block mb-1">
                <button
                  type="button"
                  onClick={handleInvoiceNumberClick}
                  className="hover:underline hover:text-green-800 dark:hover:text-green-300 transition-colors focus-visible:outline-none text-left"
                >
                  {invoice.invoice_number}
                </button>
              </span>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px]">
                <button
                  type="button"
                  onClick={handleClientClick}
                  className="hover:underline hover:text-green-700 dark:hover:text-green-400 transition-colors focus-visible:outline-none text-left w-full truncate"
                >
                  {invoice.client_name}
                </button>
              </h4>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${statusStyles}`}
              >
                {invoice.status}
              </span>

              {/* Micro Dropdown Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="h-8 w-8 text-slate-500 hover:text-slate-950 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>

                {dropdownOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close dropdown"
                      tabIndex={-1}
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setDropdownOpen(false)}
                    />
                    {/* Menu List */}
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleViewDetails();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4 text-slate-400" />
                        View Invoice
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleAction("download", () => handleDownloadPDF());
                        }}
                        disabled={isExporting}
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                      >
                        {isExporting && loadingAction === "download" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                          <Download className="h-4 w-4 text-slate-400" />
                        )}
                        Download PDF
                      </button>

                      {hasSendInvoices && (
                        <button
                          type="button"
                          onClick={() => {
                            handleAction("email", () => handleSendEmail());
                          }}
                          disabled={isExporting}
                          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-100 dark:border-slate-900"
                        >
                          {isExporting && loadingAction === "email" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <Mail className="h-4 w-4 text-slate-400" />
                          )}
                          Send via Email
                        </button>
                      )}

                      <div className="my-1 border-t border-slate-100 dark:border-slate-900" />

                      {invoice.status !== "paid" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAction("status", () =>
                              onStatusChange(invoice.id, "paid"),
                            )
                          }
                          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark as Paid
                        </button>
                      )}

                      {invoice.status === "draft" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAction("status", () =>
                              onStatusChange(invoice.id, "sent"),
                            )
                          }
                          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-blue-600 dark:text-blue-400 flex items-center gap-2 font-medium"
                        >
                          <Clock className="h-4 w-4" />
                          Mark as Sent
                        </button>
                      )}

                      {invoice.status !== "draft" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAction("status", () =>
                              onStatusChange(invoice.id, "draft"),
                            )
                          }
                          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-amber-600 dark:text-amber-400 flex items-center gap-2 font-medium"
                        >
                          <FileCheck className="h-4 w-4" />
                          Reset to Draft
                        </button>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-900 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          setDeleteDialogOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center gap-2 font-medium"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Invoice
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 mt-4 text-[11px] text-slate-500">
              <div>
                <span className="block font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Issued
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatStandardDate(invoice.issue_date)}
                </span>
              </div>
              <div>
                <span className="block font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Due Date
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatStandardDate(invoice.due_date)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer: Amount */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
              Total Amount
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-50">
              {formatCurrency(invoice.total_amount)}
            </span>
          </div>

          {/* Floating loader or quick primary action */}
          <div className="h-8 flex items-center justify-end">
            {loadingAction ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="capitalize">{loadingAction}...</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
                className="h-8 rounded-full text-xs font-bold bg-green-50/50 hover:bg-green-50 text-green-700 border-green-200/50 dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:text-green-400 dark:border-slate-800"
              >
                View details
              </Button>
            )}
          </div>
        </div>
      </div>

      <DeleteInvoiceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        invoice={invoice}
        onDeleteConfirm={() => {
          setDeleteDialogOpen(false);
          handleAction("delete", () => handleDeleteInvoice());
        }}
      />
    </>
  );
}
