import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createClientAction,
  deleteClientAction,
  updateAddressAssigneeAction,
  updateClientAction,
} from "@/actions/clients";
import {
  deleteSiteMapAction,
  saveSiteMapAction,
  updateSiteMapAction,
} from "@/actions/sitemaps";
import type { CreateClientInput } from "@/zod/schemas";

export function useCreateClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateClientInput) => {
      const { success, client, error } = await createClientAction(data);

      if (!success || !client) {
        throw new Error(error ?? "Failed to add client");
      }
      return client;
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["client-search"] });
      queryClient.invalidateQueries({ queryKey: ["client-search-history"] });
      toast.success(`${client.name} created`);
      router.push(`/client-info-list?clientId=${client.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
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
      queryClient.invalidateQueries({ queryKey: ["client-search"] });
      queryClient.invalidateQueries({ queryKey: ["client-search-history"] });
      toast.success(`${client.name} updated`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateAddressAssignee() {
  const queryClient = useQueryClient();
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
      queryClient.invalidateQueries({ queryKey: ["client-search"] });
      queryClient.invalidateQueries({ queryKey: ["client-search-history"] });
      toast.success("Assignee updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { success, error } = await deleteClientAction(clientId);

      if (!success) {
        throw new Error(error ?? "Failed to delete client");
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-search"] });
      queryClient.invalidateQueries({ queryKey: ["client-search-history"] });
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
      notes,
      mapData,
      file,
    }: {
      addressId: string;
      name: string | null;
      notes: string | null;
      mapData: { x: number; y: number }[][] | null;
      file?: File;
    }) => {
      const formData = new FormData();
      formData.append("addressId", addressId);
      if (name) formData.append("name", name);
      if (notes) formData.append("notes", notes);
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

export function useUpdateSiteMap() {
  return useMutation({
    mutationFn: async ({
      siteMapId,
      name,
      notes,
      mapData,
    }: {
      siteMapId: string;
      name: string | null;
      notes: string | null;
      mapData: { x: number; y: number }[][] | null;
    }) => {
      const formData = new FormData();
      formData.append("siteMapId", siteMapId);
      if (name) formData.append("name", name);
      if (notes) formData.append("notes", notes);
      if (mapData) formData.append("mapData", JSON.stringify(mapData));

      const { success, siteMap, error } = await updateSiteMapAction(formData);

      if (!success || !siteMap) {
        throw new Error(error ?? "Failed to update site map");
      }
      return siteMap;
    },
    onSuccess: () => {
      toast.success("Site map updated");
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
