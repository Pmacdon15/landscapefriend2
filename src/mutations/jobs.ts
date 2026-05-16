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
      photoFile,
      capturedAt,
      completedAt,
      scheduledDate,
    }: {
      addressId: string;
      serviceType: "grass" | "snow";
      assignedTo?: string | null;
      notes?: string | null;
      photoFile?: File;
      capturedAt?: Date | null;
      completedAt?: Date | null;
      scheduledDate?: Date | null;
    }) => {
      const formData = new FormData();
      formData.append("addressId", addressId);
      formData.append("serviceType", serviceType);
      if (assignedTo) formData.append("assignedTo", assignedTo);
      if (notes) formData.append("notes", notes);
      if (photoFile) formData.append("photoFile", photoFile);
      if (capturedAt) formData.append("capturedAt", capturedAt.toISOString());
      if (completedAt)
        formData.append("completedAt", completedAt.toISOString());
      if (scheduledDate)
        formData.append("scheduledDate", scheduledDate.toISOString());

      const { success, job, error } = await completeJobAction(formData);

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
