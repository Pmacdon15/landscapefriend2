"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { format, isSameDay, parseISO } from "date-fns";
import { CalendarIcon, CheckCircle2, GripVertical, MapPin } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Address, Client } from "@/dal/clients";
import { cn } from "@/lib/utils";
import { useCompleteJob } from "@/mutations/jobs";
import { useUpdateRouteOrder } from "@/mutations/routes";

interface CutListContentProps {
  initialClients: Client[];
  defaultDate?: string;
  members: { id: string; name: string }[];
  currentUserId: string | null;
}

export function CutListContent({
  initialClients,
  defaultDate,
  currentUserId,
}: Omit<CutListContentProps, "members">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: updateRouteOrder } = useUpdateRouteOrder();
  const { mutate: completeJob, isPending: isCompleting } = useCompleteJob();

  // Hydration safety for DnD
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Parse initial date from URL or default to today
  const [date, setDate] = useState<Date>(
    defaultDate ? parseISO(defaultDate) : new Date(),
  );

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", format(newDate, "yyyy-MM-dd"));
      router.push(`/client-cut-list?${params.toString()}`);
    }
  };

  // Filter clients and addresses based on the selected date AND assignment to current user
  const cutsForDay = useMemo(() => {
    const results: Array<{ client: Client; address: Address }> = [];

    initialClients.forEach((client: Client) => {
      if (!client.addresses) return;

      client.addresses.forEach((address: Address) => {
        if (!address.schedule) return;

        const scheduleDate = new Date(address.schedule.next_cut_date);

        // Check if job is scheduled for this day
        const isScheduled =
          isSameDay(scheduleDate, date) ||
          address.schedule.day_of_week === date.getDay();

        if (!isScheduled) return;

        // NEW: Access Control - Only show if assigned to current user
        // Priority: Daily Override (assignment) > Default Assignee (assigned_to)
        const assigneeId = address.assignment?.user_id || address.assigned_to;

        if (assigneeId === currentUserId) {
          results.push({ client, address });
        }
      });
    });

    // Initial sort by the absolute sort_order
    return results.sort(
      (a, b) => (a.address.sort_order ?? 0) - (b.address.sort_order ?? 0),
    );
  }, [initialClients, date, currentUserId]);

  // Local state for optimistic updates during drag and drop
  const [localCuts, setLocalCuts] = useState(cutsForDay);

  useEffect(() => {
    setLocalCuts(cutsForDay);
  }, [cutsForDay]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const newCuts = Array.from(localCuts);
    const [moved] = newCuts.splice(sourceIndex, 1);
    newCuts.splice(destIndex, 0, moved);

    // Calculate new LexoRank float order
    let newSortOrder = 0;
    if (destIndex === 0) {
      // Dropped at the very top
      newSortOrder = (newCuts[1]?.address.sort_order ?? 1000) - 1000;
    } else if (destIndex === newCuts.length - 1) {
      // Dropped at the very bottom
      newSortOrder =
        (newCuts[newCuts.length - 2]?.address.sort_order ?? 0) + 1000;
    } else {
      // Dropped in between two items
      const prevOrder = newCuts[destIndex - 1].address.sort_order ?? 0;
      const nextOrder = newCuts[destIndex + 1].address.sort_order ?? 0;
      newSortOrder = (prevOrder + nextOrder) / 2;
    }

    // Optimistically update local state
    moved.address.sort_order = newSortOrder;
    setLocalCuts(newCuts);

    // Fire background mutation to persist to DB
    updateRouteOrder({
      addressId: moved.address.id,
      newSortOrder,
    });
  };

  if (!isMounted) return null; // Avoid hydration mismatch with DnD

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 gap-4">
        <h2 className="text-xl font-semibold">
          Showing cuts for:{" "}
          <span className="text-primary">{format(date, "PPPP")}</span>
        </h2>

        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="max-w-4xl mx-auto">
        {localCuts.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="cut-list-droppable">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {localCuts.map(({ client, address }, index) => (
                    <Draggable
                      key={address.id}
                      draggableId={address.id}
                      index={index}
                    >
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
                              {/* Drag Handle */}
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

                                    <div className="flex items-start gap-2 mt-2 text-slate-600 dark:text-slate-400">
                                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                      <span className="text-sm leading-tight">
                                        {address.street}
                                        <br />
                                        {address.city}, {address.state}{" "}
                                        {address.zip}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {address.completed_job ? (
                                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span>Completed</span>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    className="shrink-0 gap-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                                    disabled={isCompleting}
                                    onClick={() =>
                                      completeJob({
                                        addressId: address.id,
                                        serviceType: "grass",
                                        assignedTo:
                                          address.assignment?.user_id ||
                                          address.assigned_to ||
                                          null,
                                      })
                                    }
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
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <h3 className="text-xl font-semibold mb-2">
              No cuts assigned to you
            </h3>
            <p className="text-muted-foreground">
              You have no clients assigned for service on{" "}
              {format(date, "MMM do, yyyy")}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
