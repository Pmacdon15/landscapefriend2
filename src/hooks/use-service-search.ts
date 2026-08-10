import { useQuery } from "@tanstack/react-query";
import type { Client } from "@/types/types";

export function useServiceSearchQuery(date: Date, userId?: string) {
  return useQuery<{ clients: Client[] }>({
    queryKey: [
      "service-search",
      date.toLocaleDateString("en-CA"),
      userId || "all",
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: date.toLocaleDateString("en-CA"),
      });
      if (userId) params.set("userId", userId);

      return await fetch(`/api/clients/cut-list?${params.toString()}`).then(
        (res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        },
      );
    },
  });
}
