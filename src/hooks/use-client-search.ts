import { useQuery } from "@tanstack/react-query";
import type { Client } from "@/types/types";

export function useClientSearch(query: string) {
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
  });
}
