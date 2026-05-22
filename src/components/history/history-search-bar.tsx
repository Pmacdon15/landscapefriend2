"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, User2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PastServiceItem } from "@/dal/admin";
import type { Client } from "@/types/types";

interface HistorySearchBarProps {
  setOptimistic: (
    action:
      | { type: "update-search"; value: string }
      | { type: "select-client"; client: Client }
      | { type: "clear-search"; defaultHistory?: PastServiceItem[] },
  ) => void;
  optimisticValue: string;
  members: { id: string; name: string }[];
}

export function HistorySearchBar({
  setOptimistic,
  optimisticValue,
  members,
}: HistorySearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(optimisticValue);
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

  const { data: defaultHistory } = useQuery<{ data: PastServiceItem[] }>({
    queryKey: ["history-base"],
    queryFn: async () => {
      const res = await fetch("/api/admin/history");
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
  });

  const clients = data?.clients || [];

  // Filter crew members locally
  const matchingMembers =
    inputValue.trim().length > 0
      ? members.filter((m) =>
          m.name.toLowerCase().includes(inputValue.toLowerCase()),
        )
      : [];

  // Update input if optimisticValue changes from page loads
  useEffect(() => {
    if (!isFocused) {
      setInputValue(optimisticValue);
    }
  }, [optimisticValue, isFocused]);

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
      if (query) {
        setOptimistic({ type: "update-search", value: query });
      } else {
        setOptimistic({
          type: "clear-search",
          defaultHistory: defaultHistory?.data,
        });
      }
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
      setOptimistic({
        type: "select-client",
        client,
      });
      router.push(`?${params.toString()}`);
    });
    setIsFocused(false);
  };

  return (
    <div className="relative w-full max-w-md z-40" ref={containerRef}>
      <div className="relative flex items-center shadow-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
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
          placeholder="Search by client, address, date, team member..."
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
        <div className="absolute top-full mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 shadow-xl max-h-[350px] overflow-y-auto backdrop-blur-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {isFetching ? (
            <div className="p-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Searching clients...
            </div>
          ) : clients.length > 0 || matchingMembers.length > 0 ? (
            <div className="p-2 space-y-2">
              {clients.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Clients
                  </div>
                  {clients.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="w-full text-left flex flex-col p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors group"
                    >
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                        {c.name}
                      </span>
                      {c.addresses && c.addresses.length > 0 && (
                        <div className="flex flex-col mt-1">
                          {c.addresses.map((addr) => (
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
              )}

              {matchingMembers.length > 0 && (
                <div className="space-y-1 border-t border-slate-100 dark:border-slate-900/60 pt-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Team Members
                  </div>
                  {matchingMembers.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => handleSearch(m.name)}
                      className="w-full text-left flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors group"
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                        <User2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          View completed cuts by {m.name.split(" ")[0]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No clients or team members found matching &quot;{inputValue}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
