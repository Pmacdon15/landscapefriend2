import type { Client, OptimisticAction } from "@/types/types";

export type ClientOptimisticState = {
  clients: Client[];
  searchValue: string;
};

export const clientInfoReducer = (
  state: ClientOptimisticState,
  action: OptimisticAction,
): ClientOptimisticState => {
  switch (action.type) {
    case "search-submitted":
      return {
        ...state,
        searchValue: action.query,
        clients: action.clients,
      };

    case "select-client":
      return {
        clients: [action.client],
        searchValue: action.client.name,
      };

    case "add-client":
      return {
        clients: [action.client],
        searchValue: action.client.name,
      };

    case "edit-client":
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.id === action.client.id ? action.client : c,
        ),
      };

    case "delete-client": {
      const remainingClients = state.clients.filter(
        (c) => c.id !== action.clientId,
      );

      if (remainingClients.length === 0 && action.defaultClients) {
        return {
          ...state,
          clients: action.defaultClients,
          searchValue: "",
        };
      }

      return {
        ...state,
        clients: remainingClients,
        searchValue: remainingClients.length === 0 ? "" : state.searchValue,
      };
    }

    case "update-assignee":
      return {
        ...state,
        clients: state.clients.map((client) => ({
          ...client,
          addresses: client.addresses?.map((address) => {
            if (address.id !== action.addressId) return address;
            return {
              ...address,
              assigned_to:
                action.userIds && action.userIds.length > 0
                  ? action.userIds[0]
                  : null,
              assigned_member_ids: action.userIds || [],
              assignment:
                action.userIds && action.userIds.length > 0
                  ? {
                      id: "optimistic",
                      address_id: action.addressId,
                      user_ids: action.userIds,
                      org_id: client.org_id,
                      scheduled_date: new Date().toISOString(),
                    }
                  : null,
            };
          }),
        })),
      };

    case "update-schedule":
      return {
        ...state,
        clients: state.clients.map((client) => ({
          ...client,
          addresses: client.addresses?.map((address) => {
            if (address.id !== action.addressId) return address;
            return {
              ...address,
              schedule: {
                id: address.schedule?.id || "optimistic",
                address_id: action.addressId,
                frequency: action.frequency,
                // Convert the string to Date here
                first_cut_date: new Date(action.firstCutDate),
                day_of_week: address.schedule?.day_of_week ?? null,
                notes: action.notes || null,
              },
            };
          }),
        })),
      };

    case "delete-schedule":
      return {
        ...state,
        clients: state.clients.map((client) => ({
          ...client,
          addresses: client.addresses?.map((address) => {
            if (address.id !== action.addressId) return address;
            return { ...address, schedule: null };
          }),
        })),
      };

    case "add-one-time-service":
      return {
        ...state,
        clients: state.clients.map((client) => ({
          ...client,
          addresses: client.addresses?.map((address) => {
            if (address.id !== action.addressId) return address;
            const currentList = address.one_time_services || [];
            return {
              ...address,
              one_time_services: [...currentList, action.service],
            };
          }),
        })),
      };

    case "delete-one-time-service":
      return {
        ...state,
        clients: state.clients.map((client) => ({
          ...client,
          addresses: client.addresses?.map((address) => {
            if (address.id !== action.addressId) return address;
            const currentList = address.one_time_services || [];
            return {
              ...address,
              one_time_services: currentList.filter(
                (s) => s.id !== action.serviceId,
              ),
            };
          }),
        })),
      };

    default:
      return state;
  }
};
