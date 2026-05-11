import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { completeJobAction } from "@/actions/jobs";

export function useCompleteJob() {
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
      const { success, job, error } = await completeJobAction(
        addressId,
        serviceType,
        assignedTo,
        notes,
      );

      if (!success || !job) {
        throw new Error(error ?? "Failed to complete job");
      }
      return job;
    },
    onSuccess: () => {
      toast.success("Job completed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
