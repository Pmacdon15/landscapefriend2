"use client";

import * as React from "react";
import type { DbInvoiceResult } from "@/db/queries/invoices";

export interface InvoicePDFViewProps {
  invoice: DbInvoiceResult;
  orgName: string;
  logoUrl: string | null;
}

export const InvoicePDFView = React.forwardRef<
  HTMLDivElement,
  InvoicePDFViewProps
>(({ invoice, orgName, logoUrl }, ref) => {
  const formattedDate = (d: Date | string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return String(d);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const subtotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const taxRate = Number(invoice.tax_rate || 0);
  const taxAmount = subtotal * (taxRate / 100);

  return (
    <div
      ref={ref}
      id={`invoice-print-${invoice.id}`}
      className="w-[800px] min-h-[1120px] p-12 bg-white text-slate-800 flex flex-col justify-between font-sans border border-slate-200 shadow-sm relative overflow-hidden select-none"
      style={{ boxSizing: "border-box" }}
    >
      {/* Paid Stamp Indicator */}
      {invoice.status === "paid" && (
        <div className="absolute top-12 right-12 border-4 border-emerald-500/30 text-emerald-500/40 text-4xl font-black uppercase tracking-widest px-6 py-2 rounded-lg transform rotate-12 pointer-events-none select-none z-0">
          Paid
        </div>
      )}

      <div>
        {/* Header section */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={orgName}
                className="h-16 w-16 object-contain rounded-md border border-slate-100 bg-white"
              />
            ) : (
              <div className="h-16 w-16 bg-green-700 text-white rounded-md flex items-center justify-center font-bold text-2xl">
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {orgName}
              </h1>
              <p className="text-xs text-slate-500">
                Premium Landscape Services
              </p>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-900 tracking-wider">
              INVOICE
            </h2>
            <p className="text-sm font-semibold text-green-700">
              {invoice.invoice_number}
            </p>
            <div className="mt-2 text-xs space-y-0.5 text-slate-500">
              <p>
                Status:{" "}
                <span className="capitalize font-semibold text-slate-700">
                  {invoice.status}
                </span>
              </p>
              {invoice.sent_at && <p>Sent: {formattedDate(invoice.sent_at)}</p>}
              {invoice.paid_at && <p>Paid: {formattedDate(invoice.paid_at)}</p>}
            </div>
          </div>
        </div>

        {/* Billing Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              BILL TO:
            </h3>
            <p className="font-bold text-slate-900 text-base">
              {invoice.client_name}
            </p>
            {invoice.client_email && (
              <p className="text-slate-600 mt-1">{invoice.client_email}</p>
            )}
            {/* If there's client phone or other info, show it */}
          </div>

          <div className="text-right">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              INVOICE DETAILS:
            </h3>
            <div className="space-y-1 text-slate-600">
              <p>
                <span className="font-semibold text-slate-700">
                  Issue Date:
                </span>{" "}
                {formattedDate(invoice.issue_date)}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Due Date:</span>{" "}
                {formattedDate(invoice.due_date)}
              </p>
            </div>
          </div>
        </div>

        {/* Services charged table */}
        <div className="mb-8">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="py-3 px-4">Service Type</th>
                <th className="py-3 px-4">Property Address</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item, idx) => (
                <tr key={item.id || idx} className="text-slate-700">
                  <td className="py-4 px-4 font-bold capitalize text-slate-900">
                    {item.service_type}
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {item.street ? (
                      <div>
                        <p className="font-medium text-slate-800">
                          {item.street}
                        </p>
                        <p className="text-xs text-slate-500">{item.city}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        General Service
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-500 max-w-[200px] truncate">
                    {item.description || "-"}
                  </td>
                  <td className="py-4 px-4 text-right font-medium">
                    {formatCurrency(Number(item.unit_price))}
                  </td>
                  <td className="py-4 px-4 text-center text-slate-600 font-semibold">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-900">
                    {formatCurrency(Number(item.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes and total summary */}
        <div className="flex justify-between items-start pt-6 border-t border-slate-200 gap-8">
          <div className="max-w-[400px]">
            {invoice.notes && (
              <>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  INVOICE NOTES:
                </h4>
                <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100 leading-relaxed">
                  {invoice.notes}
                </p>
              </>
            )}
          </div>

          <div className="w-[280px] bg-slate-50/70 p-6 rounded-xl border border-slate-100 text-right space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-semibold">Subtotal:</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-semibold">Tax ({taxRate.toFixed(2)}%):</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(taxAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <span className="text-slate-900 font-extrabold uppercase tracking-wide">
                Total Due:
              </span>
              <span className="font-black text-green-700 text-lg">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info brand */}
      <div className="border-t border-slate-100 pt-8 mt-12 flex justify-between items-center text-xs text-slate-400">
        <p>Thank you for your business!</p>
        <p>
          © {new Date().getFullYear()} {orgName}. All rights reserved.
        </p>
      </div>
    </div>
  );
});

InvoicePDFView.displayName = "InvoicePDFView";
