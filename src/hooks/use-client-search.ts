import { useQuery } from "@tanstack/react-query";
import type { Client } from "@/types/types";

/**
 * Fetches clients from `/api/clients/search`.
 *
 * - With an empty `query`, the API returns the default first page (6 clients),
 *   which is used for instant/optimistic clearing of the search.
 * - With a non-empty `query`, the API performs a full server-side search across
 *   all clients (name, email, phone, address, assignee, next service date).
 */
export function useClientSearch(
  query: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery<{ clients: Client[] }>({
    queryKey: ["client-search", query],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);

      return await fetch(`/api/clients/search?${params.toString()}`).then(
        (res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        },
      );
    },
    enabled: options.enabled ?? true,
  });
}
