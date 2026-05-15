"use client";

import { Draggable } from "@hello-pangea/dnd";
import { CheckCircle2, GripVertical, MapPin } from "lucide-react";
import { SiteMapContainer } from "@/components/clients/site-maps/site-map-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, getGoogleMapsUrl } from "@/lib/utils";
import type { CutListItem } from "@/types/types";
import type { SiteMap } from "@/zod/schemas";

interface ServiceListItemProps {
  item: CutListItem;
  index: number;
  isCompleting: boolean;
  onMarkComplete: (addressId: string) => void;
  onViewPhoto: (siteMap: SiteMap) => void;
  isAdmin: boolean;
}

export function ServiceListItem({
  item,
  index,
  isCompleting,
  onMarkComplete,
  onViewPhoto,
  isAdmin,
}: ServiceListItemProps) {
  const { client, address } = item;

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
                <div className="space-y-3">
                  <div>
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {client.name}
                      </span>
                      <span className="text-sm font-medium text-primary capitalize">
                        {address.schedule?.frequency} Service
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
                    <div className="mt-2">
                      <SiteMapContainer address={address} isAdmin={isAdmin} />
                    </div>
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
                  <Button
                    variant="outline"
                    className="shrink-0 gap-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                    disabled={isCompleting}
                    onClick={() => onMarkComplete(address.id)}
                  >
                    {isCompleting ? (
                      "Completing..."
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
