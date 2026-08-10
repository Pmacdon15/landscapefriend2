import { startTransition } from "react";
import type { Client, OptimisticAction } from "@/types/types";

interface HandleSearchArgs {
  query: string;
  immediateClients?: Client[];
  defaultData?: { clients: Client[] };
  searchParams: any;
  router: any;
  setInputValue: (value: string) => void;
  setIsFocused: (value: boolean) => void;
  setOptimistic: (
    action: OptimisticAction | { type: "update-search"; value: string },
  ) => void;
}

export const handleSearch = ({
  query,
  immediateClients,
  defaultData,
  searchParams,
  router,
  setInputValue,
  setIsFocused,
  setOptimistic,
}: HandleSearchArgs) => {
  const trimmedQuery = query.trim();

  let optimisticClients: Client[] = [];
  if (trimmedQuery && immediateClients?.length) {
    optimisticClients = immediateClients.slice(0, 6);
  } else if (!trimmedQuery && defaultData?.clients) {
    optimisticClients = defaultData.clients;
  }
  const params = new URLSearchParams(searchParams);
  params.delete("clientId");

  if (trimmedQuery) {
    params.set("search", trimmedQuery);
    params.set("page", "1");
  } else {
    params.delete("search");
    params.delete("page");
  }

  setInputValue(trimmedQuery);
  setIsFocused(false);

  startTransition(() => {
    setOptimistic({
      type: "search-submitted",
      query: trimmedQuery,
      clients: optimisticClients,
    });

    router.push(`?${params.toString()}`);
  });
};

interface HandleSelectClientArgs {
  client: Client;
  searchParams: any;
  router: any;
  setInputValue: (value: string) => void;
  setIsFocused: (value: boolean) => void;
  setOptimistic: (
    action: OptimisticAction | { type: "update-search"; value: string },
  ) => void;
}

export const handleSelectClient = ({
  client,
  searchParams,
  router,
  setInputValue,
  setIsFocused,
  setOptimistic,
}: HandleSelectClientArgs) => {
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
