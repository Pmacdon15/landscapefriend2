"use client";

import { isValid } from "date-fns";
import { CalendarDays, FileImage, MapPin, User } from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { SiteMapContainer } from "@/components/clients/site-maps/site-map-container";
import { OneTimeForm } from "@/components/schedules/one-time-form";
import { ScheduleForm } from "@/components/schedules/schedule-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  clientStatus?: string;
}

export function AddressItem({
  address,
  members,
  setOptimistic,
  onViewPhoto,
  isAdmin,
  clientStatus,
}: AddressItemProps) {
  const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false);
  const [isOneTimePopoverOpen, setIsOneTimePopoverOpen] = useState(false);
  const { mutate: updateAssignee } = useUpdateAddressAssignee();

  const incompleteOneTimeServices =
    address.one_time_services?.filter((ots) => !ots.completed_job_id) || [];

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
        <Popover>
          <PopoverTrigger
            disabled={clientStatus === "disabled"}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className:
                "h-7 w-fit text-[10px] bg-transparent border-none p-0 focus:ring-0 hover:bg-transparent",
            })}
          >
            {(() => {
              const assignedIds =
                address.assigned_member_ids ||
                (address.assigned_to ? [address.assigned_to] : []);
              if (assignedIds.length === 0) return "Unassigned";
              if (assignedIds.length === 1) {
                return (
                  members.find((m) => m.id === assignedIds[0])?.name ||
                  "Unassigned"
                );
              }
              return `${assignedIds.length} members`;
            })()}
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-2">
              <h4 className="text-xs font-medium px-1">Assign Members</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {members.map((member) => {
                  const currentValues =
                    address.assigned_member_ids ||
                    (address.assigned_to ? [address.assigned_to] : []);
                  const isChecked = currentValues.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 text-xs p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let nextValues: string[];
                          if (e.target.checked) {
                            nextValues = [...currentValues, member.id];
                          } else {
                            nextValues = currentValues.filter(
                              (id) => id !== member.id,
                            );
                          }

                          startTransition(() => {
                            setOptimistic({
                              type: "update-assignee",
                              addressId: address.id,
                              userIds:
                                nextValues.length > 0 ? nextValues : null,
                            });
                            updateAssignee({
                              addressId: address.id,
                              userIds:
                                nextValues.length > 0 ? nextValues : null,
                            });
                          });
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span>{member.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
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

        <div className="flex gap-2">
          {/* Recurring Schedule Popover */}
          <Popover
            open={isSchedulePopoverOpen}
            onOpenChange={(isOpen) => {
              if (isOpen && clientStatus === "disabled") {
                toast.error(
                  "This client is disabled due to plan limits. Please upgrade your plan to manage schedules.",
                );
                return;
              }
              setIsSchedulePopoverOpen(isOpen);
            }}
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
                  initialDate={toLocalMidnight(
                    address.schedule?.first_cut_date,
                  )}
                  initialNotes={address.schedule?.notes}
                  setOptimistic={setOptimistic}
                  onSuccess={() => setIsSchedulePopoverOpen(false)}
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* One-Off Services Popover */}
          <Popover
            open={isOneTimePopoverOpen}
            onOpenChange={(isOpen) => {
              if (isOpen && clientStatus === "disabled") {
                toast.error(
                  "This client is disabled due to plan limits. Please upgrade your plan to manage schedules.",
                );
                return;
              }
              setIsOneTimePopoverOpen(isOpen);
            }}
          >
            <PopoverTrigger
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className:
                  "h-7 text-xs border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20",
              })}
            >
              <CalendarDays className="h-3 w-3 mr-1.5" />
              One-Offs{" "}
              {incompleteOneTimeServices.length > 0 &&
                `(${incompleteOneTimeServices.length})`}
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium leading-none">
                    One-Time Services
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Schedule custom one-off services for this property.
                  </p>
                </div>
                <OneTimeForm
                  addressId={address.id}
                  members={members}
                  oneTimeServices={incompleteOneTimeServices}
                  setOptimistic={setOptimistic}
                  onSuccess={() => setIsOneTimePopoverOpen(false)}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
