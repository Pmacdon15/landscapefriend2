import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface PDFExportParams {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
}

export const downloadInvoicePDF = async ({
  invoiceId,
  invoiceNumber,
  clientName,
}: PDFExportParams): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      const element = document.getElementById(`invoice-print-${invoiceId}`);
      if (!element) {
        toast.error("Failed to render PDF container");
        return reject(new Error("Failed to render PDF container"));
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
        pdf.save(`${invoiceNumber}-${clientName.replace(/\s+/g, "_")}.pdf`);
        toast.success(`Downloaded ${invoiceNumber} successfully!`);
        resolve();
      } catch (err) {
        console.error(err);
        toast.error(`PDF generation failed: ${(err as Error).message}`);
        reject(err);
      }
    }, 400);
  });
};

export const sendInvoiceEmailPDF = async (
  { invoiceId, invoiceNumber, clientName }: PDFExportParams,
  sendEmailMutation: {
    mutateAsync: (variables: {
      invoiceId: string;
      pdfBase64?: string;
      filename?: string;
    }) => Promise<string>;
  },
): Promise<void> => {
  toast.info("Generating invoice PDF & dispatching via email...");

  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      const element = document.getElementById(`invoice-print-${invoiceId}`);
      if (!element) {
        toast.error("Failed to render PDF container");
        return reject(new Error("Failed to render PDF container"));
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
        const filename = `${invoiceNumber}-${clientName.replace(/\s+/g, "_")}.pdf`;

        await sendEmailMutation.mutateAsync({
          invoiceId,
          pdfBase64,
          filename,
        });
        resolve();
      } catch (err) {
        console.error(err);
        reject(err);
      }
    }, 400);
  });
};
