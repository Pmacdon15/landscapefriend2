import { useMutation } from "@tanstack/react-query";
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
      const result = await updateRouteOrderAction(addressId, newSortOrder);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
  });
}
