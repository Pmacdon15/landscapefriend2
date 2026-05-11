import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createClientAction,
  deleteClientAction,
  deleteSiteMapAction,
  saveSiteMapAction,
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

export function useDeleteClient() {
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { success, error } = await deleteClientAction(clientId);

      if (!success) {
        throw new Error(error ?? "Failed to delete client");
      }
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Client deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSaveSiteMap() {
  return useMutation({
    mutationFn: async ({
      addressId,
      name,
      mapData,
      file,
    }: {
      addressId: string;
      name: string | null;
      mapData: { x: number; y: number }[] | null;
      file?: File;
    }) => {
      const formData = new FormData();
      formData.append("addressId", addressId);
      if (name) formData.append("name", name);
      if (mapData) formData.append("mapData", JSON.stringify(mapData));
      if (file) formData.append("file", file);

      const { success, siteMap, error } = await saveSiteMapAction(formData);

      if (!success || !siteMap) {
        throw new Error(error ?? "Failed to save site map");
      }
      return siteMap;
    },
    onSuccess: () => {
      toast.success("Site map saved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}


export function useDeleteSiteMap() {
  return useMutation({
    mutationFn: async (siteMapId: string) => {
      const { success, error } = await deleteSiteMapAction(siteMapId);

      if (!success) {
        throw new Error(error ?? "Failed to delete site map");
      }
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Site map deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
