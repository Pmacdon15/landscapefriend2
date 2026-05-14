import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { upsertScheduleAction } from "@/actions/schedules";

export function useUpsertSchedule() {
  return useMutation({
    mutationFn: async ({
      addressId,
      frequency,
      firstCutDate,
    }: {
      addressId: string;
      frequency: string;
      firstCutDate: Date;
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
