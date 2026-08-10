"use client";
import { Suspense, use, useOptimistic } from "react";
import type { Client } from "@/types/types";
import { AddClientModal } from "../add-client-modal";
import { ClientCard } from "../client-card";
import { ClientSearchBar } from "../client-search-bar";
import { clientInfoReducer } from "@/utils/client-reducers";

export default function ClientInfoContainer({
  clientsPromise,
  membersPromise,
  isAdminPromise,
  searchPromise,
  clientIdPromise,
}: {
  clientsPromise: Promise<Client[]>;
  membersPromise: Promise<{ id: string; name: string }[]>;
  isAdminPromise: Promise<boolean>;
  searchPromise: Promise<string>;
  clientIdPromise: Promise<string>;
}) {
  const initialClients = use(clientsPromise);
  const members = use(membersPromise);
  const isAdmin = use(isAdminPromise);
  const initialSearchValue = use(searchPromise);
  const initialClientId = use(clientIdPromise);

  const getInitialSearchValue = () => {
    if (initialClientId) {
      const selectedClient = initialClients.find(
        (c) => c.id === initialClientId,
      );
      if (selectedClient) return selectedClient.name;
    }
    return initialSearchValue;
  };

  const [optimisticState, setOptimistic] = useOptimistic(
    { clients: initialClients, searchValue: getInitialSearchValue() },
    clientInfoReducer,
  );

  return (
    <div className="w-full flex flex-col md:p-4 gap-4">
      <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4">
        <Suspense>
          <ClientSearchBar
            setOptimistic={setOptimistic}
            optimisticValue={optimisticState.searchValue}
          />
        </Suspense>
        <div className="ml-auto">
          <AddClientModal members={members} setOptimistic={setOptimistic} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-10">
        {optimisticState.clients.map((client: Client) => (
          <ClientCard
            isLastClient={optimisticState.clients.length < 2}
            key={client.id}
            isAdmin={isAdmin}
            client={client}
            members={members}
            setOptimistic={setOptimistic}
            clientIdPromise={clientIdPromise}
            searchPromise={searchPromise}
          />
        ))}

        {optimisticState.clients.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <h3 className="text-xl font-semibold mb-2">No clients found</h3>
            <p className="text-muted-foreground">
              Add a client to get started with scheduling.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
