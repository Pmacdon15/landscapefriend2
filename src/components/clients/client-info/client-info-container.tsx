"use client";
import { Suspense, use, useOptimistic } from "react";
import type { Client, OptimisticAction } from "@/types/types";
import { AddClientModal } from "../add-client-modal";
import { ClientCard } from "../client-card";
import { ClientSearchBar } from "../client-search-bar";

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
    (
      state,
      action: OptimisticAction | { type: "update-search"; value: string },
    ) => {
      switch (action.type) {
        case "optimistic-search":
          return { ...state, clients: action.clients };
        case "update-search":
          return { ...state, searchValue: action.value };
        case "add-client":
          return {
            clients: [action.client],
            searchValue: action.client.name,
          };
        case "edit-client":
          return {
            ...state,
            clients: state.clients.map((c) =>
              c.id === action.client.id ? action.client : c,
            ),
          };
        case "delete-client": {
          const remainingClients = state.clients.filter(
            (c) => c.id !== action.clientId,
          );

          if (remainingClients.length === 0 && action.defaultClients) {
            return {
              ...state,
              clients: action.defaultClients,
              searchValue: "",
            };
          }

          return {
            ...state,
            clients: remainingClients,
            searchValue: remainingClients.length === 0 ? "" : state.searchValue,
          };
        }
        case "update-assignee":
          return {
            ...state,
            clients: state.clients.map((client) => ({
              ...client,
              addresses: client.addresses?.map((address) => {
                if (address.id !== action.addressId) return address;
                return {
                  ...address,
                  assigned_to: action.userId,
                  assignment: action.userId
                    ? {
                        id: "optimistic",
                        address_id: action.addressId,
                        user_id: action.userId,
                        org_id: client.org_id,
                        scheduled_date: new Date().toISOString(),
                      }
                    : null,
                };
              }),
            })),
          };
        case "update-schedule":
          return {
            ...state,
            clients: state.clients.map((client) => ({
              ...client,
              addresses: client.addresses?.map((address) => {
                if (address.id !== action.addressId) return address;
                return {
                  ...address,
                  schedule: {
                    id: address.schedule?.id || "optimistic",
                    address_id: action.addressId,
                    frequency: action.frequency,
                    first_cut_date: action.firstCutDate,
                    day_of_week: address.schedule?.day_of_week ?? null,
                    notes: action.notes || null,
                  },
                };
              }),
            })),
          };
        case "delete-schedule": {
          return {
            ...state,
            clients: state.clients.map((client) => {
              return {
                ...client,
                addresses: client.addresses?.map((address) => {
                  if (address.id !== action.addressId) return address;
                  return { ...address, schedule: null };
                }),
              };
            }),
          };
        }
        case "add-one-time-service":
          return {
            ...state,
            clients: state.clients.map((client) => ({
              ...client,
              addresses: client.addresses?.map((address) => {
                if (address.id !== action.addressId) return address;
                const currentList = address.one_time_services || [];
                return {
                  ...address,
                  one_time_services: [...currentList, action.service],
                };
              }),
            })),
          };
        case "delete-one-time-service":
          return {
            ...state,
            clients: state.clients.map((client) => ({
              ...client,
              addresses: client.addresses?.map((address) => {
                if (address.id !== action.addressId) return address;
                const currentList = address.one_time_services || [];
                return {
                  ...address,
                  one_time_services: currentList.filter((s) => s.id !== action.serviceId),
                };
              }),
            })),
          };
        default:
          return state;
      }
    },
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
