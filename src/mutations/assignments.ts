import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { upsertAssignmentAction } from "@/actions/assignments";

export function useUpsertAssignment() {
  const queryClient = useQueryClient();

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
      const result = await upsertAssignmentAction(addressId, userId, date);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Assignment updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update assignment");
    },
  });
}
