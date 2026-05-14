"use client";
import { use, useOptimistic } from "react";
import type { Client, OptimisticAction, Schedule } from "@/types/types";
import { AddClientModal } from "../add-client-modal";
import { ClientCard } from "../client-card";
import { ClientSearchBar } from "../client-search-bar";

export default function ClientInfoContainer({
  clientsPromise,
  membersPromise,
}: {
  clientsPromise: Promise<Client[]>;
  membersPromise: Promise<{ id: string; name: string }[]>;
}) {
  const initialClients = use(clientsPromise);
  const members = use(membersPromise);

  const [optimisticClients, setOptimistic] = useOptimistic(
    initialClients,
    (state: Client[], action: OptimisticAction) => {
      switch (action.type) {
        case "optimistic-search":
          return action.clients;
        case "add-client":
          return [action.client, ...state];
        case "edit-client":
          return state.map((c) =>
            c.id === action.client.id ? action.client : c,
          );
        case "delete-client":
          return state.filter((c) => c.id !== action.clientId);
        case "update-assignee":
        case "update-schedule":
        case "delete-schedule":
          return state.map((client) => {
            if (!client.addresses) return client;

            const hasTargetAddress = client.addresses.some(
              (a) => a.id === action.addressId,
            );
            if (!hasTargetAddress) return client;

            return {
              ...client,
              addresses: client.addresses.map((address) => {
                if (address.id !== action.addressId) return address;

                if (action.type === "update-assignee") {
                  return { ...address, assigned_to: action.userId };
                }

                if (action.type === "update-schedule") {
                  const newSchedule: Schedule = {
                    id: address.schedule?.id || crypto.randomUUID(),
                    address_id: address.id,
                    frequency: action.frequency,
                    first_cut_date: action.firstCutDate,
                    day_of_week: action.firstCutDate.getDay(),
                  };
                  return { ...address, schedule: newSchedule };
                }

                if (action.type === "delete-schedule") {
                  return { ...address, schedule: null };
                }

                return address;
              }),
            };
          });
        default:
          return state;
      }
    },
  );

  return (
    <div className="w-full flex flex-col md:p-4 gap-4">
      <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4">
        <ClientSearchBar setOptimistic={setOptimistic} />
        <div className="ml-auto">
          <AddClientModal members={members} setOptimistic={setOptimistic} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-10">
        {optimisticClients.map((client: Client) => (
          <ClientCard
            key={client.id}
            client={client}
            members={members}
            setOptimistic={setOptimistic}
          />
        ))}

        {optimisticClients.length === 0 && (
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
