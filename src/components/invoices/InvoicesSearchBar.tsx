"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";
import type { DbInvoiceResult } from "@/db/queries/invoices";
import { GenericSearchBar } from "../ui/generic-search-bar";

export function InvoicesSearchBar({
  setOptimisticSearch,
  optimisticValue,
  activeInvoices,
}: {
  setOptimisticSearch: (
    action:
      | { type: "update-search"; value: string }
      | { type: "optimistic-search"; invoices: DbInvoiceResult[] },
  ) => void;
  optimisticValue: string;
  activeInvoices: DbInvoiceResult[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const matchedInvoice = activeInvoices.find(
    (inv) =>
      inv.id === optimisticValue || inv.invoice_number === optimisticValue,
  );

  const displaySearchValue = matchedInvoice
    ? matchedInvoice.invoice_number
    : optimisticValue;

  const [parentInputValue, setParentInputValue] = useState(displaySearchValue);
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
        const params = new URLSearchParams(searchParams);
        setInputValue(query);
        startTransition(() => {
          setOptimisticSearch({ type: "update-search", value: query });
          if (query && invoicesList.length) {
            setOptimisticSearch({
              type: "optimistic-search",
              invoices: invoicesList.slice(0, 10),
            });
          } else if (!query && defaultData?.invoices) {
            setOptimisticSearch({
              type: "optimistic-search",
              invoices: defaultData.invoices,
            });
          }
        });
        if (query) {
          params.set("search", query);
          params.set("page", "1");
          params.delete("clientId");
          params.delete("invoice");
          params.delete("invoiceId");
        } else {
          params.delete("search");
          params.delete("page");
          params.delete("clientId");
          params.delete("invoice");
          params.delete("invoiceId");
        }
        router.push(`?${params.toString()}`);
        setIsFocused(false);
      }}
      onSelect={(invoice, setInputValue, setIsFocused) => {
        startTransition(() => {
          setInputValue(invoice.invoice_number);
          setOptimisticSearch({
            type: "update-search",
            value: invoice.invoice_number,
          });
        });
        const params = new URLSearchParams(searchParams.toString());
        params.set("invoice", invoice.invoice_number);
        params.set("clientId", invoice.client_id);
        params.delete("search");
        params.delete("page");
        router.push(`?${params.toString()}`);
        setIsFocused(false);
      }}
      renderItem={(invoice) => (
        <div className="flex items-center justify-between w-full">
          <div>
            <span className="font-semibold block text-left">{invoice.invoice_number}</span>
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
