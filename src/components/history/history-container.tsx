"use client";

import {
  Suspense,
  startTransition,
  use,
  useEffect,
  useOptimistic,
} from "react";
import PaginationButtons from "@/components/pagination-buttons";
import type { PastServiceItem } from "@/dal/admin";
import type { Client } from "@/types/types";
import { ClientSchedulesCard } from "../clients/client-schedules-card";
import { HistorySearchBar } from "./history-search-bar";
import { HistoryList } from "./history-list";

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
            history: history.filter(
              (item) => item.client_id === action.client.id,
            ),
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <HistorySearchBar
          setOptimistic={dispatch}
          optimisticValue={optimisticState.searchValue}
          members={members}
        />
      </div>

      {optimisticState.client && (
        <ClientSchedulesCard
          clientPromise={Promise.resolve(optimisticState.client)}
          membersPromise={Promise.resolve(members)}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Service History
          </h2>
          <span className="text-sm text-slate-500 font-medium">
            {history.length} records found
          </span>
        </div>
        <HistoryList
          history={optimisticState.history}
          setOptimistic={dispatch}
        />
        <Suspense>
          <PaginationButtons
            pagePromise={pagePromise}
            totalPagesPromise={Promise.resolve(totalPages)}
          />
        </Suspense>
      </div>
    </div>
  );
}
