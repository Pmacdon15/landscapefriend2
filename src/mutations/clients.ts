import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createClientAction,
  updateAddressAssigneeAction,
  updateClientAction,
} from "@/actions/clients";
import type { CreateClientInput } from "@/zod/schemas";

export function useCreateClient() {
  return useMutation({
    mutationFn: async (data: CreateClientInput) => {
      const { success, client, error } = await createClientAction(data);

      if (!success || !client) {
        throw new Error(error ?? "Failed to add client");
      }
      return client;
    },
    onSuccess: (client) => {
      toast.success(`${client.name} created`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateClient() {
  return useMutation({
    mutationFn: async ({
      clientId,
      data,
    }: {
      clientId: string;
      data: CreateClientInput;
    }) => {
      const { success, client, error } = await updateClientAction(
        clientId,
        data,
      );

      if (!success || !client) {
        throw new Error(error ?? "Failed to update client");
      }
      return client;
    },
    onSuccess: (client) => {
      toast.success(`${client.name} updated`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      const { success, error } = await updateAddressAssigneeAction(
        addressId,
        userId,
      );

      if (!success) {
        throw new Error(error ?? "Failed to update assignee");
      }
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Assignee updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
