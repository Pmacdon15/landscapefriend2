"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

  const { data: defaultData, isFetching } = useClientSearch("");
  const clients = defaultData?.clients || [];

  return (
    <GenericSearchBar<Client>
      items={clients}
      optimisticValue={optimisticValue}
      isLoading={isFetching}
      placeholder="Search clients..."
      emptyMessage="No clients found."
      filterPredicate={(c, query) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.addresses?.some((a) =>
          a.street.toLowerCase().includes(query.toLowerCase()),
        ) ??
          false)
      }
      getItemKey={(c) => c.id}
      onSearch={(query, filteredItems, setInputValue, setIsFocused) => {
        utilHandleSearch({
          query,
          immediateClients: filteredItems,
          defaultData,
          searchParams,
          router,
          setInputValue,
          setIsFocused,
          setOptimistic,
        });
      }}
      onSelect={(client, setInputValue, setIsFocused) => {
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
