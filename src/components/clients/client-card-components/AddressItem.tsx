"use client";

import { isValid } from "date-fns";
import { CalendarDays, FileImage, MapPin, User } from "lucide-react";
import { startTransition, useState } from "react";
import { SiteMapContainer } from "@/components/clients/site-maps/site-map-container";
import { ScheduleForm } from "@/components/schedules/schedule-form";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  formatDateNaive,
  getGoogleMapsUrl,
  getNextCutDate,
  toLocalMidnight,
} from "@/lib/utils";
import { useUpdateAddressAssignee } from "@/mutations/clients";
import type { Address, OptimisticAction } from "@/types/types";
import type { SiteMap } from "@/zod/schemas";

interface AddressItemProps {
  address: Address;
  members: { id: string; name: string }[];
  setOptimistic: (action: OptimisticAction) => void;
  onViewPhoto: (siteMap: SiteMap) => void;
  isAdmin: boolean;
}

export function AddressItem({
  address,
  members,
  setOptimistic,
  onViewPhoto,
  isAdmin,
}: AddressItemProps) {
  const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false);
  const { mutate: updateAssignee } = useUpdateAddressAssignee();

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <a
          href={getGoogleMapsUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 hover:text-primary transition-colors group"
        >
          <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium leading-tight underline-offset-4 group-hover:underline">
            {address.street}, {address.city} {address.state} {address.zip}
          </span>
        </a>
        <div className="flex items-center gap-2">
          <SiteMapContainer address={address} isAdmin={isAdmin} />
          {address.completed_job?.photos?.[0] && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] gap-1.5 text-slate-500 hover:text-primary"
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
              {members.find((m) => m.id === address.assigned_to)?.name ||
                (address.assigned_to === "unassigned" || !address.assigned_to
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
            <span className="flex flex-col gap-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize text-[10px] tracking-wider">
                {address.schedule.frequency} SERVICE
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="opacity-60 w-10">Next:</span>
                  <span className="font-bold">
                    {(() => {
                      const nextDate = getNextCutDate(
                        address.schedule.first_cut_date,
                        address.schedule.frequency,
                      );
                      return isValid(nextDate)
                        ? formatDateNaive(nextDate, "MMM do, yyyy")
                        : "Not set";
                    })()}
                  </span>
                </div>
              </div>
            </span>
          ) : (
            <span className="italic">No schedule set</span>
          )}
        </div>

        <Popover
          open={isSchedulePopoverOpen}
          onOpenChange={setIsSchedulePopoverOpen}
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
                <h4 className="font-medium leading-none">Manage Schedule</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Set the cut frequency for {address.street}
                </p>
              </div>
              <ScheduleForm
                addressId={address.id}
                initialFrequency={address.schedule?.frequency}
                initialDate={toLocalMidnight(address.schedule?.first_cut_date)}
                initialNotes={address.schedule?.notes}
                setOptimistic={setOptimistic}
                onSuccess={() => setIsSchedulePopoverOpen(false)}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
