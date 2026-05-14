import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateRouteOrderAction } from "@/actions/routes";

export function useUpdateRouteOrder() {
  return useMutation({
    mutationFn: async ({
      addressId,
      newSortOrder,
    }: {
      addressId: string;
      newSortOrder: number;
    }) => {
      const { success, error } = await updateRouteOrderAction(
        addressId,
        newSortOrder,
      );

      if (!success) {
        throw new Error(error ?? "Failed to update route order");
      }
      toast.success("Success updating route order.")
      return { success: true };

    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
