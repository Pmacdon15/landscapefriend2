"use client";

import { Draggable } from "@hello-pangea/dnd";
import {
  CheckCircle2,
  GripVertical,
  Info,
  MapPin,
  Snowflake,
  CalendarDays,
  User,
  Wrench,
  Sprout,
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
  members?: { id: string; name: string }[];
  onCompleteOptimistic: (params: {
    addressId: string;
    timestamp: Date;
    currentUserId: string;
    serviceType: string;
    scheduledDate: Date;
    oneTimeServiceId?: string;
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
  members = [],
  onCompleteOptimistic,
  setOptimistic,
  allCuts,
}: ServiceListItemProps) {
  const { client, address } = item;
  const isSnow = address.schedule?.frequency === "daily";
  const router = useRouter();
  const searchParams = useSearchParams();

  // Find the specific one-time service if this card is dedicated to one
  const ots = item.otsId
    ? address.one_time_services?.find((o) => o.id === item.otsId)
    : null;
  const isOts = !!ots;
  
  const otsCompletedJob = ots?.completed_job;
  const recurringCompletedJob = address.completed_job && !address.completed_job.one_time_service_id ? address.completed_job : null;

  // Unified visual details for a single task card
  const title = isOts ? ots.name : (isSnow ? "Snow Clearing" : `${address.schedule?.frequency} Lawn Cut`);
  const serviceType = isOts ? ots.service_type : (isSnow ? "snow" : "grass");
  const notes = isOts ? ots.notes : address.schedule?.notes;
  const completedJobToUse = isOts ? otsCompletedJob : recurringCompletedJob;
  
  const isGrassType = serviceType === "grass";
  const isSnowType = serviceType === "snow";

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

  const draggableId = item.otsId ? `ots-${item.otsId}` : `recurring-${address.id}`;

  return (
    <Draggable draggableId={draggableId} index={index}>
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
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border w-fit",
                            isOts 
                              ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          )}>
                            <CalendarDays className="h-3.5 w-3.5" />
                            {isOts ? `One-Time: ${title}` : title}
                          </span>

                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border w-fit",
                            isGrassType && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
                            isSnowType && "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
                            serviceType === "spring-fall-cleanup" && "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
                            serviceType === "trimming" && "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border-violet-200 dark:border-violet-800",
                            serviceType === "other" && "bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                          )}>
                            {isGrassType && <Sprout className="h-3 w-3" />}
                            {isSnowType && <Snowflake className="h-3 w-3" />}
                            {serviceType === "spring-fall-cleanup" && <Sprout className="h-3 w-3" />}
                            {serviceType === "trimming" && <Wrench className="h-3 w-3" />}
                            {serviceType === "other" && <Wrench className="h-3 w-3" />}
                            {serviceType === "spring-fall-cleanup" ? "Spring/Fall Clean Up" : serviceType}
                          </span>
                        </div>
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

                      {/* Render Crew/Assignees */}
                      {isOts ? (
                        ots.assigned_member_ids && ots.assigned_member_ids.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 w-fit">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                              <User className="h-3.5 w-3.5 text-violet-500" /> Crew:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {ots.assigned_member_ids.map((memberId) => {
                                const memberName = members.find((m) => m.id === memberId)?.name || "Unknown Worker";
                                return (
                                  <span
                                    key={memberId}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50"
                                  >
                                    {memberName}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )
                      ) : (
                        (address.assignment?.user_id || address.assigned_to) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 w-fit">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                              <User className="h-3.5 w-3.5 text-primary" /> Assignee:
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {members.find((m) => m.id === (address.assignment?.user_id || address.assigned_to))?.name || "Assigned"}
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Render Notes */}
                    {notes && (
                      <div className="flex-1 max-w-md bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 rounded-lg p-3 self-center">
                        <div className="flex items-start gap-2.5">
                          <Info className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                            {notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <SiteMapContainer address={address} isAdmin={isAdmin} />
                  </div>
                </div>

                {/* Completion section */}
                <div className="shrink-0 self-start md:self-center">
                  {completedJobToUse ? (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Completed</span>
                      </div>
                      {completedJobToUse.photos?.[0] && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs h-auto p-0 text-slate-500 hover:text-primary"
                          onClick={() => {
                            const photo = completedJobToUse.photos?.[0];
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
                      oneTimeServiceId={isOts ? ots.id : undefined}
                      customServiceType={isOts ? ots.service_type : undefined}
                      onCompleteOptimistic={onCompleteOptimistic}
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
