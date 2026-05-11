import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { upsertScheduleAction } from "@/actions/schedules";

export function useUpsertSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      addressId,
      frequency,
      nextCutDate,
    }: {
      addressId: string;
      frequency: string;
      nextCutDate: Date;
    }) => {
      const result = await upsertScheduleAction(
        addressId,
        frequency,
        nextCutDate,
      );
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Schedule updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update schedule");
    },
  });
}
