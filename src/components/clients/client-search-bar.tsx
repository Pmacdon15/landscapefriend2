"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import type { Client, OptimisticAction } from "@/types/types";
import { Button } from "../ui/button";

export function ClientSearchBar({
  setOptimistic,
  optimisticValue,
}: {
  setOptimistic: (
    action: OptimisticAction | { type: "update-search"; value: string },
  ) => void;
  optimisticValue: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(optimisticValue);
  const [isFocused, setIsFocused] = useState(false);
  const [debouncedValue] = useDebouncedValue(inputValue, { wait: 300 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery<{ clients: Client[] }>({
    queryKey: ["client-search", debouncedValue],
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

  const { data: defaultData } = useQuery<{ clients: Client[] }>({
    queryKey: ["client-search", ""],
    queryFn: async () => {
      const res = await fetch(`/api/clients/search?q=`);
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
  });

  const clients = data?.clients || [];

  useEffect(() => {
    if (!isFocused) {
      setInputValue(optimisticValue);
    }
  }, [optimisticValue, isFocused]);

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

  const handleSearch = (query: string, immediateClients?: Client[]) => {
    const params = new URLSearchParams(searchParams);
    params.delete("clientId");
    setInputValue(query);
    startTransition(() => {
      setOptimistic({ type: "update-search", value: query });

      if (immediateClients && query) {
        setOptimistic({
          type: "optimistic-search",
          clients: immediateClients.slice(0, 6),
        });
      } else if (!query && defaultData?.clients) {
        setOptimistic({
          type: "optimistic-search",
          clients: defaultData.clients,
        });
      }
    });

    if (query) {
      params.set("search", query);
      params.set("page", "1");
    } else {
      params.delete("search");
      params.delete("page");
    }
    router.push(`?${params.toString()}`);
    setIsFocused(false);
  };

  const handleSelectClient = (client: Client) => {
    startTransition(() => {
      setInputValue(client.name);
      setOptimistic({ type: "select-client", client });
    });

    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.set("clientId", client.id);
    params.set("page", "1");
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
              handleSearch(inputValue, clients);
            }
          }}
          placeholder="Search clients..."
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

      {isFocused && inputValue.trim().length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-[300px] overflow-y-auto">
          {isFetching ? (
            <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : clients.length > 0 ? (
            <div className="p-1">
              {clients.map((client) => (
                <button
                  type="button"
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="w-full text-left flex flex-col p-2 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                >
                  <span className="font-medium text-sm">{client.name}</span>
                  {client.addresses && client.addresses.length > 0 && (
                    <div className="flex flex-col">
                      {client.addresses.map((addr) => (
                        <span
                          key={addr.id}
                          className="text-xs text-muted-foreground"
                        >
                          {addr.street}, {addr.city}
                        </span>
                      ))}
                    </div>
                  )}
                  {(client.email || client.phone) && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {client.phone} {client.phone && client.email ? "•" : ""}{" "}
                      {client.email}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No clients found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
