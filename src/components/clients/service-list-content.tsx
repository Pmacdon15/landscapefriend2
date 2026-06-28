"use client";

import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  startTransition,
  use,
  useEffect,
  useOptimistic,
  useState,
} from "react";
import { ImageViewer } from "@/components/clients/image-viewer";
import { ServiceEmptyState } from "@/components/service/ServiceEmptyState";
import { ServiceHeader } from "@/components/service/ServiceHeader";
import { ServiceListItem } from "@/components/service/ServiceListItem";
import { ServiceSearchBar } from "@/components/service/ServiceSearchBar";
import { cn } from "@/lib/utils";
import { useUpdateRouteOrder } from "@/mutations/routes";
import type { CutListItem, OptimisticServiceAction } from "@/types/types";
import type { Client, SiteMap } from "@/zod/schemas";

interface ServiceListContentProps {
  isAdminPromise: Promise<boolean>;
  clientsPromise: Promise<Client[]>;
  datePromise: Promise<string | null>;
  userIdPromise: Promise<string>;
  searchPromise: Promise<string>;
  clientIdPromise: Promise<string>;
  membersPromise: Promise<{ id: string; name: string }[]>;
  currentUserIdPromise: Promise<string>;
}

export function ServiceListContent({
  isAdminPromise,
  clientsPromise,
  datePromise,
  userIdPromise,
  searchPromise,
  clientIdPromise,
  membersPromise,
  currentUserIdPromise,
}: ServiceListContentProps) {
  const { mutate: updateRouteOrder } = useUpdateRouteOrder();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewingImage, setViewingImage] = useState<SiteMap | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "incomplete"
  >("all");

  const currentUserId = use(currentUserIdPromise);
  const isAdmin = use(isAdminPromise);
  const dateParam = use(datePromise);
  const initialClients = use(clientsPromise);
  const initialSearch = use(searchPromise);
  const initialClientId = use(clientIdPromise);
  const currentFilterUserId = use(userIdPromise);
  const members = use(membersPromise);

  useEffect(() => {
    if (dateParam === null) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", dateParam ?? new Date().toLocaleDateString("en-CA"));
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [router, searchParams, dateParam]);

  // Flatten clients into CutListItems for the UI list (separated recurring and one-time tasks, filtered by assignee if not showing all)
  const _targetDate = parseISO(
    dateParam ?? new Date().toLocaleDateString("en-CA"),
  );
  const flatCuts: CutListItem[] = [];

  const isFilterAll = isAdmin
    ? currentFilterUserId === "all" || !currentFilterUserId
    : false;
  const activeFilterUserId = isFilterAll
    ? null
    : isAdmin
      ? currentFilterUserId
      : currentUserId;

  for (const client of initialClients) {
    for (const address of client.addresses ?? []) {
      const hasRecurringDue = !!address.is_recurring_due;

      if (hasRecurringDue) {
        const recurringAssignee =
          address.assignment?.user_id || address.assigned_to || null;
        const isUserAssigned =
          isFilterAll ||
          (activeFilterUserId && recurringAssignee === activeFilterUserId);

        if (isUserAssigned) {
          flatCuts.push({
            client: { id: client.id, name: client.name },
            address,
          });
        }
      }

      if (address.one_time_services) {
        for (const ots of address.one_time_services) {
          const isUserInCrew =
            isFilterAll ||
            (activeFilterUserId &&
              ots.assigned_member_ids?.includes(activeFilterUserId));

          if (isUserInCrew) {
            flatCuts.push({
              client: { id: client.id, name: client.name },
              address,
              otsId: ots.id,
            });
          }
        }
      }
    }
  }

  const getInitialSearchValue = () => {
    if (initialClientId) {
      const selectedItem = flatCuts.find(
        (i) => i.client.id === initialClientId,
      );
      if (selectedItem) return selectedItem.client.name;
    }
    return initialSearch;
  };

  const [optimisticState, dispatch] = useOptimistic(
    { cuts: flatCuts, searchValue: getInitialSearchValue() },
    (state, action: OptimisticServiceAction) => {
      switch (action.type) {
        case "reorder":
          return { ...state, cuts: action.cuts };
        case "complete":
          return {
            ...state,
            cuts: state.cuts.map((item) => {
              if (item.address.id === action.addressId) {
                const pendingJob = {
                  id: "pending",
                  address_id: action.addressId,
                  org_id: "",
                  service_type: action.serviceType,
                  assigned_to:
                    item.address.assignment?.user_id ||
                    item.address.assigned_to ||
                    null,
                  completed_by: action.currentUserId,
                  completed_at: action.timestamp,
                  scheduled_date: action.scheduledDate,
                  notes: null,
                  one_time_service_id: action.oneTimeServiceId || null,
                  created_at: new Date(),
                  updated_at: new Date(),
                };

                if (action.oneTimeServiceId) {
                  if (item.otsId === action.oneTimeServiceId) {
                    return {
                      ...item,
                      address: {
                        ...item.address,
                        one_time_services:
                          item.address.one_time_services?.map((ots) =>
                            ots.id === action.oneTimeServiceId
                              ? {
                                  ...ots,
                                  completed_job_id: "pending",
                                  completed_job: pendingJob,
                                }
                              : ots,
                          ) || [],
                      },
                    } as CutListItem;
                  }
                } else {
                  if (!item.otsId) {
                    return {
                      ...item,
                      address: {
                        ...item.address,
                        completed_job: pendingJob,
                      },
                    } as CutListItem;
                  }
                }
              }
              return item;
            }),
          };
        case "update-search":
          return { ...state, searchValue: action.value };
        case "select-client":
          return { ...state, searchValue: action.value, cuts: action.cuts };
        default:
          return state;
      }
    },
  );

  const parsedDefaultDate = parseISO(
    dateParam ?? new Date().toLocaleDateString("en-CA"),
  );

  const onDragStart = () => {
    if (typeof document !== "undefined") {
      document.getElementById("service-list-container")?.classList.add("dragging-active");
      document.documentElement.style.scrollBehavior = "auto";
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (typeof document !== "undefined") {
      document.getElementById("service-list-container")?.classList.remove("dragging-active");
      document.documentElement.style.scrollBehavior = "";
    }

    if (statusFilter !== "all") return;
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const newCuts = Array.from(optimisticState.cuts);
    const [moved] = newCuts.splice(sourceIndex, 1);
    newCuts.splice(destIndex, 0, moved);

    let newSortOrder = 0;
    if (destIndex === 0) {
      newSortOrder = (newCuts[1]?.address.sort_order ?? 1000) - 1000;
    } else if (destIndex === newCuts.length - 1) {
      newSortOrder =
        (newCuts[newCuts.length - 2]?.address.sort_order ?? 0) + 1000;
    } else {
      const prev = newCuts[destIndex - 1].address.sort_order;
      const next = newCuts[destIndex + 1].address.sort_order;
      newSortOrder =
        prev === next
          ? prev + (destIndex > sourceIndex ? 10 : -10)
          : (prev + next) / 2;
    }

    moved.address.sort_order = newSortOrder;
    startTransition(() => {
      dispatch({ type: "reorder", cuts: newCuts });
      updateRouteOrder({ addressId: moved.address.id, newSortOrder });
    });
  };

  const isCardCompleted = (item: CutListItem) => {
    if (item.otsId) {
      const ots = item.address.one_time_services?.find(
        (o) => o.id === item.otsId,
      );
      return !!ots?.completed_job;
    }
    return !!item.address.completed_job;
  };

  const totalServices = optimisticState.cuts.length;
  const completedServices = optimisticState.cuts.filter(isCardCompleted).length;
  const remainingServices = totalServices - completedServices;

  const filteredCuts = optimisticState.cuts.filter((item) => {
    const isCompleted = isCardCompleted(item);
    if (statusFilter === "completed") return isCompleted;
    if (statusFilter === "incomplete") return !isCompleted;
    return true;
  });

  return (
    <div className="space-y-6">
      <ServiceHeader
        date={parsedDefaultDate}
        isAdmin={isAdmin}
        members={members}
        currentFilterUserId={currentFilterUserId}
        currentUserId={currentUserId ?? ""}
        stats={{
          total: totalServices,
          completed: completedServices,
          remaining: remainingServices,
        }}
        searchComponent={
          <Suspense>
            <ServiceSearchBar
              items={optimisticState.cuts}
              optimisticValue={optimisticState.searchValue}
              setOptimistic={dispatch}
              date={parsedDefaultDate}
              userId={currentFilterUserId}
            />
          </Suspense>
        }
      />

      <div id="service-list-container" className="max-w-4xl mx-auto space-y-4">
        {/* Client-side Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer",
                statusFilter === "all"
                  ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-sm scale-[1.02]"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              <span>All</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold transition-all",
                  statusFilter === "all"
                    ? "bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                )}
              >
                {totalServices}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("incomplete")}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer",
                statusFilter === "incomplete"
                  ? "bg-amber-600 border-amber-600 text-white dark:bg-amber-500 dark:border-amber-500 shadow-sm scale-[1.02]"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              <span>Incomplete</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold transition-all",
                  statusFilter === "incomplete"
                    ? "bg-white/20 text-white dark:bg-amber-950/20 dark:text-amber-950"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
                )}
              >
                {remainingServices}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer",
                statusFilter === "completed"
                  ? "bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500 shadow-sm scale-[1.02]"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              <span>Completed</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold transition-all",
                  statusFilter === "completed"
                    ? "bg-white/20 text-white dark:bg-emerald-950/20 dark:text-emerald-955"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
                )}
              >
                {completedServices}
              </span>
            </button>
          </div>

          {statusFilter !== "all" && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              Drag-to-reorder is disabled while filtering
            </span>
          )}
        </div>

        {optimisticState.cuts.length > 0 ? (
          filteredCuts.length > 0 ? (
            <DragDropContext
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              autoScrollerOptions={{
                startFromPercentage: 0.25, // Start auto-scrolling when within 25% of container/screen edge
                maxScrollAtPercentage: 0.05, // Reach max scroll speed when within 5% of edge
                maxPixelScroll: 28, // Increase maximum scroll speed to be fast and responsive
              }}
            >
              <Droppable droppableId="cut-list-droppable">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {filteredCuts.map((item, index) => (
                      <div
                        key={
                          item.otsId
                            ? `ots-${item.otsId}`
                            : `recurring-${item.address.id}`
                        }
                        id={
                          item.otsId
                            ? `address-ots-${item.otsId}`
                            : `address-recurring-${item.address.id}`
                        }
                      >
                        <ServiceListItem
                          isAdmin={isAdmin}
                          item={item}
                          index={index}
                          date={parsedDefaultDate}
                          currentUserId={currentUserId}
                          members={members}
                          onCompleteOptimistic={(params) =>
                            dispatch({ type: "complete", ...params })
                          }
                          onViewPhoto={setViewingImage}
                          setOptimistic={dispatch}
                          allCuts={flatCuts}
                          isDragDisabled={statusFilter !== "all"}
                        />
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="text-center py-16 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              <h3 className="text-lg font-semibold mb-1">
                {statusFilter === "completed"
                  ? "No completed services"
                  : "All services completed!"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter === "completed"
                  ? "There are no completed services for this date."
                  : "Great job! All assigned services for this date have been completed."}
              </p>
            </div>
          )
        ) : (
          <ServiceEmptyState
            date={parsedDefaultDate}
            currentFilterUserId={currentFilterUserId}
          />
        )}
      </div>

      <ImageViewer
        isAdmin={isAdmin}
        viewingImage={viewingImage}
        onClose={() => setViewingImage(null)}
      />
    </div>
  );
}
