"use client";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { Download, Loader2, Mail, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { DbInvoiceResult } from "@/db/queries/invoices";
import { useSendInvoiceEmail } from "@/mutations/invoices";
import { Button } from "../ui/button";
import { InvoicePDFView } from "./InvoicePDFView";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: DbInvoiceResult | null;
  hasSendInvoices: boolean;
  organizationName: string;
  organizationLogo: string | null;
}

export function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  hasSendInvoices,
  organizationName,
  organizationLogo,
}: InvoiceDetailModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const sendEmailMutation = useSendInvoiceEmail();

  if (!isOpen || !invoice) return null;

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    setLoadingAction("download");

    setTimeout(async () => {
      const element = document.getElementById(`invoice-print-${invoice.id}`);
      if (!element) {
        toast.error("Failed to render PDF container");
        setIsExporting(false);
        setLoadingAction(null);
        return;
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = 210;
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save(
          `${invoice.invoice_number}-${invoice.client_name.replace(/\s+/g, "_")}.pdf`,
        );
        toast.success(`Downloaded ${invoice.invoice_number} successfully!`);
      } catch (err) {
        const error = err as Error;
        console.error(error);
        toast.error(`PDF generation failed: ${error.message}`);
      } finally {
        setIsExporting(false);
        setLoadingAction(null);
      }
    }, 400);
  };

  const handleSendEmail = async () => {
    setIsExporting(true);
    setLoadingAction("email");
    toast.info("Generating invoice PDF & dispatching via email...");

    setTimeout(async () => {
      const element = document.getElementById(`invoice-print-${invoice.id}`);
      if (!element) {
        toast.error("Failed to render PDF container");
        setIsExporting(false);
        setLoadingAction(null);
        return;
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.7);
        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = 210;
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

        const pdfDataUri = pdf.output("datauristring");
        const pdfBase64 = pdfDataUri.split(",")[1];
        const filename = `${invoice.invoice_number}-${invoice.client_name.replace(/\s+/g, "_")}.pdf`;

        await sendEmailMutation.mutateAsync({
          invoiceId: invoice.id,
          pdfBase64,
          filename,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsExporting(false);
        setLoadingAction(null);
      }
    }, 400);
  };

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
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="h-9 rounded-xl text-xs font-bold"
            >
              {isExporting && loadingAction === "download" ? (
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
                onClick={handleSendEmail}
                disabled={isExporting}
                className="h-9 rounded-xl text-xs font-bold bg-green-50/50 text-green-700 border-green-200/50 hover:bg-green-50 dark:bg-slate-950/20 dark:text-green-400 dark:border-slate-800"
              >
                {isExporting && loadingAction === "email" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                )}
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
