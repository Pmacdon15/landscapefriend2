"use client";

import { Download, Loader2, Mail, X } from "lucide-react";
import type { DbInvoiceResult } from "@/db/queries/invoices";
import { Button } from "../ui/button";
import { InvoicePDFView } from "./InvoicePDFView";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: DbInvoiceResult | null;
  hasSendInvoices: boolean;
  organizationName: string;
  organizationLogo: string | null;
  onDownloadPDF: (invoice: DbInvoiceResult) => Promise<void>;
  onSendEmail: (invoiceId: string) => Promise<void>;
  isExporting: boolean;
}

export function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  hasSendInvoices,
  organizationName,
  organizationLogo,
  onDownloadPDF,
  onSendEmail,
  isExporting,
}: InvoiceDetailModalProps) {
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl p-6 relative">
        {/* Modal Controls */}
        <div className="flex items-center justify-between border-b pb-4 mb-6 dark:border-slate-800">
          <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Invoice Preview - {invoice.invoice_number}
          </h3>

          <div className="flex items-center gap-3 pr-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadPDF(invoice)}
              disabled={isExporting}
              className="h-9 rounded-xl text-xs font-bold"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              Export PDF
            </Button>

            {hasSendInvoices && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendEmail(invoice.id)}
                className="h-9 rounded-xl text-xs font-bold bg-green-50/50 text-green-700 border-green-200/50 hover:bg-green-50 dark:bg-slate-950/20 dark:text-green-400 dark:border-slate-800"
              >
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Send via Email
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Render invoice visually (centered container) */}
        <div className="flex justify-center bg-slate-200 dark:bg-slate-950 p-6 rounded-2xl overflow-x-auto">
          <InvoicePDFView
            invoice={invoice}
            orgName={organizationName}
            logoUrl={organizationLogo}
          />
        </div>
      </div>
    </div>
  );
}
