"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, use, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Client } from "@/types/types";

interface HistorySearchBarProps {
  clientPromise: Promise<Client | null>;
  searchPromise: Promise<string>;
}

export function HistorySearchBar({
  clientPromise,
  searchPromise,
}: HistorySearchBarProps) {
  const client = use(clientPromise);
  const search = use(searchPromise);
  const initialSearchValue = client ? client.name : search;

  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(initialSearchValue);
  const [isFocused, setIsFocused] = useState(false);
  const [debouncedValue] = useDebouncedValue(inputValue, { wait: 300 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery<{ clients: Client[] }>({
    queryKey: ["client-search-history", debouncedValue],
    queryFn: async () => {
      if (!debouncedValue) return { clients: [] };
      const res = await fetch(
        `/api/clients/search?q=${encodeURIComponent(debouncedValue)}`,
      );
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
    enabled: debouncedValue.length > 0,
  });

  const clients = data?.clients || [];

  // Update input if initialSearchValue changes from page loads
  useEffect(() => {
    if (!isFocused) {
      setInputValue(initialSearchValue);
    }
  }, [initialSearchValue, isFocused]);

  // Click outside listener to close autocomplete list
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

  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete("clientId");
    setInputValue(query);

    if (query) {
      params.set("search", query);
      params.set("page", "1");
    } else {
      params.delete("search");
      params.delete("page");
    }

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
    setIsFocused(false);
  };

  const handleSelectClient = (client: Client) => {
    setInputValue(client.name);

    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.set("clientId", client.id);
    params.set("page", "1");

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
    setIsFocused(false);
  };

  return (
    <div className="relative w-full max-w-xl z-40 mx-auto" ref={containerRef}>
      <div className="relative flex items-center shadow-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md transition-all duration-300 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
        <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch(inputValue);
            }
          }}
          placeholder="Search by client, address, date (YYYY-MM-DD)..."
          className="flex h-12 w-full bg-transparent pl-11 pr-12 py-3 text-sm focus-visible:outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        {inputValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
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

      {isFocused && inputValue.trim().length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 shadow-xl max-h-[300px] overflow-y-auto backdrop-blur-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {isFetching ? (
            <div className="p-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Searching clients...
            </div>
          ) : clients.length > 0 ? (
            <div className="p-2 space-y-1">
              {clients.map((client) => (
                <button
                  type="button"
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="w-full text-left flex flex-col p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors group"
                >
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                    {client.name}
                  </span>
                  {client.addresses && client.addresses.length > 0 && (
                    <div className="flex flex-col mt-1">
                      {client.addresses.map((addr) => (
                        <span
                          key={addr.id}
                          className="text-xs text-muted-foreground flex items-center gap-1"
                        >
                          • {addr.street}, {addr.city}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No clients found matching &quot;{inputValue}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
