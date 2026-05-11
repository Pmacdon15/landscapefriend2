import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { upsertAssignmentAction } from "@/actions/assignments";

export function useUpsertAssignment() {
  return useMutation({
    mutationFn: async ({
      addressId,
      userId,
      date,
    }: {
      addressId: string;
      userId: string | null;
      date: string;
    }) => {
      const { success, assignment, error } = await upsertAssignmentAction(
        addressId,
        userId,
        date,
      );

      if (!success) {
        throw new Error(error ?? "Failed to save assignment");
      }
      return assignment;
    },
    onSuccess: () => {
      toast.success("Assignment saved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
