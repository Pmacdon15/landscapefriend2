"use client";

import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useUpsertSchedule } from "@/mutations/schedules";

interface ScheduleFormProps {
  addressId: string;
  initialFrequency?: string;
  initialDate?: Date;
  onSuccess?: () => void;
}

export function ScheduleForm({
  addressId,
  initialFrequency,
  initialDate,
  onSuccess,
}: ScheduleFormProps) {
  const { mutateAsync: upsertSchedule, isPending: isSubmitting } =
    useUpsertSchedule();

  const form = useForm({
    defaultValues: {
      frequency: initialFrequency || "weekly",
      startDate: initialDate || new Date(),
    },
    onSubmit: async ({ value }) => {
      try {
        await upsertSchedule({
          addressId,
          frequency: value.frequency,
          nextCutDate: value.startDate,
        });
        if (onSuccess) onSuccess();
      } catch (_error) {
        // Error handled in mutation
      }
    },
  });

  return (
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

      <form.Field name="startDate">
        {(field) => (
          <div className="flex flex-col space-y-2">
            <Label>Start Date</Label>
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
                  format(field.state.value, "PPP")
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
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
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

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Schedule"}
      </Button>
    </form>
  );
}
