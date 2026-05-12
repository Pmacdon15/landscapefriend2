"use client";
import { format } from "date-fns";
import {
  CalendarDays,
  FileImage,
  Mail,
  MapPin,
  Phone,
  Trash,
  User,
} from "lucide-react";
import Image from "next/image";
import { startTransition, useState } from "react";
import { EditClientModal } from "@/components/clients/edit-client-modal";
import { SiteMapContainer } from "@/components/clients/site-maps/site-map-container";
import { ScheduleForm } from "@/components/schedules/schedule-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Address, Client } from "@/dal/clients";
import { getGoogleMapsUrl } from "@/lib/utils";
import { useDeleteClient, useUpdateAddressAssignee } from "@/mutations/clients";
import type { SiteMap } from "@/zod/schemas";
import type { OptimisticAction } from "./client-info/client-info-container";

interface ClientCardProps {
  client: Client;
  members: { id: string; name: string }[];
  setOptimistic: (action: OptimisticAction) => void;
}

export function ClientCard({
  client,
  members,
  setOptimistic,
}: ClientCardProps) {
  const [openAddressId, setOpenAddressId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [viewingSiteMap, setViewingSiteMap] = useState<SiteMap | null>(null);
  const addresses = client.addresses || [];
  const { mutate: updateAssignee } = useUpdateAddressAssignee();
  const { mutate: deleteClient } = useDeleteClient();

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          <span>{client.name}</span>
          <div className="flex items-center gap-2">
            <EditClientModal
              client={client}
              members={members}
              setOptimistic={setOptimistic}
            />
            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Delete Client</span>
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Client</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete {client.name}? This will
                    permanently remove the client and all associated addresses,
                    schedules, and history. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      startTransition(() => {
                        setOptimistic({
                          type: "delete-client",
                          clientId: client.id,
                        });
                        deleteClient(client.id);
                        setIsDeleteDialogOpen(false);
                      });
                    }}
                  >
                    Delete Client
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 grid gap-4">
        <div className="space-y-2">
          {client.email && (
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>

        {addresses.length > 0 && (
          <div className="mt-2 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Addresses & Schedules
            </h4>
            {addresses.map((address: Address) => (
              <div
                key={address.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={getGoogleMapsUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 hover:text-primary transition-colors group"
                  >
                    <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium leading-tight underline-offset-4 group-hover:underline">
                      {address.street}, {address.city} {address.state}{" "}
                      {address.zip}
                    </span>
                  </a>
                  <div className="flex items-center gap-2">
                    <SiteMapContainer address={address} />
                    {address.completed_job?.photos?.[0] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] gap-1.5 text-slate-500 hover:text-primary"
                        onClick={() => {
                          const photo = address.completed_job?.photos?.[0];
                          if (!photo) return;
                          setViewingSiteMap({
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
                        <FileImage className="h-3 w-3" />
                        Latest Photo
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-6 text-xs text-slate-500">
                  <User className="h-3 w-3" />
                  <Select
                    value={address.assigned_to || "unassigned"}
                    onValueChange={(val) => {
                      const userId = val === "unassigned" ? null : val;
                      startTransition(() => {
                        setOptimistic({
                          type: "update-assignee",
                          addressId: address.id,
                          userId: userId,
                        });
                        updateAssignee({
                          addressId: address.id,
                          userId: userId,
                        });
                      });
                    }}
                  >
                    <SelectTrigger className="h-7 w-fit text-[10px] bg-transparent border-none p-0 focus:ring-0">
                      <SelectValue placeholder="Assignee">
                        {members.find((m) => m.id === address.assigned_to)
                          ?.name ||
                          (address.assigned_to === "unassigned" ||
                          !address.assigned_to
                            ? "Unassigned"
                            : address.assigned_to)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pl-6">
                  <div className="text-xs text-muted-foreground">
                    {address.schedule ? (
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {address.schedule.frequency}
                        </span>
                        <span>
                          Next:{" "}
                          {format(
                            new Date(address.schedule.next_cut_date),
                            "MMM do",
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="italic">No schedule set</span>
                    )}
                  </div>

                  <Popover
                    open={openAddressId === address.id}
                    onOpenChange={(open) =>
                      setOpenAddressId(open ? address.id : null)
                    }
                  >
                    <PopoverTrigger
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "h-7 text-xs",
                      })}
                    >
                      <CalendarDays className="h-3 w-3 mr-1.5" />
                      {address.schedule ? "Edit" : "Schedule"}
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium leading-none">
                            Manage Schedule
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Set the cut frequency for {address.street}
                          </p>
                        </div>
                        <ScheduleForm
                          addressId={address.id}
                          initialFrequency={address.schedule?.frequency}
                          initialDate={
                            address.schedule
                              ? new Date(address.schedule.next_cut_date)
                              : undefined
                          }
                          setOptimistic={setOptimistic}
                          onSuccess={() => setOpenAddressId(null)}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={!!viewingSiteMap}
        onOpenChange={(open) => !open && setViewingSiteMap(null)}
      >
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 border-none bg-black/95 overflow-hidden flex items-center justify-center text-white">
          {viewingSiteMap && (
            <div className="relative w-full h-full flex items-center justify-center p-2 md:p-8">
              {viewingSiteMap.blob_path && (
                <Image
                  src={`/api/site-maps/image/${viewingSiteMap.id}`}
                  alt="Viewing existing sitemap or completion photo"
                  fill
                  unoptimized
                  className="object-contain shadow-2xl rounded-sm transition-all duration-300"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
