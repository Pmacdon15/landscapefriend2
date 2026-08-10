import { useQuery } from "@tanstack/react-query";
import type { Client } from "@/types/types";

export function useClientSearch(debouncedValue: string) {
  const { data, isFetching } = useQuery<{ clients: Client[] }>({
    queryKey: ["client-search", debouncedValue],
    queryFn: () => {
      if (!debouncedValue) return Promise.resolve({ clients: [] });

      return fetch(
        `/api/clients/search?q=${encodeURIComponent(debouncedValue)}`,
      ).then((res) => {
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        return res.json();
      });
    },
    enabled: debouncedValue.length > 0,
  });

  return { data, isFetching };
}

export function useDefaultClientSearch() {
  const { data: defaultData } = useQuery<{ clients: Client[] }>({
    queryKey: ["client-search", ""],
    queryFn: async () => {
      return fetch("/api/clients/search?q=").then((res) => {
        if (!res.ok) {
          console.error("Error fetching default data: ", res.text);
          throw new Error("Network response was not ok");
        }
        return res.json();
      });
    },
  });

  return { defaultData };
}
