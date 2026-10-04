import type { ReadonlyURLSearchParams } from "next/navigation";
import { startTransition } from "react";
import type { Client, OptimisticAction } from "@/types/types";

type AppRouterInstance = ReturnType<typeof import("next/navigation").useRouter>;

interface HandleSearchArgs {
  query: string;
  /** Server search results for `query`, if they have already been fetched. */
  searchResults?: Client[];
  /** The default first page of clients (used when the search is cleared). */
  defaultData?: { clients: Client[] };
  searchParams: ReadonlyURLSearchParams;
  router: AppRouterInstance;
  setInputValue: (value: string) => void;
  setIsFocused: (value: boolean) => void;
  setOptimistic: (action: OptimisticAction) => void;
}

export const handleSearch = ({
  query,
  searchResults,
  defaultData,
  searchParams,
  router,
  setInputValue,
  setIsFocused,
  setOptimistic,
}: HandleSearchArgs) => {
  const trimmedQuery = query.trim();

  // Optimistically show what we already know: the server results for this
  // query (first page) or the cached default list when clearing. If neither is
  // available yet, leave the current list in place until the page reloads.
  let optimisticClients: Client[] | undefined;
  if (trimmedQuery && searchResults) {
    optimisticClients = searchResults.slice(0, 6);
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
  searchParams: ReadonlyURLSearchParams;
  router: AppRouterInstance;
  setInputValue: (value: string) => void;
  setIsFocused: (value: boolean) => void;
  setOptimistic: (action: OptimisticAction) => void;
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
