import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteScheduleAction,
  upsertScheduleAction,
} from "@/actions/schedules";

export function useUpsertSchedule() {
  return useMutation({
    mutationFn: async ({
      addressId,
      frequency,
      firstCutDate,
    }: {
      addressId: string;
      frequency: string;
      firstCutDate: string;
    }) => {
      const { success, schedule, error } = await upsertScheduleAction(
        addressId,
        frequency,
        firstCutDate,
      );

      if (!success || !schedule) {
        throw new Error(error ?? "Failed to update schedule");
      }
      return schedule;
    },
    onSuccess: () => {
      toast.success("Schedule updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSchedule() {
  return useMutation({
    mutationFn: async (addressId: string) => {
      const { success, schedule, error } =
        await deleteScheduleAction(addressId);

      if (!success || !schedule) {
        throw new Error(error ?? "Failed to delete schedule");
      }
      return schedule;
    },
    onSuccess: () => {
      toast.success("Schedule removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
