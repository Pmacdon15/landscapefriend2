"use client";

import { useOptimistic } from "react";
import { ClientCard } from "@/components/clients/client-card";
import type { Client, OptimisticAction, Schedule } from "@/types/types";

export function SingleClientContainer({
  client,
  members,
}: {
  client: Client;
  members: { id: string; name: string }[];
}) {
  const [optimisticClient, setOptimistic] = useOptimistic(
    client,
    (state: Client, action: OptimisticAction) => {
      if (action.type === "edit-client") {
        return action.client;
      }
      if (
        action.type === "update-assignee" ||
        action.type === "update-schedule"
      ) {
        if (!state.addresses) return state;
        const hasTargetAddress = state.addresses.some(
          (a) => a.id === action.addressId,
        );
        if (!hasTargetAddress) return state;

        return {
          ...state,
          addresses: state.addresses.map((address) => {
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

            return address;
          }),
        };
      }
      return state;
    },
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <ClientCard
        client={optimisticClient}
        members={members}
        setOptimistic={setOptimistic as (action: OptimisticAction) => void}
      />
    </div>
  );
}
