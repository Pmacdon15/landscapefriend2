import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createClientAction,
  updateAddressAssigneeAction,
  updateClientAction,
} from "@/actions/clients";
import type { Client } from "@/dal/clients";

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email?: string | null;
      phone?: string | null;
      addresses: {
        street: string;
        city: string;
        state?: string | null;
        zip?: string | null;
        status: "active" | "disabled" | "deleted";
        assigned_to?: string | null;
      }[];
    }) => {
      const result = await createClientAction(data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.client as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client added successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add client");
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      data,
    }: {
      clientId: string;
      data: {
        name: string;
        email?: string | null;
        phone?: string | null;
        addresses: {
          id?: string;
          street: string;
          city: string;
          state?: string | null;
          zip?: string | null;
          status: "active" | "disabled" | "deleted";
          assigned_to?: string | null;
        }[];
      };
    }) => {
      const result = await updateClientAction(clientId, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.client as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update client");
    },
  });
}

export function useUpdateAddressAssignee() {
  return useMutation({
    mutationFn: async ({
      addressId,
      userId,
    }: {
      addressId: string;
      userId: string | null;
    }) => {
      const result = await updateAddressAssigneeAction(addressId, userId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Assignee updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update assignee");
    },
  });
}
