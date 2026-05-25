"use client";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
  Download,
  Loader2,
  Mail,
  Plus,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createInvoiceAction,
  deleteInvoiceWithOrgAction,
  sendInvoiceEmailAction,
  updateInvoiceStatusAction,
} from "@/actions/invoices";
import type { DbInvoiceResult, RevenueStats } from "@/db/queries/invoices";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { InvoiceCard } from "./InvoiceCard";
import { InvoicePDFView } from "./InvoicePDFView";
import InvoicesRevenueGraph from "./InvoicesRevenueGraph";
import { InvoicesSearchBar } from "./InvoicesSearchBar";

// Interface for Clerk Org details
interface OrgInfo {
  name: string;
  logoUrl: string | null;
}

interface InvoicesContainerProps {
  invoicesPromise: Promise<DbInvoiceResult[]>;
  revenueStatsPromise: Promise<RevenueStats[]>;
  nextInvoiceNumberPromise: Promise<string>;
  organizationInfoPromise: Promise<OrgInfo | null>;
  searchPromise: Promise<string>;
  statusPromise: Promise<string>;
  hasSendInvoicesPromise: Promise<boolean>;
}

interface ClientSearchResult {
  id: string;
  name: string;
  email: string | null;
  addresses: {
    id: string;
    street: string;
    city: string;
  }[];
}

interface TempLineItem {
  id: string;
  service_type: string;
  address_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}
export default function InvoicesContainer({
  invoicesPromise,
  revenueStatsPromise,
  nextInvoiceNumberPromise,
  organizationInfoPromise,
  searchPromise,
  statusPromise,
  hasSendInvoicesPromise,
}: InvoicesContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();

  // Load promises
  const initialInvoices = use(invoicesPromise);
  const revenueStats = use(revenueStatsPromise);
  const nextInvoiceNumber = use(nextInvoiceNumberPromise);
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

  // Create Invoice Form State
  const [invoiceNo, setInvoiceNo] = useState(nextInvoiceNumber);
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] =
    useState<ClientSearchResult | null>(null);
  const [clientsDropdownOpen, setClientsDropdownOpen] = useState(false);
  const [searchedClients, setSearchedClients] = useState<ClientSearchResult[]>(
    [],
  );
  const [searchingClients, setSearchingClients] = useState(false);

  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [lineItems, setLineItems] = useState<TempLineItem[]>([
    {
      id: "initial-0",
      service_type: "grass",
      address_id: "",
      description: "",
      quantity: 1,
      unit_price: 45,
    },
  ]);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Hidden print reference
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Search clients for Invoice Form
  const handleClientSearch = async (val: string) => {
    setClientQuery(val);
    if (!val) {
      setSearchedClients([]);
      return;
    }
    setSearchingClients(true);
    setClientsDropdownOpen(true);
    try {
      const res = await fetch(
        `/api/clients/search?q=${encodeURIComponent(val)}`,
      );
      if (res.ok) {
        const data = await res.json();
        // Map clients to standard billing structure
        const mapped = data.clients.map((c: ClientSearchResult) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          addresses: c.addresses || [],
        }));
        setSearchedClients(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingClients(false);
    }
  };

  const handleSelectClient = (client: ClientSearchResult) => {
    setSelectedClient(client);
    setClientQuery(client.name);
    setClientsDropdownOpen(false);

    // Auto assign first address if available
    if (client.addresses.length > 0) {
      setLineItems((prev) =>
        prev.map((item) => ({ ...item, address_id: client.addresses[0].id })),
      );
    }
  };

  const addLineItem = () => {
    const defaultAddress = selectedClient?.addresses[0]?.id || "";
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        service_type: "grass",
        address_id: defaultAddress,
        description: "",
        quantity: 1,
        unit_price: 45,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, fields: Partial<TempLineItem>) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...fields } : item)),
    );
  };

  const calculateInvoiceTotal = () => {
    return lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );
  };

  // Submit Invoice Action
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error("Please select a client first");
      return;
    }
    if (lineItems.some((item) => !item.address_id)) {
      toast.error("Please pick a service address for all items");
      return;
    }

    setSubmittingInvoice(true);
    try {
      const res = await createInvoiceAction({
        clientId: selectedClient.id,
        invoiceNumber: invoiceNo,
        issueDate,
        dueDate,
        notes: invoiceNotes || null,
        items: lineItems.map((item) => ({
          service_type: item.service_type,
          address_id: item.address_id || null,
          description: item.description || null,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      });

      if (res.success && res.invoice) {
        toast.success("Invoice created successfully!");
        startTransition(() => {
          setOptimistic({
            type: "add-invoice",
            invoice: res.invoice as DbInvoiceResult,
          });
        });
        setCreateModalOpen(false);
        // Reset form
        setSelectedClient(null);
        setClientQuery("");
        setInvoiceNotes("");
        setLineItems([
          {
            id: crypto.randomUUID(),
            service_type: "grass",
            address_id: "",
            description: "",
            quantity: 1,
            unit_price: 45,
          },
        ]);
        // Increment number
        setInvoiceNo((prev) => {
          const match = prev.match(/INV-(\d+)/);
          if (match) {
            return `INV-${String(parseInt(match[1], 10) + 1).padStart(4, "0")}`;
          }
          return `INV-${Date.now()}`;
        });
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create invoice");
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "An error occurred");
    } finally {
      setSubmittingInvoice(false);
    }
  };

  // Status Change handler
  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    startTransition(() => {
      setOptimistic({ type: "edit-status", invoiceId, status: newStatus });
    });
    const res = await updateInvoiceStatusAction(invoiceId, newStatus);
    if (res.success) {
      toast.success(`Invoice updated to ${newStatus}`);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update status");
    }
  };

  // Delete Invoice handler
  const handleDelete = async (invoiceId: string) => {
    startTransition(() => {
      setOptimistic({ type: "delete-invoice", invoiceId });
    });
    const res = await deleteInvoiceWithOrgAction(invoiceId);
    if (res.success) {
      toast.success("Invoice deleted successfully");     
    } else {
      toast.error(res.error || "Failed to delete invoice");
    }
  };

  // Email Invoice handler
  const handleSendEmail = async (invoiceId: string) => {
    const invoice = activeInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      toast.error("Invoice not found in list");
      return;
    }

    setIsExporting(true);
    setSelectedInvoice(invoice); // Ensure it is rendered in A4 print-ready DOM

    toast.info("Generating invoice PDF & dispatching via email...");

    setTimeout(async () => {
      const element = document.getElementById(`invoice-print-${invoice.id}`);
      if (!element) {
        toast.error("Failed to render PDF container");
        setIsExporting(false);
        return;
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 1.5, // Balanced quality scale for crisp text at lightweight size
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
        });

        // Convert to compressed JPEG (70% quality) instead of PNG to stay well under Next.js 1MB Server Action payload limit
        const imgData = canvas.toDataURL("image/jpeg", 0.7);
        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = 210; // A4 width
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        
        // Output as base64 string (robust parsing across all versions)
        const pdfDataUri = pdf.output("datauristring");
        const pdfBase64 = pdfDataUri.split(",")[1];
        const filename = `${invoice.invoice_number}-${invoice.client_name.replace(/\s+/g, "_")}.pdf`;

        const res = await sendInvoiceEmailAction(invoiceId, pdfBase64, filename);
        if (res.success) {
          toast.success(`Invoice ${invoice.invoice_number} sent to client email successfully with PDF attachment!`);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to send email");
        }
      } catch (err) {
        const error = err as Error;
        console.error(error);
        toast.error(`Email sending failed during PDF compile: ${error.message}`);
      } finally {
        setIsExporting(false);
      }
    }, 400);
  };

  // PDF Download trigger (Desktop A4 fixed mode)
  const handleDownloadPDF = async (invoice: DbInvoiceResult) => {
    setIsExporting(true);
    setSelectedInvoice(invoice); // Set active to ensure it is in offscreen DOM

    // Short timeout to guarantee printRef is fully painted offscreen
    setTimeout(async () => {
      const element = document.getElementById(`invoice-print-${invoice.id}`);
      if (!element) {
        toast.error("Failed to render PDF container");
        setIsExporting(false);
        return;
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 2, // Double quality for smooth typography
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = 210; // A4 width
        const _pdfHeight = 297; // A4 height
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
      }
    }, 400);
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

  const activeInvoices = optimisticState.invoices;

  return (
    <div className="w-full flex flex-col gap-6 p-1 md:p-4">
      {/* Off-screen fixed container for html2canvas to capture in Desktop A4 mode */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          zIndex: -100,
        }}
      >
        {selectedInvoice && (
          <InvoicePDFView
            ref={printRef}
            invoice={selectedInvoice}
            orgName={organizationName}
            logoUrl={organizationLogo}
          />
        )}
      </div>

      {/* Analytics Graph */}
      <div className="w-full">
        <InvoicesRevenueGraph stats={revenueStats} />
      </div>

      {/* Control Panel: Search & Add */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <InvoicesSearchBar
          setOptimisticSearch={setOptimistic}
          optimisticValue={optimisticState.searchValue}
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

      {/* Invoices Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-2">
        {activeInvoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            hasSendInvoices={hasSendInvoices}
            onViewDetails={(inv) => {
              setSelectedInvoice(inv);
              setDetailModalOpen(true);
            }}
            onDownloadPDF={handleDownloadPDF}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onSendEmail={handleSendEmail}
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

      {/* CREATE INVOICE MODAL DIALOG */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 relative">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-6 right-6 h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 mb-1">
              New Billing Invoice
            </h3>
            <p className="text-xs text-muted-foreground border-b pb-6 mb-6 dark:border-slate-800">
              Generate a client service statement. Invoice billing is
              synchronized into transaction ledgers.
            </p>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-6">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label
                    htmlFor="invoiceNum"
                    className="font-bold text-xs uppercase tracking-wider text-slate-400"
                  >
                    Invoice Number
                  </Label>
                  <Input
                    id="invoiceNum"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    required
                    className="mt-2 font-mono"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="issueD"
                    className="font-bold text-xs uppercase tracking-wider text-slate-400"
                  >
                    Issue Date
                  </Label>
                  <Input
                    id="issueD"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="dueD"
                    className="font-bold text-xs uppercase tracking-wider text-slate-400"
                  >
                    Due Date
                  </Label>
                  <Input
                    id="dueD"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Client Selection Autocomplete */}
              <div className="relative">
                <Label
                  htmlFor="clientName"
                  className="font-bold text-xs uppercase tracking-wider text-slate-400"
                >
                  Client Selection
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="clientName"
                    value={clientQuery}
                    onChange={(e) => handleClientSearch(e.target.value)}
                    onFocus={() => {
                      if (clientQuery) setClientsDropdownOpen(true);
                    }}
                    placeholder="Search active clients by name..."
                    required
                  />
                  {searchingClients && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {clientsDropdownOpen && searchedClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 text-sm py-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                    {searchedClients.map((client) => (
                      <button
                        type="button"
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors font-medium"
                      >
                        {client.name} {client.email ? `(${client.email})` : ""}
                      </button>
                    ))}
                  </div>
                )}

                {selectedClient && (
                  <div className="mt-3 bg-green-50/50 dark:bg-green-950/10 border border-green-200/50 dark:border-green-800/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between text-xs gap-2">
                    <div>
                      <span className="font-bold block text-green-800 dark:text-green-400">
                        Selected Client:
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">
                        {selectedClient.name}
                      </span>
                    </div>
                    <div className="text-left md:text-right">
                      <span className="font-bold block text-green-800 dark:text-green-400">
                        Available Addresses:
                      </span>
                      <span className="text-slate-500 font-semibold">
                        {selectedClient.addresses.length} property addresses
                        registered.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Service Line Items */}
              <div className="space-y-4 border-t dark:border-slate-800 pt-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide text-sm">
                    Charges & Service Line Items
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLineItem}
                    disabled={!selectedClient}
                    className="h-8 rounded-full text-xs font-bold"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                    Add Service
                  </Button>
                </div>

                {!selectedClient ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl">
                    Please select a client to populate service property
                    locations.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {lineItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-slate-50/60 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 space-y-4 relative"
                      >
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="absolute top-4 right-4 text-red-500 hover:text-red-700 h-6 w-6 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Service Type Selection */}
                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Service Type
                            </Label>
                            <select
                              value={item.service_type}
                              onChange={(e) =>
                                updateLineItem(index, {
                                  service_type: e.target.value,
                                })
                              }
                              className="w-full mt-2 h-10 border rounded-md px-3 text-sm bg-background border-input"
                            >
                              <option value="grass">Grass Mowing</option>
                              <option value="snow">Snow Plowing</option>
                              <option value="yard clean-up">
                                Yard Clean-Up
                              </option>
                              <option value="trimming">
                                Trimming & Pruning
                              </option>
                              <option value="other">Other Service</option>
                            </select>
                          </div>

                          {/* Property Location Dropdown */}
                          <div className="col-span-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Property Location Address
                            </Label>
                            <select
                              value={item.address_id}
                              onChange={(e) =>
                                updateLineItem(index, {
                                  address_id: e.target.value,
                                })
                              }
                              required
                              className="w-full mt-2 h-10 border rounded-md px-3 text-sm bg-background border-input capitalize"
                            >
                              <option value="">
                                -- Choose client location --
                              </option>
                              {selectedClient.addresses.map((addr) => (
                                <option key={addr.id} value={addr.id}>
                                  {addr.street}, {addr.city}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Description */}
                          <div className="md:col-span-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Line Description
                            </Label>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateLineItem(index, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Notes or itemized details..."
                              className="mt-2"
                            />
                          </div>

                          {/* Unit Price */}
                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Unit Price ($)
                            </Label>
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateLineItem(index, {
                                  unit_price: Number(e.target.value),
                                })
                              }
                              required
                              className="mt-2 font-mono"
                            />
                          </div>

                          {/* Quantity */}
                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Quantity
                            </Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(index, {
                                  quantity: Number(e.target.value),
                                })
                              }
                              required
                              className="mt-2 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label
                  htmlFor="notesInput"
                  className="font-bold text-xs uppercase tracking-wider text-slate-400"
                >
                  Invoice Notes / Terms
                </Label>
                <textarea
                  id="notesInput"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Notes, terms, payment instruction..."
                  className="w-full mt-2 min-h-20 border rounded-md p-3 text-sm bg-background border-input"
                />
              </div>

              {/* Total display & Action buttons */}
              <div className="border-t dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                    Calculated Total
                  </span>
                  <span className="text-2xl font-black text-green-700 dark:text-green-400">
                    ${calculateInvoiceTotal().toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreateModalOpen(false)}
                    className="w-full sm:w-auto rounded-full font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingInvoice || !selectedClient}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white rounded-full font-bold shadow-lg shadow-green-600/20 px-8 h-10"
                  >
                    {submittingInvoice ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Generating...
                      </>
                    ) : (
                      "Create Invoice"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL PREVIEW MODAL DIALOG */}
      {detailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl p-6 relative">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b pb-4 mb-6 dark:border-slate-800">
              <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Invoice Preview - {selectedInvoice.invoice_number}
              </h3>

              <div className="flex items-center gap-3 pr-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(selectedInvoice)}
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
                    onClick={() => handleSendEmail(selectedInvoice.id)}
                    className="h-9 rounded-xl text-xs font-bold bg-green-50/50 text-green-700 border-green-200/50 hover:bg-green-50 dark:bg-slate-950/20 dark:text-green-400 dark:border-slate-800"
                  >
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Send via Email
                  </Button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="absolute top-6 right-6 h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Render invoice visually (centered container) */}
            <div className="flex justify-center bg-slate-200 dark:bg-slate-950 p-6 rounded-2xl overflow-x-auto">
              <InvoicePDFView
                invoice={selectedInvoice}
                orgName={organizationName}
                logoUrl={organizationLogo}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
