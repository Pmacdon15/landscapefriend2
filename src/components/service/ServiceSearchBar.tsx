"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useServiceSearchQuery } from "@/hooks/use-service-search";
import {
  handleServiceSearch,
  handleServiceSelect,
} from "@/lib/service-search-utils";
import type { CutListItem, ServiceSearchBarProps } from "@/types/types";
import { GenericSearchBar } from "../ui/generic-search-bar";

export function ServiceSearchBar({
  items,
  optimisticValue,
  setOptimistic,
  date,
  userId,
}: ServiceSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: defaultData } = useServiceSearchQuery(date, userId ?? "");
  //TODO: Fix invoice search
  return (
    <GenericSearchBar<CutListItem>
      items={items}
      optimisticValue={optimisticValue}
      placeholder="Search this route..."
      emptyMessage="No clients found on this route."
      filterPredicate={(item, query) =>
        item.client.name.toLowerCase().includes(query.toLowerCase()) ||
        item.address.street.toLowerCase().includes(query.toLowerCase())
      }
      getItemKey={(item) => item.address.id}
      onSearch={(query, _filteredItems, setInputValue, setIsFocused) => {
        handleServiceSearch({
          query,
          defaultData,
          setOptimistic,
          setInputValue,
          setIsFocused,
          searchParams,
          router,
        });
      }}
      onSelect={(item, setInputValue, setIsFocused) => {
        handleServiceSelect({
          item,
          items,
          setOptimistic,
          setInputValue,
          setIsFocused,
          searchParams,
          router,
        });
      }}
      renderItem={(item) => (
        <>
          <span className="font-medium text-sm">{item.client.name}</span>
          <span className="text-xs text-muted-foreground">
            {item.address.street}, {item.address.city}
          </span>
        </>
      )}
    />
  );
}
