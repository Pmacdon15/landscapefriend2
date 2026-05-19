"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ClientCardProps } from "@/types/types";
import type { SiteMap } from "@/zod/schemas";
import { AddressList } from "./client-card-components/AddressList";
import { ClientCardContact } from "./client-card-components/ClientCardContact";
import { ClientCardHeader } from "./client-card-components/ClientCardHeader";
import { PhotoViewer } from "./client-card-components/PhotoViewer";

export function ClientCard({
  client,
  members,
  setOptimistic,
  isAdmin,
  clientIdPromise,
  searchPromise,
  isLastClient,
}: ClientCardProps) {
  const [viewingSiteMap, setViewingSiteMap] = useState<SiteMap | null>(null);
  const addresses = client.addresses || [];

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <ClientCardHeader
        client={client}
        members={members}
        setOptimistic={setOptimistic}
        clientIdPromise={clientIdPromise}
        searchPromise={searchPromise}
        isLastClient={isLastClient}
      />
      <CardContent className="pt-4 grid gap-4">
        <ClientCardContact email={client.email} phone={client.phone} />
        <AddressList
          isAdmin={isAdmin}
          addresses={addresses}
          members={members}
          setOptimistic={setOptimistic}
          onViewPhoto={setViewingSiteMap}
        />
      </CardContent>

      <PhotoViewer
        viewingSiteMap={viewingSiteMap}
        onClose={() => setViewingSiteMap(null)}
      />
    </Card>
  );
}
