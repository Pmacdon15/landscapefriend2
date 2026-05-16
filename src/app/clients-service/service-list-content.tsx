"use client";

import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import imageCompression from "browser-image-compression";
import { format, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, use, useOptimistic, useState } from "react";
import { ImageViewer } from "@/components/clients/image-viewer";
import { ServiceEmptyState } from "@/components/service/ServiceEmptyState";
import { ServiceHeader } from "@/components/service/ServiceHeader";
import { ServiceListItem } from "@/components/service/ServiceListItem";
import { CameraCapture } from "@/components/ui/camera-capture";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCompleteJob } from "@/mutations/jobs";
import { useUpdateRouteOrder } from "@/mutations/routes";
import type { CutListItem } from "@/types/types";
import type { SiteMap } from "@/zod/schemas";

interface ServiceListContentProps {
  isAdminPromise: Promise<boolean>;
  clientsPromise: Promise<Client[]>;
  datePromise: Promise<string | null>;
  userIdPromise: Promise<string>;
  membersPromise: Promise<{ id: string; name: string }[]>;
  currentUserIdPromise: Promise<string>;
}

export function ServiceListContent({
  isAdminPromise,
  clientsPromise,
  datePromise,
  userIdPromise,
  membersPromise,
  currentUserIdPromise,
}: ServiceListContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { mutate: updateRouteOrder } = useUpdateRouteOrder();
  const { mutate: completeJob, isPending: isCompleting } = useCompleteJob();

  const [completingAddressId, setCompletingAddressId] = useState<string | null>(
    null,
  );
  const [viewingImage, setViewingImage] = useState<SiteMap | null>(null);

  const currentUserId = use(currentUserIdPromise);
  const isAdmin = use(isAdminPromise);
  let defaultDate = use(datePromise);
  const initialClients = use(clientsPromise);
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

  const [optimisticCuts, setOptimisticCuts] = useOptimistic(
    flatCuts,
    (_, newCuts: CutListItem[]) => newCuts,
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

    const newCuts = Array.from(optimisticCuts);
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
      setOptimisticCuts(newCuts);
      updateRouteOrder({ addressId: moved.address.id, newSortOrder });
    });
  };

  const onPhotoCapture = async (file: File, timestamp: Date) => {
    const currentAddrId = completingAddressId;
    const addr = optimisticCuts.find(
      (c) => c.address.id === currentAddrId,
    )?.address;

    if (!currentAddrId || !addr) return;

    // Close camera immediately for snappier feel
    setCompletingAddressId(null);

    let fileToUpload: File | Blob = file;
    if (fileToUpload.size > 1024 * 1024) {
      try {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 0.9,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      } catch (error) {
        console.error("Compression error:", error);
      }
    }

    startTransition(() => {
      // Optimistically mark as completed
      const newCuts = optimisticCuts.map((item) => {
        if (item.address.id === currentAddrId) {
          return {
            ...item,
            address: {
              ...item.address,
              completed_job: {
                id: "pending",
                address_id: currentAddrId,
                org_id: "",
                service_type: "grass",
                assigned_to:
                  item.address.assignment?.user_id ||
                  item.address.assigned_to ||
                  null,
                completed_by: currentUserId,
                completed_at: timestamp,
                scheduled_date: date,
                notes: null,
                created_at: new Date(),
                updated_at: new Date(),
              },
            },
          } as CutListItem;
        }
        return item;
      });
      setOptimisticCuts(newCuts);

      completeJob({
        addressId: currentAddrId,
        serviceType: "grass",
        assignedTo: addr.assignment?.user_id || addr.assigned_to || null,
        photoFile: fileToUpload as File,
        capturedAt: timestamp,
        completedAt: timestamp,
        scheduledDate: date,
      });
    });
  };

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      const params = new URLSearchParams(searchParams);
      params.set("date", format(newDate, "yyyy-MM-dd"));
      router.push(`/clients-service?${params.toString()}`);
    }
  };

  const handleUserChange = (val: string | null) => {
    if (!val) return;
    const params = new URLSearchParams(searchParams);
    if (val === currentUserId) {
      params.delete("userId");
    } else {
      params.set("userId", val);
    }
    router.push(`/clients-service?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <ServiceHeader
        date={date}
        onDateChange={handleDateChange}
        isAdmin={isAdmin}
        members={members}
        currentFilterUserId={currentFilterUserId}
        currentUserId={currentUserId ?? ""}
        handleUserChange={handleUserChange}
      />

      <div className="max-w-4xl mx-auto">
        {optimisticCuts.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="cut-list-droppable">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {optimisticCuts.map((item, index) => (
                    <ServiceListItem
                      isAdmin={isAdmin}
                      key={item.address.id}
                      item={item}
                      index={index}
                      isCompleting={isCompleting}
                      onMarkComplete={setCompletingAddressId}
                      onViewPhoto={setViewingImage}
                    />
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

      <Dialog
        open={!!completingAddressId}
        onOpenChange={(open) => !open && setCompletingAddressId(null)}
      >
        <DialogContent
          className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 max-w-none w-full h-full p-0 border-none bg-black overflow-hidden flex items-center justify-center rounded-none sm:max-w-none"
          showCloseButton={false}
        >
          {completingAddressId && (
            <CameraCapture
              onCapture={onPhotoCapture}
              onClose={() => setCompletingAddressId(null)}
              isPending={isCompleting}
            />
          )}
        </DialogContent>
      </Dialog>

      <ImageViewer
        isAdmin={isAdmin}
        viewingImage={viewingImage}
        onClose={() => setViewingImage(null)}
      />
    </div>
  );
}
