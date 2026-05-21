"use client";

import {
  Suspense,
  startTransition,
  use,
  useEffect,
  useOptimistic,
} from "react";
import PaginationButtons from "@/components/pagination-buttons";
import { Card, CardContent } from "@/components/ui/card";
import type { PastServiceItem } from "@/dal/admin";
import type { Client } from "@/types/types";
import { ClientSchedulesCard } from "./client-schedules-card";
import { HistoryList } from "./history-list";
import { HistorySearchBar } from "./history-search-bar";

interface HistoryContainerProps {
  historyPromise: Promise<{ data: PastServiceItem[]; totalPages: number }>;
  pagePromise: Promise<number>;
  clientPromise: Promise<Client | null>;
  searchPromise: Promise<string>;
  membersPromise: Promise<{ id: string; name: string }[]>;
}

export function HistoryContainer({
  historyPromise,
  pagePromise,
  clientPromise,
  searchPromise,
  membersPromise,
}: HistoryContainerProps) {
  const { data: history, totalPages } = use(historyPromise);
  const client = use(clientPromise);
  const search = use(searchPromise);
  const members = use(membersPromise);

  const getInitialSearchValue = () => {
    if (client) return client.name;
    return search;
  };

  const [optimisticState, dispatch] = useOptimistic(
    {
      history,
      searchValue: getInitialSearchValue(),
      client,
    },
    (
      state,
      action:
        | { type: "update-search"; value: string }
        | { type: "select-client"; client: Client }
        | { type: "clear-search"; defaultHistory?: PastServiceItem[] },
    ) => {
      switch (action.type) {
        case "update-search": {
          return {
            ...state,
            searchValue: action.value,
            client: null,
          };
        }
        case "select-client": {
          return {
            ...state,
            searchValue: action.client.name,
            client: action.client,
            history: history.filter((item) => item.client_id === action.client.id),
          };
        }
        case "clear-search": {
          return {
            ...state,
            history: action.defaultHistory || history,
            searchValue: "",
            client: null,
          };
        }
        default:
          return state;
      }
    },
  );

  // Sync state if server data refreshes
  useEffect(() => {
    startTransition(() => {
      if (client) {
        dispatch({
          type: "select-client",
          client,
        });
      } else if (search) {
        dispatch({ type: "update-search", value: search });
      } else {
        dispatch({ type: "clear-search" });
      }
    });
  }, [search, client, dispatch]);

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <HistorySearchBar
          setOptimistic={dispatch}
          optimisticValue={optimisticState.searchValue}
          members={members}
        />

        {optimisticState.client && (
          <ClientSchedulesCard
            clientPromise={Promise.resolve(optimisticState.client)}
            membersPromise={Promise.resolve(members)}
          />
        )}
      </div>

      <div className="space-y-4" id="history-section">
        <h2 className="text-xl font-bold">Service History</h2>
        <Card>
          <CardContent className="p-0">
            <HistoryList history={optimisticState.history} />
          </CardContent>
        </Card>
        <Suspense>
          <PaginationButtons
            pagePromise={pagePromise}
            totalPagesPromise={Promise.resolve(totalPages)}
            hash="history-section"
          />
        </Suspense>
      </div>
    </div>
  );
}
