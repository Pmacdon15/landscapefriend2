"use client";

import { use } from "react";
import type { Client } from "@/types/types";
import { AddClientModal } from "../add-client-modal";
import { ClientCard } from "../client-card";

export default function ClientInfoContainer({
  clientsPromise,
  membersPromise,
}: {
  clientsPromise: Promise<Client[]>;
  membersPromise: Promise<{ id: string; name: string }[]>;
}) {
  const paginatedClients = use(clientsPromise);
  const members = use(membersPromise);
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <div className="ml-auto">
        <AddClientModal members={members} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-10">
        {paginatedClients.map((client: Client) => (
          <ClientCard key={client.id} client={client} members={members} />
        ))}

        {paginatedClients.length === 0 && (
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
