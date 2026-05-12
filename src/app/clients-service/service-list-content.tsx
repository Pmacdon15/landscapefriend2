"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import imageCompression from "browser-image-compression";
import { format, parseISO } from "date-fns";
import { CalendarIcon, CheckCircle2, GripVertical, MapPin } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, use, useOptimistic, useState } from "react";
import { SiteMapContainer } from "@/components/clients/site-maps/site-map-container";
import { SiteMapEditor } from "@/components/clients/site-maps/site-map-editor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CameraCapture } from "@/components/ui/camera-capture";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CutListItem } from "@/dal/clients";
import { cn, getGoogleMapsUrl } from "@/lib/utils";
import { useCompleteJob } from "@/mutations/jobs";
import { useUpdateRouteOrder } from "@/mutations/routes";
import type { SiteMap } from "@/zod/schemas";

interface ServiceListContentProps {
  clientsPromise: Promise<CutListItem[]>;
  datePromise: Promise<string>;
}
export function ServiceListContent({
  clientsPromise,
  datePromise,
}: ServiceListContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: updateRouteOrder } = useUpdateRouteOrder();
  const { mutate: completeJob, isPending: isCompleting } = useCompleteJob();

  const [completingAddressId, setCompletingAddressId] = useState<string | null>(
    null,
  );
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [viewingSiteMap, setViewingSiteMap] = useState<SiteMap | null>(null);

  const defaultDate = use(datePromise);
  const initialClients = use(clientsPromise); // This is already your sorted CutListItem[]

  const [date, setDate] = useState<Date>(parseISO(defaultDate));

  const [optimisticCuts, setOptimisticCuts] = useOptimistic(
    initialClients,
    (_, newCuts: CutListItem[]) => newCuts,
  );

  // Sync date state when the server sends new data
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

    // LexoRank Float Logic
    let newSortOrder = 0;
    if (destIndex === 0) {
      newSortOrder = (newCuts[1]?.address.sort_order ?? 1000) - 1000;
    } else if (destIndex === newCuts.length - 1) {
      newSortOrder =
        (newCuts[newCuts.length - 2]?.address.sort_order ?? 0) + 1000;
    } else {
      const prev = newCuts[destIndex - 1].address.sort_order;
      const next = newCuts[destIndex + 1].address.sort_order;
      newSortOrder = (prev + next) / 2;
    }

    moved.address.sort_order = newSortOrder;

    startTransition(() => {
      setOptimisticCuts(newCuts);
      updateRouteOrder({ addressId: moved.address.id, newSortOrder });
    });
  };

  const handleMarkComplete = (addressId: string) => {
    setCompletingAddressId(addressId);
  };

  const onPhotoCapture = (file: File, timestamp: Date) => {
    setCapturedPhoto(file);
    setCapturedAt(timestamp);
  };

  const handleFinishCompletion = async (
    address: CutListItem["address"] | undefined,
  ) => {
    if (!completingAddressId || !address) return;

    let fileToUpload = capturedPhoto || undefined;

    if (fileToUpload && fileToUpload.size > 1024 * 1024) {
      try {
        const options = {
          maxSizeMB: 0.9,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        fileToUpload = await imageCompression(fileToUpload, options);
      } catch (error) {
        console.error("Compression error:", error);
      }
    }

    completeJob(
      {
        addressId: completingAddressId,
        serviceType: "grass",
        assignedTo: address.assignment?.user_id || address.assigned_to || null,
        photoFile: fileToUpload,
        capturedAt: capturedAt,
        completedAt: date, // Use the date of the service list
      },
      {
        onSuccess: () => {
          setCompletingAddressId(null);
          setCapturedPhoto(null);
          setCapturedAt(null);
        },
      },
    );
  };

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      const params = new URLSearchParams(searchParams);
      params.set("date", format(newDate, "yyyy-MM-dd"));
      router.push(`/clients-service?${params.toString()}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 gap-4">
        <h2 className="text-xl font-semibold">
          Showing services for:{" "}
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
        {optimisticCuts.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="cut-list-droppable">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {optimisticCuts.map(({ client, address }, index) => (
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
                                        {address.city}, {address.state}{" "}
                                        {address.zip}
                                      </span>
                                    </a>
                                    <div className="mt-2">
                                      <SiteMapContainer address={address} />
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
                                        onClick={() =>
                                          setViewingSiteMap({
                                            id: address.completed_job
                                              ?.photos?.[0].id,
                                            address_id: address.id,
                                            blob_path:
                                              address.completed_job?.photos?.[0]
                                                .blob_path,
                                            name: "Completion Photo",
                                            created_at:
                                              address.completed_job?.photos?.[0]
                                                .created_at,
                                          })
                                        }
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
                                    onClick={() =>
                                      handleMarkComplete(address.id)
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

      {completingAddressId && !capturedPhoto && (
        <CameraCapture
          onCapture={onPhotoCapture}
          onClose={() => setCompletingAddressId(null)}
        />
      )}

      {completingAddressId && capturedPhoto && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-lg w-full space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-center">
              Confirm Completion
            </h3>
            <div className="aspect-square w-full relative rounded-lg overflow-hidden border">
              <Image
                src={URL.createObjectURL(capturedPhoto)}
                alt="confirmation preview"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCapturedPhoto(null)}
                disabled={isCompleting}
              >
                Retake
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const addr = optimisticCuts.find(
                    (c) => c.address.id === completingAddressId,
                  )?.address;
                  handleFinishCompletion(addr);
                }}
                disabled={isCompleting}
              >
                {isCompleting ? "Saving..." : "Confirm & Finish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={!!viewingSiteMap}
        onOpenChange={(open) => !open && setViewingSiteMap(null)}
      >
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 border-none bg-black/95 overflow-hidden flex items-center justify-center text-white">
          {viewingSiteMap && (
            <div className="relative w-full h-full flex items-center justify-center p-2 md:p-8">
              {viewingSiteMap.blob_path ? (
                <Image
                  src={`/api/site-maps/image/${viewingSiteMap.id}`}
                  alt="Viewing existing sitemap or completion photo"
                  fill
                  unoptimized
                  className="object-contain shadow-2xl rounded-sm transition-all duration-300"
                />
              ) : viewingSiteMap.map_data ? (
                <div className="w-full max-w-5xl aspect-[12/8] bg-white rounded-lg overflow-hidden shadow-2xl">
                  <SiteMapEditor
                    address={"Site Area"}
                    readOnlyPoints={viewingSiteMap.map_data}
                  />
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
