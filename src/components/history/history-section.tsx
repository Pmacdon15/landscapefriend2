"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, use, useEffect, useOptimistic } from "react";

import { HistoryList } from "./history-list";
import PaginationButtons from "@/components/pagination-buttons";
import { Card, CardContent } from "@/components/ui/card";
import { PastServiceItem } from "@/dal/admin";


function getFilteredHistory(
  items: PastServiceItem[],
  searchVal: string,
  clientVal: string,
): PastServiceItem[] {
  return items.filter((item) => {
    if (clientVal && item.client_id !== clientVal) return false;
    if (searchVal) {
      const pattern = searchVal.toLowerCase();
      const clientNameMatch = item.client_name?.toLowerCase().includes(pattern);
      const streetMatch = item.street?.toLowerCase().includes(pattern);
      const cityMatch = item.city?.toLowerCase().includes(pattern);
      const compByMatch = item.completed_by_name
        ?.toLowerCase()
        .includes(pattern);
      const assToMatch = item.assigned_to_name?.toLowerCase().includes(pattern);
      const serviceMatch = item.service_type?.toLowerCase().includes(pattern);
      return (
        clientNameMatch ||
        streetMatch ||
        cityMatch ||
        compByMatch ||
        assToMatch ||
        serviceMatch
      );
    }
    return true;
  });
}

interface HistorySectionProps {
  historyPromise: Promise<{ data: PastServiceItem[]; totalPages: number }>;
  pagePromise: Promise<number>;
}

export function HistorySection({
  historyPromise,
  pagePromise,
}: HistorySectionProps) {
  const { data: history, totalPages } = use(historyPromise);
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";
  const clientId = searchParams.get("clientId") || "";

  const [optimisticHistory, setOptimisticHistory] = useOptimistic(
    history,
    (_state, action: { search: string; clientId: string }) => {
      return getFilteredHistory(history, action.search, action.clientId);
    },
  );

  // Trigger optimistic update whenever searchParams or base history array changes
  useEffect(() => {
    startTransition(() => {
      setOptimisticHistory({ search, clientId });
    });
  }, [search, clientId, setOptimisticHistory]);

  return (
    <div className="space-y-4" id="history-section">
      <h2 className="text-xl font-bold">Service History</h2>
      <Card>
        <CardContent className="p-0">
          <HistoryList history={optimisticHistory} />
        </CardContent>
      </Card>
      <PaginationButtons
        pagePromise={pagePromise}
        totalPagesPromise={Promise.resolve(totalPages)}
        hash="history-section"
      />
    </div>
  );
}
