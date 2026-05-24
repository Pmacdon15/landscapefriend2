import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteOneTimeServiceAction,
  insertOneTimeServiceAction,
} from "@/actions/one-time";

export function useInsertOneTimeService() {
  return useMutation({
    mutationFn: async ({
      addressId,
      name,
      serviceType,
      serviceDate,
      notes,
      assignedMemberIds,
    }: {
      addressId: string;
      name: string;
      serviceType: string;
      serviceDate: string;
      notes?: string | null;
      assignedMemberIds?: string[] | null;
    }) => {
      const { success, service, error } = await insertOneTimeServiceAction(
        addressId,
        name,
        serviceType,
        serviceDate,
        notes,
        assignedMemberIds,
      );

      if (!success || !service) {
        throw new Error(error ?? "Failed to schedule one-time service");
      }
      return service;
    },
    onSuccess: () => {
      toast.success("One-time service scheduled");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteOneTimeService() {
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { success, service, error } =
        await deleteOneTimeServiceAction(serviceId);

      if (!success || !service) {
        throw new Error(error ?? "Failed to cancel service");
      }
      return service;
    },
    onSuccess: () => {
      toast.success("One-time service cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
