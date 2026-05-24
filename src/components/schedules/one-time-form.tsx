"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { format } from "date-fns";
import { CalendarIcon, Trash2, User, Wrench, Sprout, Snowflake } from "lucide-react";
import { startTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
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
import { cn, formatDateNaive } from "@/lib/utils";
import { useInsertOneTimeService, useDeleteOneTimeService } from "@/mutations/one-time";
import type { OptimisticAction, OneTimeService } from "@/types/types";

interface OneTimeFormProps {
  addressId: string;
  members?: { id: string; name: string }[];
  oneTimeServices?: OneTimeService[] | null;
  setOptimistic?: (action: OptimisticAction) => void;
  onSuccess?: () => void;
}

export function OneTimeForm({
  addressId,
  members = [],
  oneTimeServices = [],
  setOptimistic,
  onSuccess,
}: OneTimeFormProps) {
  const { mutateAsync: insertService, isPending: isSubmitting } =
    useInsertOneTimeService();
  const { mutateAsync: deleteService, isPending: isDeleting } =
    useDeleteOneTimeService();

  const form = useForm({
    defaultValues: {
      serviceType: "other",
      serviceDate: new Date(),
      notes: "",
      assignedMemberIds: [] as string[],
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const dateStr = format(value.serviceDate, "yyyy-MM-dd");

        // Map serviceType to display name for the database name column
        const typeNames: Record<string, string> = {
          grass: "Grass / Lawn Care",
          snow: "Snow Removal",
          "spring-fall-cleanup": "Spring / Fall Clean Up",
          trimming: "Trimming",
          other: "Other / General",
        };
        const nameVal = typeNames[value.serviceType] || "General Service";

        const optimisticService: OneTimeService = {
          id: "optimistic-" + Math.random().toString(),
          address_id: addressId,
          org_id: "",
          name: nameVal,
          service_type: value.serviceType,
          service_date: dateStr,
          notes: value.notes || null,
          assigned_member_ids: value.assignedMemberIds,
          completed_job_id: null,
        };

        if (setOptimistic) {
          setOptimistic({
            type: "add-one-time-service",
            addressId,
            service: optimisticService,
          });
        }

        try {
          await insertService({
            addressId,
            name: nameVal,
            serviceType: value.serviceType,
            serviceDate: dateStr,
            notes: value.notes,
            assignedMemberIds: value.assignedMemberIds,
          });
          form.reset();
        } catch (err) {
          console.error(err);
        }
      });
      onSuccess?.();
    },
  });

  const handleDelete = async (serviceId: string) => {
    startTransition(async () => {
      if (setOptimistic) {
        setOptimistic({
          type: "delete-one-time-service",
          addressId,
          serviceId,
        });
      }
      try {
        await deleteService(serviceId);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const activeServices = oneTimeServices || [];

  return (
    <div className="space-y-6">
      {/* List Existing Scheduled One-Offs */}
      {activeServices.length > 0 && (
        <div className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Scheduled One-Off Services ({activeServices.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeServices.map((service) => (
              <div
                key={service.id}
                className="flex items-start justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {service.name}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-semibold border capitalize",
                      service.service_type === "grass" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                      service.service_type === "snow" && "bg-blue-50 text-blue-700 border-blue-100",
                      service.service_type === "spring-fall-cleanup" && "bg-amber-50 text-amber-700 border-amber-100",
                      service.service_type === "trimming" && "bg-violet-50 text-violet-700 border-violet-100",
                      service.service_type === "other" && "bg-slate-50 text-slate-700 border-slate-100",
                    )}>
                      {service.service_type === "grass" && <Sprout className="h-2.5 w-2.5" />}
                      {service.service_type === "snow" && <Snowflake className="h-2.5 w-2.5" />}
                      {service.service_type === "spring-fall-cleanup" && <Sprout className="h-2.5 w-2.5" />}
                      {service.service_type === "trimming" && <Wrench className="h-2.5 w-2.5" />}
                      {service.service_type === "other" && <Wrench className="h-2.5 w-2.5" />}
                      {service.service_type === "spring-fall-cleanup" ? "spring/fall clean up" : service.service_type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {format(new Date(service.service_date + "T00:00:00"), "PPP")}
                  </div>
                  {service.notes && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 italic break-words">
                      &quot;{service.notes}&quot;
                    </p>
                  )}
                  {service.assigned_member_ids && service.assigned_member_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <User className="h-2.5 w-2.5 text-slate-400" />
                      {service.assigned_member_ids.map((id) => (
                        <span
                          key={id}
                          className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-medium"
                        >
                          {members.find((m) => m.id === id)?.name || "Crew"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleDelete(service.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New One-Off Form */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Schedule New One-Off
        </h4>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >


          <form.Field name="serviceType">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="one-off-type" className="text-xs">Service Type</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val as string)}
                >
                  <SelectTrigger id="one-off-type" onBlur={field.handleBlur} className="h-9 text-xs">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grass">Grass / Lawn Care</SelectItem>
                    <SelectItem value="snow">Snow Removal</SelectItem>
                    <SelectItem value="spring-fall-cleanup">Spring / Fall Clean Up</SelectItem>
                    <SelectItem value="trimming">Trimming</SelectItem>
                    <SelectItem value="other">Other / General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Field name="serviceDate">
            {(field) => (
              <div className="flex flex-col space-y-1">
                <Label className="text-xs">Service Date</Label>
                <Popover>
                  <PopoverTrigger
                    className={buttonVariants({
                      variant: "outline",
                      className: cn(
                        "w-full pl-3 text-left font-normal h-9 text-xs",
                        !field.state.value && "text-muted-foreground",
                      ),
                    })}
                    onBlur={field.handleBlur}
                  >
                    {field.state.value ? (
                      formatDateNaive(field.state.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.state.value}
                      onSelect={(date) => field.handleChange(date || new Date())}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </form.Field>

          <form.Field name="assignedMemberIds">
            {(field) => (
              <div className="space-y-1">
                <Label className="text-xs">Assign Crew Members</Label>
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50 dark:bg-slate-900/50">
                  {members.map((member) => {
                    const isChecked = field.state.value?.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentValues = field.state.value || [];
                            if (e.target.checked) {
                              field.handleChange([...currentValues, member.id]);
                            } else {
                              field.handleChange(
                                currentValues.filter((id) => id !== member.id),
                              );
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>{member.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="one-off-notes" className="text-xs">Service Notes</Label>
                <textarea
                  id="one-off-notes"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Gate codes, warnings, special tasks..."
                  className="flex min-h-[50px] w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}
          </form.Field>

          <Button
            type="submit"
            className="w-full text-xs h-9"
            disabled={isSubmitting || isDeleting}
          >
            {isSubmitting ? "Scheduling..." : "Schedule One-Off"}
          </Button>
        </form>
      </div>
    </div>
  );
}
