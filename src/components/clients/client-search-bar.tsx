"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useClientSearch } from "@/hooks/use-client-search";
import {
  handleSearch as utilHandleSearch,
  handleSelectClient as utilHandleSelectClient,
} from "@/lib/utils/client-search-utils";
import type { Client, OptimisticAction } from "@/types/types";
import { GenericSearchBar } from "../ui/generic-search-bar";

export function ClientSearchBar({
  setOptimistic,
  optimisticValue,
}: {
  setOptimistic: (action: OptimisticAction) => void;
  optimisticValue: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [typedValue, setTypedValue] = useState(optimisticValue);
  const trimmedTyped = typedValue.trim();
  const [debouncedValue] = useDebouncedValue(trimmedTyped, { wait: 300 });

  // Default first page (6 clients). Kept cached so clearing the search can
  // optimistically restore the list instantly.
  const { data: defaultData } = useClientSearch("");

  // Full server-side search across all clients while the user types.
  const { data: searchData, isFetching: isSearching } = useClientSearch(
    debouncedValue,
    { enabled: debouncedValue.length > 0 },
  );

  const isDebouncing = trimmedTyped !== debouncedValue;
  const clients = searchData?.clients ?? [];

  return (
    <GenericSearchBar<Client>
      items={clients}
      optimisticValue={optimisticValue}
      isLoading={trimmedTyped.length > 0 && (isDebouncing || isSearching)}
      placeholder="Search clients..."
      emptyMessage="No clients found."
      // Results are already filtered on the server, which also matches
      // email, phone, city, zip, team member and next service date.
      filterPredicate={() => true}
      getItemKey={(c) => c.id}
      onInputChange={setTypedValue}
      onSearch={(query, _filteredItems, setInputValue, setIsFocused) => {
        const trimmedQuery = query.trim();
        setTypedValue(trimmedQuery);
        utilHandleSearch({
          query,
          searchResults: trimmedQuery
            ? queryClient.getQueryData<{ clients: Client[] }>([
                "client-search",
                trimmedQuery,
              ])?.clients
            : undefined,
          defaultData,
          searchParams,
          router,
          setInputValue,
          setIsFocused,
          setOptimistic,
        });
      }}
      onSelect={(client, setInputValue, setIsFocused) => {
        setTypedValue(client.name);
        utilHandleSelectClient({
          client,
          searchParams,
          router,
          setInputValue,
          setIsFocused,
          setOptimistic,
        });
      }}
      renderItem={(client) => (
        <>
          <span className="font-medium text-sm">{client.name}</span>
          {client.addresses && client.addresses.length > 0 && (
            <div className="flex flex-col">
              {client.addresses.map((addr) => (
                <span key={addr.id} className="text-xs text-muted-foreground">
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
        </>
      )}
    />
  );
}
