import { startTransition } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { Client, CutListItem, OptimisticServiceAction } from "@/types/types";

interface RouterPush {
  push: (href: string) => void;
}

interface HandleSelectArgs {
  item: CutListItem;
  items: CutListItem[];
  setOptimistic: (action: OptimisticServiceAction) => void;
  setInputValue: (value: string) => void;
  setIsFocused: (value: boolean) => void;
  searchParams: ReadonlyURLSearchParams;
  router: RouterPush;
}

export const handleServiceSelect = ({
  item,
  items,
  setOptimistic,
  setInputValue,
  setIsFocused,
  searchParams,
  router,
}: HandleSelectArgs) => {
  startTransition(() => {
    // Optimistically filter to only this client's addresses and update search value
    const filteredCuts = items.filter((c) => c.client.id === item.client.id);
    setOptimistic({
      type: "select-client",
      value: item.client.name,
      cuts: filteredCuts,
    });

    setInputValue(item.client.name);

    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.set("clientId", item.client.id);
    router.push(`/clients-service?${params.toString()}`);
  });
  setIsFocused(false);
};

interface HandleSearchArgs {
  query: string;
  defaultData?: { clients: Client[] };
  setOptimistic: (action: OptimisticServiceAction) => void;
  setInputValue: (value: string) => void;
  setIsFocused: (value: boolean) => void;
  searchParams: ReadonlyURLSearchParams;
  router: RouterPush;
}

export const handleServiceSearch = ({
  query,
  defaultData,
  setOptimistic,
  setInputValue,
  setIsFocused,
  searchParams,
  router,
}: HandleSearchArgs) => {
  startTransition(() => {
    if (!query && defaultData?.clients) {
      const flatCuts = defaultData.clients.flatMap((client) =>
        (client.addresses ?? []).map((address) => ({
          client: { id: client.id, name: client.name },
          address,
        })),
      );
      setOptimistic({ type: "select-client", value: query, cuts: flatCuts });
    } else {
      setOptimistic({ type: "update-search", value: query });
    }
    setInputValue(query);

    const params = new URLSearchParams(searchParams);
    params.delete("clientId");
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    router.push(`/clients-service?${params.toString()}`);
  });
  setIsFocused(false);
};
