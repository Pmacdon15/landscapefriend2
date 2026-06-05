"use client";

import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { CalendarIcon, Trash2 } from "lucide-react";
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
import { useDeleteSchedule, useUpsertSchedule } from "@/mutations/schedules";
import type { OptimisticAction } from "@/types/types";

interface ScheduleFormProps {
  addressId: string;
  initialFrequency?: string;
  initialDate?: Date;
  initialNotes?: string | null;
  setOptimistic?: (action: OptimisticAction) => void;
  onSuccess?: () => void;
}

export function ScheduleForm({
  addressId,
  initialFrequency,
  initialDate,
  initialNotes,
  setOptimistic,
  onSuccess,
}: ScheduleFormProps) {
  const { mutateAsync: upsertSchedule, isPending: isSubmitting } =
    useUpsertSchedule();
  const { mutateAsync: deleteSchedule, isPending: isDeleting } =
    useDeleteSchedule();

  const form = useForm({
    defaultValues: {
      frequency: initialFrequency || "weekly",
      firstCutDate: initialDate || new Date(),
      notes: initialNotes || "",
    },
    onSubmit: async ({ value }) => {
      if (setOptimistic) {
        startTransition(() => {
          const dateStr = format(value.firstCutDate, "yyyy-MM-dd");
          const utcMidnight = new Date(`${dateStr}T00:00:00Z`);

          setOptimistic({
            type: "update-schedule",
            addressId,
            frequency: value.frequency,
            firstCutDate: utcMidnight,
            notes: value.notes,
          });

          upsertSchedule({
            addressId,
            frequency: value.frequency,
            firstCutDate: dateStr,
            notes: value.notes,
          });
        });
      }
      onSuccess?.();
    },
  });

  const handleDelete = async () => {
    if (setOptimistic) {
      startTransition(() => {
        setOptimistic({
          type: "delete-schedule",
          addressId,
        });

        deleteSchedule(addressId);
      });
    }
    onSuccess?.();
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <form.Field name="frequency">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor="frequency-select">Frequency</Label>
              <Select
                value={field.state.value}
                onValueChange={(val) => field.handleChange(val as string)}
              >
                <SelectTrigger id="frequency-select" onBlur={field.handleBlur}>
                  <SelectValue placeholder="Select a cut frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (Snow/As Needed)</SelectItem>
                  <SelectItem value="weekly">Every Week</SelectItem>
                  <SelectItem value="bi-weekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="monthly">Every Month</SelectItem>
                </SelectContent>
              </Select>
              {field.state.meta.isTouched && field.state.meta.errors.length ? (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {field.state.meta.errors.join(", ")}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="firstCutDate">
          {(field) => (
            <div className="flex flex-col space-y-2">
              <Label>First Cut Date</Label>
              <Popover>
                <PopoverTrigger
                  className={buttonVariants({
                    variant: "outline",
                    className: cn(
                      "w-full pl-3 text-left font-normal",
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
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.state.value}
                    onSelect={(date) => field.handleChange(date || new Date())}
                  />
                </PopoverContent>
              </Popover>
              {field.state.meta.isTouched && field.state.meta.errors.length ? (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {field.state.meta.errors.join(", ")}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor="schedule-notes">Service Notes</Label>
              <textarea
                id="schedule-notes"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Gate codes, pet warnings, special instructions..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          )}
        </form.Field>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || isDeleting}
        >
          {isSubmitting ? "Saving..." : "Save Schedule"}
        </Button>
      </form>

      {initialFrequency && (
        <div className="pt-4 border-t">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={isSubmitting || isDeleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Turn Off Schedule
          </Button>
        </div>
      )}
    </div>
  );
}
