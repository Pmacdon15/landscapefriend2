import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { completeJobAction } from "@/actions/jobs";

export function useCompleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      addressId,
      serviceType,
      assignedTo,
      notes,
    }: {
      addressId: string;
      serviceType: "grass" | "snow";
      assignedTo?: string | null;
      notes?: string | null;
    }) => {
      const result = await completeJobAction(
        addressId,
        serviceType,
        assignedTo,
        notes,
      );
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Job marked as complete");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark job as complete");
    },
  });
}
