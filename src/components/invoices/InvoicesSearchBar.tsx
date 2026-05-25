"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import type { DbInvoiceResult } from "@/db/queries/invoices";
import { Button } from "../ui/button";

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

  const [inputValue, setInputValue] = useState(displaySearchValue);
  const [isFocused, setIsFocused] = useState(false);
  const [debouncedValue] = useDebouncedValue(inputValue, { wait: 300 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!isFocused) {
      setInputValue(displaySearchValue);
    }
  }, [displaySearchValue, isFocused]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (
    query: string,
    immediateInvoices?: DbInvoiceResult[],
  ) => {
    const params = new URLSearchParams(searchParams);
    setInputValue(query);
    startTransition(() => {
      setOptimisticSearch({ type: "update-search", value: query });

      if (immediateInvoices && query) {
        setOptimisticSearch({
          type: "optimistic-search",
          invoices: immediateInvoices.slice(0, 10),
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
  };

  const handleSelectInvoice = (invoice: DbInvoiceResult) => {
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
  };

  return (
    <div className="relative w-full max-w-md z-40" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={isFocused ? inputValue : optimisticValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch(inputValue, invoicesList);
            }
          }}
          placeholder="Search invoices by client, number..."
          className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {(isFocused ? inputValue : optimisticValue) && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 h-8 w-8"
            onClick={() => {
              setInputValue("");
              setIsFocused(true);
              handleSearch("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isFocused && (inputValue.length > 0 || invoicesList.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground rounded-md border shadow-lg max-h-60 overflow-y-auto z-50">
          {isFetching && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />
            </div>
          )}
          {!isFetching && invoicesList.length === 0 && (
            <div className="p-4 text-sm text-center text-muted-foreground">
              No matching invoices
            </div>
          )}
          {!isFetching &&
            invoicesList.map((invoice) => (
              <button
                type="button"
                key={invoice.id}
                onClick={() => handleSelectInvoice(invoice)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between border-b last:border-0"
              >
                <div>
                  <span className="font-semibold block">
                    {invoice.invoice_number}
                  </span>
                  <span className="text-xs text-muted-foreground block">
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
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
