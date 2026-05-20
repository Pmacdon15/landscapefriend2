"use client";

import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { parseISO } from "date-fns";
import { Suspense, startTransition, use, useOptimistic, useState } from "react";
import { ImageViewer } from "@/components/clients/image-viewer";
import { ServiceEmptyState } from "@/components/service/ServiceEmptyState";
import { ServiceHeader } from "@/components/service/ServiceHeader";
import { ServiceListItem } from "@/components/service/ServiceListItem";
import { ServiceSearchBar } from "@/components/service/ServiceSearchBar";
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

  const [viewingImage, setViewingImage] = useState<SiteMap | null>(null);

  const currentUserId = use(currentUserIdPromise);
  const isAdmin = use(isAdminPromise);
  let defaultDate = use(datePromise);
  const initialClients = use(clientsPromise);
  const initialSearch = use(searchPromise);
  const initialClientId = use(clientIdPromise);
  const currentFilterUserId = use(userIdPromise);
  const members = use(membersPromise);

  if (defaultDate === null)
    defaultDate = new Date().toLocaleDateString("en-CA");

  const [date, setDate] = useState<Date>(parseISO(defaultDate));

  // Flatten clients into CutListItems for the UI list
  const flatCuts = initialClients.flatMap((client) =>
    (client.addresses ?? []).map((address) => ({
      client: { id: client.id, name: client.name },
      address,
    })),
  );

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
                return {
                  ...item,
                  address: {
                    ...item.address,
                    completed_job: {
                      id: "pending",
                      address_id: action.addressId,
                      org_id: "",
                      service_type: action.serviceType as "grass" | "snow",
                      assigned_to:
                        item.address.assignment?.user_id ||
                        item.address.assigned_to ||
                        null,
                      completed_by: action.currentUserId,
                      completed_at: action.timestamp,
                      scheduled_date: action.scheduledDate,
                      notes: null,
                      created_at: new Date(),
                      updated_at: new Date(),
                    },
                  },
                } as CutListItem;
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

  const parsedDefaultDate = parseISO(defaultDate);
  if (date.getTime() !== parsedDefaultDate.getTime()) {
    setDate(parsedDefaultDate);
  }

  const onDragEnd = (result: DropResult) => {
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

  const totalServices = optimisticState.cuts.filter(
    (item) => item.address.schedule?.frequency !== "daily",
  ).length;
  const completedServices = optimisticState.cuts.filter(
    (item) =>
      !!item.address.completed_job &&
      item.address.schedule?.frequency !== "daily",
  ).length;
  const remainingServices = totalServices - completedServices;

  return (
    <div className="space-y-6">
      <ServiceHeader
        date={date}
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
              date={date}
              userId={currentFilterUserId}
            />
          </Suspense>
        }
      />

      <div className="max-w-4xl mx-auto">
        {optimisticState.cuts.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="cut-list-droppable">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {optimisticState.cuts.map((item, index) => (
                    <div
                      key={item.address.id}
                      id={`address-${item.address.id}`}
                    >
                      <ServiceListItem
                        isAdmin={isAdmin}
                        item={item}
                        index={index}
                        date={date}
                        currentUserId={currentUserId}
                        onCompleteOptimistic={(params) =>
                          dispatch({ type: "complete", ...params })
                        }
                        onViewPhoto={setViewingImage}
                      />
                    </div>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <ServiceEmptyState
            date={date}
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
