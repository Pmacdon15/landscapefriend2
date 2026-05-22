"use client";

import { Draggable } from "@hello-pangea/dnd";
import {
  CheckCircle2,
  GripVertical,
  Info,
  MapPin,
  Snowflake,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import { SiteMapContainer } from "@/components/clients/site-maps/site-map-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, getGoogleMapsUrl } from "@/lib/utils";
import type { CutListItem, OptimisticServiceAction } from "@/types/types";
import type { SiteMap } from "@/zod/schemas";
import { CompleteJobButton } from "./CompleteJobButton";

interface ServiceListItemProps {
  item: CutListItem;
  index: number;
  onViewPhoto: (siteMap: SiteMap) => void;
  isAdmin: boolean;
  date: Date;
  currentUserId: string | null;
  onCompleteOptimistic: (params: {
    addressId: string;
    timestamp: Date;
    currentUserId: string;
    serviceType: "grass" | "snow";
    scheduledDate: Date;
  }) => void;
  setOptimistic?: (action: OptimisticServiceAction) => void;
  allCuts?: CutListItem[];
}

export function ServiceListItem({
  item,
  index,
  onViewPhoto,
  isAdmin,
  date,
  currentUserId,
  onCompleteOptimistic,
  setOptimistic,
  allCuts,
}: ServiceListItemProps) {
  const { client, address } = item;
  const isSnow = address.schedule?.frequency === "daily";
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClientClick = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.set("clientId", client.id);
    startTransition(() => {
      if (setOptimistic && allCuts) {
        setOptimistic({
          type: "select-client",
          value: client.name,
          cuts: allCuts.filter((c) => c.client.id === client.id),
        });
      }
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <Draggable draggableId={address.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "border border-slate-200 dark:border-slate-800 transition-colors",
            snapshot.isDragging
              ? "bg-slate-50 dark:bg-slate-800 shadow-lg ring-1 ring-primary"
              : "bg-white dark:bg-slate-900 shadow-sm",
          )}
        >
          <CardContent className="p-0">
            <div className="flex items-center">
              <div
                {...provided.dragHandleProps}
                className="p-4 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors"
              >
                <GripVertical className="h-6 w-6" />
              </div>

              <div className="flex-1 py-4 pr-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={handleClientClick}
                          className="text-lg font-bold text-slate-900 dark:text-white hover:text-primary transition-colors text-left w-fit"
                        >
                          {client.name}
                        </button>
                        <span
                          className={cn(
                            "text-sm font-medium capitalize flex items-center gap-1.5",
                            isSnow
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-primary",
                          )}
                        >
                          {isSnow && <Snowflake className="h-3.5 w-3.5" />}
                          {isSnow
                            ? "Snow (As Needed)"
                            : `${address.schedule?.frequency} Service`}
                        </span>
                      </div>

                      <a
                        href={getGoogleMapsUrl(address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 mt-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors group"
                      >
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-sm leading-tight underline-offset-4 group-hover:underline">
                          {address.street}
                          <br />
                          {address.city}, {address.state} {address.zip}
                        </span>
                      </a>
                    </div>

                    {address.schedule?.notes && (
                      <div className="flex-1 max-w-md bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 rounded-lg p-3 self-center">
                        <div className="flex items-start gap-2.5">
                          <Info className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                            {address.schedule.notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <SiteMapContainer address={address} isAdmin={isAdmin} />
                  </div>
                </div>

                {address.completed_job ? (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Completed</span>
                    </div>
                    {address.completed_job.photos?.[0] && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs h-auto p-0 text-slate-500 hover:text-primary"
                        onClick={() => {
                          const photo = address.completed_job?.photos?.[0];
                          if (!photo) return;
                          onViewPhoto({
                            id: photo.id,
                            address_id: address.id,
                            blob_path: photo.blob_path,
                            map_data: null,
                            name: "Completion Photo",
                            created_at: photo.created_at
                              ? new Date(photo.created_at)
                              : new Date(),
                          });
                        }}
                      >
                        View Photo
                      </Button>
                    )}
                  </div>
                ) : (
                  <CompleteJobButton
                    address={address}
                    date={date}
                    currentUserId={currentUserId}
                    onCompleteOptimistic={onCompleteOptimistic}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
