"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { User2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";
import type { Client, PastServiceItem } from "@/types/types";
import { GenericSearchBar } from "../ui/generic-search-bar";

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

type SearchItem =
  | { type: "client"; data: Client }
  | { type: "member"; data: { id: string; name: string } };

export function HistorySearchBar({
  setOptimistic,
  optimisticValue,
  members,
}: HistorySearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [parentInputValue, setParentInputValue] = useState(optimisticValue);
  const [debouncedValue] = useDebouncedValue(parentInputValue, { wait: 300 });

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

  const matchingMembers =
    parentInputValue.trim().length > 0
      ? members.filter((m) =>
          m.name.toLowerCase().includes(parentInputValue.toLowerCase()),
        )
      : [];

  const searchItems: SearchItem[] = [
    ...clients.map((c): SearchItem => ({ type: "client", data: c })),
    ...matchingMembers.map((m): SearchItem => ({ type: "member", data: m })),
  ];

  const handleSearch = (
    query: string,
    setInputValue: (v: string) => void,
    setIsFocused: (v: boolean) => void,
  ) => {
    const params = new URLSearchParams(searchParams);
    params.delete("clientId");
    setInputValue(query);
    setParentInputValue(query); // Sync local state just in case

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

  const handleSelectClient = (
    client: Client,
    setInputValue: (v: string) => void,
    setIsFocused: (v: boolean) => void,
  ) => {
    setInputValue(client.name);
    setParentInputValue(client.name);

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
    <GenericSearchBar<SearchItem>
      items={searchItems}
      optimisticValue={optimisticValue}
      isLoading={isFetching}
      placeholder="Search by client, address, date, team member..."
      emptyMessage={`No clients or team members found matching "${parentInputValue}"`}
      onInputChange={setParentInputValue}
      filterPredicate={() => true} // Handled server-side or already mapped
      getItemKey={(item) => `${item.type}-${item.data.id}`}
      onSearch={(query, _, setInputValue, setIsFocused) => {
        handleSearch(query, setInputValue, setIsFocused);
      }}
      onSelect={(item, setInputValue, setIsFocused) => {
        if (item.type === "client") {
          handleSelectClient(item.data, setInputValue, setIsFocused);
        } else {
          handleSearch(item.data.name, setInputValue, setIsFocused);
        }
      }}
      renderItem={() => null} // Unused due to custom renderDropdown
      renderDropdown={({ filteredItems, setInputValue, setIsFocused }) => {
        if (filteredItems.length === 0) {
          return (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No clients or team members found matching &quot;{parentInputValue}
              &quot;
            </div>
          );
        }

        const clientItems = filteredItems.filter(
          (i) => i.type === "client",
        ) as { type: "client"; data: Client }[];
        const memberItems = filteredItems.filter(
          (i) => i.type === "member",
        ) as { type: "member"; data: { id: string; name: string } }[];

        return (
          <div className="p-2 space-y-2">
            {clientItems.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Clients
                </div>
                {clientItems.map((c) => (
                  <button
                    type="button"
                    key={c.data.id}
                    onClick={() =>
                      handleSelectClient(c.data, setInputValue, setIsFocused)
                    }
                    className="w-full text-left flex flex-col p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors group"
                  >
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                      {c.data.name}
                    </span>
                    {c.data.addresses && c.data.addresses.length > 0 && (
                      <div className="flex flex-col mt-1">
                        {c.data.addresses.map((addr) => (
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

            {memberItems.length > 0 && (
              <div className="space-y-1 border-t border-slate-100 dark:border-slate-900/60 pt-2">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Team Members
                </div>
                {memberItems.map((m) => (
                  <button
                    type="button"
                    key={m.data.id}
                    onClick={() =>
                      handleSearch(m.data.name, setInputValue, setIsFocused)
                    }
                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors group"
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <User2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                        {m.data.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        View completed cuts by {m.data.name.split(" ")[0]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
