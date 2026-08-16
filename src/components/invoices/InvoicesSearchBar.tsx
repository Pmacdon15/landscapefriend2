"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { startTransition, useState } from "react";
import type { DbInvoiceResult } from "@/db/queries/invoices";
import { GenericSearchBar } from "../ui/generic-search-bar";

export function InvoicesSearchBar({
  setOptimisticSearch,
  optimisticValue,
  activeInvoices,
  updateSearchParams,
}: {
  setOptimisticSearch: (
    partialUpdate: Partial<{
      invoices: DbInvoiceResult[];
      searchValue: string;
    }>,
  ) => void;
  optimisticValue: string;
  activeInvoices: DbInvoiceResult[];
  updateSearchParams: (updates: Record<string, string | null>) => void;
}) {
  const matchedInvoice = activeInvoices.find(
    (inv) =>
      inv.id === optimisticValue ||
      inv.invoice_number === optimisticValue ||
      inv.client_id === optimisticValue,
  );

  const displaySearchValue = matchedInvoice
    ? optimisticValue === matchedInvoice.client_id
      ? matchedInvoice.client_name
      : matchedInvoice.invoice_number
    : optimisticValue;

  const [parentInputValue, setParentInputValue] = useState(displaySearchValue);
  const [prevOptimisticValue, setPrevOptimisticValue] =
    useState(optimisticValue);

  if (optimisticValue !== prevOptimisticValue) {
    setPrevOptimisticValue(optimisticValue);
    setParentInputValue(displaySearchValue);
  }

  const [debouncedValue] = useDebouncedValue(parentInputValue, { wait: 300 });

  const { data, isFetching } = useQuery<{ invoices: DbInvoiceResult[] }>({
    queryKey: ["invoice-search", debouncedValue],
    queryFn: async () => {
      if (!debouncedValue) return { invoices: [] };
      const res = await fetch(
        `/api/invoices/search?q=${encodeURIComponent(debouncedValue)}`,
      );
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
    enabled: debouncedValue.length > 0,
  });

  const { data: defaultData } = useQuery<{ invoices: DbInvoiceResult[] }>({
    queryKey: ["invoice-search", ""],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/search?q=`);
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
  });

  const invoicesList = data?.invoices || [];

  return (
    <GenericSearchBar<DbInvoiceResult>
      items={invoicesList}
      optimisticValue={displaySearchValue}
      placeholder="Search invoices by client, number..."
      isLoading={isFetching}
      emptyMessage="No matching invoices"
      onInputChange={setParentInputValue}
      filterPredicate={() => true} // Server-side search handles filtering
      getItemKey={(inv) => inv.id}
      onSearch={(query, _, setInputValue, setIsFocused) => {
        setInputValue(query);
        startTransition(() => {
          const updates: Partial<{
            invoices: DbInvoiceResult[];
            searchValue: string;
          }> = { searchValue: query };
          if (query && invoicesList.length) {
            updates.invoices = invoicesList.slice(0, 10);
          } else if (!query && defaultData?.invoices) {
            updates.invoices = defaultData.invoices;
          }
          setOptimisticSearch(updates);
        });
        if (query) {
          updateSearchParams({
            search: query,
            page: "1",
            clientId: null,
            invoice: null,
            invoiceId: null,
            date: null,
          });
        } else {
          updateSearchParams({
            search: null,
            page: null,
            clientId: null,
            invoice: null,
            invoiceId: null,
            date: null,
          });
        }
        setIsFocused(false);
      }}
      onSelect={(invoice, setInputValue, setIsFocused) => {
        startTransition(() => {
          setInputValue(invoice.invoice_number);
          setOptimisticSearch({ searchValue: invoice.invoice_number });
        });
        updateSearchParams({
          invoice: invoice.invoice_number,
          clientId: invoice.client_id,
          search: null,
          page: null,
          date: null,
        });
        setIsFocused(false);
      }}
      renderItem={(invoice) => (
        <div className="flex items-center justify-between w-full">
          <div>
            <span className="font-semibold block text-left">
              {invoice.invoice_number}
            </span>
            <span className="text-xs text-muted-foreground block text-left">
              {invoice.client_name}
            </span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
              invoice.status === "paid"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : invoice.status === "sent"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {invoice.status}
          </span>
        </div>
      )}
    />
  );
}
